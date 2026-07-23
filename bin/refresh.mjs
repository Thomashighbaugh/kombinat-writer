#!/usr/bin/env node
/**
 * kombinat-refresh — idempotent plugin sync for kombinat-writer
 *
 * Compares the current kombinat-writer source tree against what was last
 * installed (recorded in .opencode/.kombinat-install-manifest.json) and
 * copies any changed/new files into the consumer project's .opencode/
 * directory, while:
 *
 *   - preserving files the user has locally modified (HTML-comment override
 *     workflow — your overrides survive refreshes)
 *   - never touching project-owned subtrees (book/, memory/, output/,
 *     .opencode/state/, etc.)
 *   - always rebuilding the TS-derived sidebar bundle
 *   - always rebuilding the lore index (incremental — only re-embeds chunks
 *     whose source files have changed)
 *
 * Usage:
 *   npx kombinat-refresh                    # interactive + default track='fiction'
 *   npx kombinat-refresh --track non-fiction
 *   npx kombinat-refresh --prune            # also remove files that vanished from source
 *   npx kombinat-refresh --force            # skip the locally-modified check (destructive)
 *   npx kombinat-refresh --postinstall      # skip prompts (used by npm postinstall)
 *   npx kombinat-refresh --skip-build       # skip the sidebar build (for debugging)
 *   npx kombinat-refresh --skip-index       # skip the lore index rebuild
 *
 * Exit codes:
 *   0  — success, no locally-modified files were detected
 *   1  — success, but locally-modified files were preserved (drift detected)
 *   2  — refresh failed
 */

import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import path from 'node:path'

import {
    copySkills,
    copyToolsAndLib,
    copySlashCommands,
    copyTemplates,
    copySidebarPlugin,
    ensureProjectConfig,
    PACKAGE_ROOT,
} from './lib/sync.mjs'
import {
    loadManifest,
    writeManifest,
    buildManifest,
    diffManifest,
    sha256File,
} from './lib/manifest.mjs'
import { isPluginOwned, describeOwnership } from './lib/plugin-tree.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const COLORS = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
}

function colorize(c, msg) { return `${COLORS[c]}${msg}${COLORS.reset}` }
function log(msg) { console.log(msg) }
function success(msg) { console.log(colorize('green', `  ✓ ${msg}`)) }
function warn(msg) { console.log(colorize('yellow', `  ⚠ ${msg}`)) }
function error(msg) { console.log(colorize('red', `  ✗ ${msg}`)) }
function header(msg) {
    console.log('')
    console.log(colorize('cyan', msg))
    console.log(colorize('cyan', '─'.repeat(Math.min(msg.replace(/\x1b\[[0-9;]*m/g, '').length, 60))))
}

// ─── Args ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {
        track: 'fiction',
        prune: false,
        force: false,
        postinstall: false,
        skipBuild: false,
        skipIndex: false,
        help: false,
    }
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--prune') args.prune = true
        else if (a === '--force') args.force = true
        else if (a === '--postinstall') args.postinstall = true
        else if (a === '--skip-build') args.skipBuild = true
        else if (a === '--skip-index') args.skipIndex = true
        else if (a === '--track') args.track = argv[++i]
        else if (a === '--help' || a === '-h') args.help = true
    }
    return args
}

function printHelp() {
    log(`kombinat-refresh — idempotent plugin sync for kombinat-writer`)
    log('')
    log(`Usage:`)
    log(`  npx kombinat-refresh [options]`)
    log('')
    log(`Options:`)
    log(`  --track <fiction|non-fiction|mixed>  Track to use for skills/templates (default: fiction)`)
    log(`  --prune                             Remove files that vanished from source`)
    log(`  --force                             Overwrite locally-modified files (destructive)`)
    log(`  --postinstall                       Skip prompts (used by npm postinstall)`)
    log(`  --skip-build                        Skip the sidebar TypeScript build`)
    log(`  --skip-index                        Skip the lore index rebuild`)
    log(`  --help, -h                          Show this help`)
    log('')
    log(`Exit codes:`)
    log(`  0  success, no drift`)
    log(`  1  success, locally-modified files preserved`)
    log(`  2  refresh failed`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv)
    if (args.help) { printHelp(); process.exit(0) }

    const projectRoot = process.cwd()
    const destDir = path.join(projectRoot, '.opencode')

    // ── First-time install detection ──
    // If no manifest, fall through to a non-interactive install.
    const existingManifest = loadManifest(destDir)
    if (!existingManifest) {
        if (args.postinstall) {
            warn('No prior install recorded; nothing to refresh.')
            warn('Run `npx kombinat-writer` to perform the initial install.')
            process.exit(0)
        }
        // Interactive first-time: defer to install.mjs
        warn('No prior install recorded in this project. Delegating to kombinat-writer for initial install...')
        try {
            execSync(`node "${path.join(PACKAGE_ROOT, 'bin', 'install.mjs')}" --non-interactive`, {
                stdio: 'inherit',
                cwd: projectRoot,
            })
        } catch (err) {
            error('Initial install failed.')
            process.exit(2)
        }
        // After install, the manifest will be written; exit so the user can re-run refresh.
        success('Initial install complete. Re-run `npx kombinat-refresh` to verify the sync.')
        process.exit(0)
    }

    // ── Refresh path ──
    log('')
    log(colorize('bold', 'kombinat-refresh — idempotent plugin sync'))
    log(describeOwnership())
    log('')
    log(`  Package:    ${PACKAGE_ROOT} @ ${existingManifest.packageCommit || 'unknown'}`)
    log(`  Consumer:   ${projectRoot}`)
    log(`  Last sync:  ${existingManifest.installedAt} (commit ${existingManifest.packageCommit || 'unknown'})`)
    log(`  Track:      ${args.track}`)
    if (args.prune) log(`  Prune:      enabled (will remove files missing from source)`)
    if (args.force) log(`  Force:      enabled (will overwrite locally-modified files)`)
    log('')

    // Build a manifestFiles map (rel -> sha256) so 'protect' mode can detect
    // locally-modified files vs. files that simply don't exist in source.
    const manifestFiles = new Map()
    if (existingManifest && existingManifest.files) {
        for (const f of existingManifest.files) {
            manifestFiles.set(f.rel, f.sha256)
        }
    }
    const copyMode = args.force ? 'overwrite' : 'protect'

    // ── Copy skills, tools, commands, templates, plugin ──
    header('Syncing plugin assets')
    const skillsResult = copySkills(destDir, args.track, copyMode, manifestFiles)
    const toolsResult = copyToolsAndLib(destDir, copyMode, manifestFiles)
    const cmdsResult = copySlashCommands(destDir, copyMode, manifestFiles)
    copyTemplates(destDir, args.track)
    ensureProjectConfig(destDir)

    log(`  Skills:    ${skillsResult.copied} copied, ${skillsResult.skipped} unchanged`)
    log(`  Tools:     ${toolsResult.copied} copied, ${toolsResult.skipped} unchanged`)
    log(`  Commands:  ${cmdsResult.copied} copied, ${cmdsResult.skipped} unchanged`)

    // ── Sidebar sync ──
    // No build step needed: the plugin is installed source-direct (TSX/TS)
    // and runs natively under bun in the consumer project.
    if (args.skipBuild) {
        log(colorize('gray', '  Sync:      skipped (--skip-build)'))
    } else {
        header('Syncing sidebar plugin')
        const pluginResult = copySidebarPlugin(destDir, 'overwrite', manifestFiles)
        log(`  Plugin:    ${pluginResult.copied} copied (${pluginResult.source})`)
    }

    // ── Lore index ──
    let indexResult = null
    if (args.skipIndex) {
        log(colorize('gray', '\n  Index:     skipped (--skip-index)'))
    } else {
        header('Rebuilding lore index')
        try {
            const indexBuilderPath = path.join(PACKAGE_ROOT, 'src', 'lib', 'index-builder.mjs')
            const { buildIndex } = await import(indexBuilderPath)
            indexResult = await buildIndex(projectRoot, { quiet: args.postinstall })
            log(`  Chunks:    ${indexResult.chunksTotal} (${indexResult.chunksAdded} new, ${indexResult.chunksEmbedded} embedded, ${indexResult.chunksReused} reused)`)
            log(`  Sources:   ${indexResult.sourcesTotal} (${indexResult.sourcesAdded} added, ${indexResult.sourcesUpdated} updated, ${indexResult.sourcesUnchanged} unchanged)`)
        } catch (err) {
            warn(`Lore index build failed: ${err.message}`)
            warn('You can rebuild it later with `npx kombinat-index`.')
        }
    }

    // ── Diff against manifest ──
    header('Verifying sync')
    const newManifestState = buildManifest(destDir, {
        packageVersion: readPackageVersion(),
        packageCommit: readPackageCommit(),
        packageRoot: PACKAGE_ROOT,
        pluginOwnedSubtrees: [], // filled in by buildManifest
        loreIndex: {
            lastBuildAt: indexResult ? new Date().toISOString() : existingManifest.loreIndex?.lastBuildAt,
            needsRebuild: false,
        },
    })
    const diff = diffManifest(existingManifest, destDir)
    // Drift detection only matters for plugin-owned files. Changes to
    // project-owned subtrees (book/, memory/, cache/, state/) are expected
    // and not user "modifications" of plugin assets.
    const locallyModified = diff.modified.filter(m => isPluginOwned(m.rel))
    const removedFromSource = diff.removed
    const newFiles = diff.added

    if (locallyModified.length > 0) {
        warn(`${locallyModified.length} files modified locally (preserved):`)
        for (const m of locallyModified.slice(0, 20)) {
            log(colorize('yellow', `    ! ${m.rel}`))
        }
        if (locallyModified.length > 20) {
            log(colorize('gray', `    ... and ${locallyModified.length - 20} more`))
        }
    }

    if (args.prune && removedFromSource.length > 0) {
        const owned = removedFromSource.filter(r => isPluginOwned(r))
        if (owned.length > 0) {
            warn(`Pruning ${owned.length} files missing from source...`)
            for (const rel of owned) {
                const p = path.join(destDir, rel)
                if (fs.existsSync(p)) fs.removeSync(p)
            }
        }
    } else if (removedFromSource.length > 0) {
        const owned = removedFromSource.filter(r => isPluginOwned(r))
        if (owned.length > 0) {
            log(colorize('gray', `  ${owned.length} files no longer in source (kept; use --prune to remove)`))
        }
    }

    if (newFiles.length > 0 && args.postinstall) {
        log(`  ${newFiles.length} new files added`)
    }

    // ── Write the new manifest ──
    const finalManifest = buildManifest(destDir, {
        packageVersion: readPackageVersion(),
        packageCommit: readPackageCommit(),
        packageRoot: PACKAGE_ROOT,
        pluginOwnedSubtrees: [],
        loreIndex: {
            lastBuildAt: indexResult ? new Date().toISOString() : existingManifest.loreIndex?.lastBuildAt,
            needsRebuild: false,
        },
    })
    writeManifest(destDir, finalManifest)

    header('Refresh complete')
    log(`  Manifest:    ${path.join(destDir, '.kombinat-install-manifest.json')}`)
    log(`  Index:       ${indexResult ? `${indexResult.chunksTotal} chunks` : 'unchanged'}`)
    if (locallyModified.length > 0) {
        log(colorize('yellow', `  Drift:       ${locallyModified.length} locally-modified files preserved`))
        log(colorize('yellow', `               Re-run with --force to overwrite (destructive).`))
    } else {
        log(colorize('green', '  Drift:       none'))
    }
    log('')

    process.exit(locallyModified.length > 0 && !args.force ? 1 : 0)
}

function readPackageVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf-8'))
        return pkg.version
    } catch { return 'unknown' }
}

function readPackageCommit() {
    try {
        return execSync('git rev-parse --short HEAD', { cwd: PACKAGE_ROOT, encoding: 'utf-8' }).trim()
    } catch { return 'unknown' }
}

main().catch(err => {
    error(`Refresh failed: ${err.message}`)
    if (err.stack) console.error(err.stack)
    process.exit(2)
})
