#!/usr/bin/env node
/**
 * Sync — shared copy/sync logic for install.mjs and refresh.mjs
 *
 * Both scripts need to copy the kombinat-writer plugin assets from the
 * package source to the consumer project's .opencode/ directory. The copy
 * logic lives here so install and refresh can share it.
 *
 * Functions:
 *   copySkills(track)                 — Copy skill directories for a track
 *   copyToolsAndLib()                 — Copy tools/ + lib/ (recursive .ts/.mjs)
 *   copySlashCommands()               — Copy commands/*.md
 *   copyTemplates(track)              — Copy templates/{base,track,series}
 *   copySidebarPlugin()               — Copy the built sidebar bundle
 *   ensureProjectConfig()             — Register the plugin in tui.json, opencode.jsonc, package.json
 *   initProjectStructure(track)       — Create book/, memory/, output/ scaffolding
 *
 * All copy functions take a "mode" parameter:
 *   'install'   — first-time install, no conflict resolution (assume dest doesn't exist)
 *   'overwrite' — overwrite all files unconditionally
 *   'preserve'  — skip files that exist locally (preserve user modifications)
 *   'diff'      — copy only files whose content differs from source
 *
 * The 'diff' mode is the one refresh.mjs uses. The 'overwrite' mode is
 * what install.mjs --reset uses. The default for install.mjs is interactive
 * (handled there, not here).
 */

import fs from 'fs-extra'
import path from 'path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..')
const SRC_DIR = path.join(PACKAGE_ROOT, 'src')

// Default destination is .opencode/ under cwd. Can be overridden by
// passing a different DEST_DIR to each function.
function defaultDestDir() {
    return path.join(process.cwd(), '.opencode')
}

// ─── Skills ─────────────────────────────────────────────────────────────────

/**
 * Copy skill directories. Tracks: fiction, non-fiction, mixed.
 *
 * @param {string} destDir
 * @param {string} track — 'fiction' | 'non-fiction' | 'mixed'
 * @param {string} mode — 'install' | 'overwrite' | 'preserve' | 'diff' | 'protect'
 * @param {Map<string,string>} [manifestFiles] Optional map of relPath -> sha256 from
 *     a prior install, used by 'protect' mode to detect locally-modified files.
 * @returns {{copied: number, skipped: number}}
 */
export function copySkills(destDir, track, mode, manifestFiles = null) {
    const destSkills = path.join(destDir, 'skills')
    const baseSkillDirs = ['quality-assurance', 'critique', 'research']
    const trackSkillDirs = {
        fiction: ['fiction/writing-techniques', 'fiction/genre-knowledge'],
        'non-fiction': ['non-fiction/academic-writing', 'non-fiction/citation-styles', 'non-fiction/argument-structure', 'non-fiction/source-evaluation', 'non-fiction'],
        mixed: ['fiction/writing-techniques', 'fiction/genre-knowledge', 'non-fiction/citation-styles', 'non-fiction/source-evaluation', 'non-fiction'],
    }
    const allDirs = [...baseSkillDirs, ...(trackSkillDirs[track] || trackSkillDirs.fiction)]
    fs.ensureDirSync(destSkills)
    let copied = 0, skipped = 0
    for (const skillDir of allDirs) {
        const src = path.join(SRC_DIR, 'skills', skillDir)
        const dest = path.join(destSkills, skillDir)
        if (!fs.existsSync(src)) continue
        const result = smartCopyDir(src, dest, mode, manifestFiles)
        if (result === 'copied') copied++
        else skipped++
    }
    return { copied, skipped }
}

// ─── Tools + Lib ────────────────────────────────────────────────────────────

/**
 * Copy src/tools/ and src/lib/ into <destDir>/tools/.
 */
export function copyToolsAndLib(destDir, mode, manifestFiles = null) {
    const srcTools = path.join(SRC_DIR, 'tools')
    const destTools = path.join(destDir, 'tools')
    if (!fs.existsSync(srcTools)) return { copied: 0, skipped: 0 }
    fs.ensureDirSync(destTools)
    let copied = 0, skipped = 0
    walkAndCopy(srcTools, destTools, mode, manifestFiles, (result) => {
        if (result === 'copied') copied++
        else skipped++
    })
    // Copy lib/ (.ts modules + .mjs runtime modules)
    // lib/ is placed at <destDir>/plugins/lib/ to mirror the source layout
    // where src/lib/ is a sibling of src/plugins/. This keeps the plugin's
    // relative imports (../../lib/) working in both the source tree and the
    // installed consumer project.
    const srcLib = path.join(SRC_DIR, 'lib')
    if (fs.existsSync(srcLib)) {
        const libDest = path.join(destDir, 'plugins', 'lib')
        fs.ensureDirSync(libDest)
        // Copy .ts modules + .mjs runtime modules (chunker, index-builder, etc.)
        for (const file of fs.readdirSync(srcLib).filter(f => (f.endsWith('.ts') && !f.endsWith('.d.ts')) || f.endsWith('.mjs'))) {
            const result = smartCopyFile(
                path.join(srcLib, file),
                path.join(libDest, file),
                mode,
                manifestFiles ? manifestFiles.get(`plugins/lib/${file}`) : null,
            )
            if (result === 'copied') copied++
            else skipped++
        }
        // Copy scripts/ directory (lore-query.mjs, build-lore-index uses this)
        const srcScripts = path.join(srcLib, 'scripts')
        if (fs.existsSync(srcScripts)) {
            const destScripts = path.join(libDest, 'scripts')
            fs.ensureDirSync(destScripts)
            for (const file of fs.readdirSync(srcScripts)) {
                const result = smartCopyFile(
                    path.join(srcScripts, file),
                    path.join(destScripts, file),
                    mode,
                    manifestFiles ? manifestFiles.get(`plugins/lib/scripts/${file}`) : null,
                )
                if (result === 'copied') copied++
                else skipped++
            }
        }
    }
    return { copied, skipped }
}

function walkAndCopy(srcDir, destDir, mode, manifestFiles, callback) {
    if (!fs.existsSync(srcDir)) return
    const relativeToOpencode = path.relative(path.join(SRC_DIR, '..'), srcDir)
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        // Skip the installer file inside tools/ (it doesn't belong in the consumer)
        if (entry.name === 'installer.ts' || entry.name === 'install.mjs') {
            callback('skipped')
            continue
        }
        const srcPath = path.join(srcDir, entry.name)
        const destPath = path.join(destDir, entry.name)
        if (entry.isDirectory()) {
            fs.ensureDirSync(destPath)
            walkAndCopy(srcPath, destPath, mode, manifestFiles, callback)
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.mjs')) {
            // Compute rel path under .opencode/ for the manifest lookup
            const relUnderOpencode = path.relative(path.join(destDir, '..', '..'), destPath)
            const manifestSha = manifestFiles ? manifestFiles.get(relUnderOpencode) : null
            const result = smartCopyFile(srcPath, destPath, mode, manifestSha)
            callback(result)
        }
    }
}

// ─── Slash Commands ─────────────────────────────────────────────────────────

export function copySlashCommands(destDir, mode, manifestFiles = null) {
    const srcDir = path.join(SRC_DIR, 'commands')
    const destDir2 = path.join(destDir, 'commands')
    if (!fs.existsSync(srcDir)) return { copied: 0, skipped: 0 }
    fs.ensureDirSync(destDir2)
    let copied = 0, skipped = 0
    for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.md'))) {
        const result = smartCopyFile(
            path.join(srcDir, file),
            path.join(destDir2, file),
            mode,
            manifestFiles ? manifestFiles.get(`commands/${file}`) : null,
        )
        if (result === 'copied') copied++
        else skipped++
    }
    return { copied, skipped }
}

// ─── Templates ──────────────────────────────────────────────────────────────

export function copyTemplates(destDir, track) {
    const baseTemplates = path.join(SRC_DIR, 'templates')
    const destTemplates = path.join(destDir, 'templates')
    if (!fs.existsSync(baseTemplates)) return
    
    // Instead of overwriting blindly, we use smartCopyDir to do a diff/protect copy.
    // This allows refresh.mjs to pull in new templates (like the ones we just created) 
    // without clobbering anything.
    fs.ensureDirSync(destTemplates)
    const baseDir = path.join(baseTemplates, 'base')
    if (fs.existsSync(baseDir)) smartCopyDir(baseDir, destTemplates, 'diff')
    
    const trackDir = path.join(baseTemplates, track)
    if (fs.existsSync(trackDir)) smartCopyDir(trackDir, destTemplates, 'diff')
    
    const seriesDir = path.join(baseTemplates, 'series')
    if (fs.existsSync(seriesDir)) {
        const destSeriesDir = path.join(destTemplates, 'series')
        smartCopyDir(seriesDir, destSeriesDir, 'diff')
    }
}

// ─── Sidebar Plugin ─────────────────────────────────────────────────────────

/**
 * Copy the kombinat-sidebar TUI plugin from source into the consumer project.
 *
 * Source of truth: src/plugins/ (TSX + TS, runs natively under bun — no
 * build step needed in the consumer). The TSX tree has subdirectories
 * (components/, hooks/, utils/) that MUST be copied intact; the legacy
 * dist/ bundle collapses everything into a single minified file and is no
 * longer used.
 *
 * Plugin entry point in the consumer: .opencode/plugins/kombinat-sidebar/index.js
 * which re-exports from ./kombinat-sidebar.tsx (the .tsx extension is
 * required because the index.js in src/plugins/ points to it directly).
 */
export function copySidebarPlugin(destDir, mode, manifestFiles = null) {
    const srcDir = path.join(SRC_DIR, 'plugins')
    const destDir2 = path.join(destDir, 'plugins', 'kombinat-sidebar')
    if (!fs.existsSync(srcDir)) return { copied: 0, skipped: 0, source: 'none' }

    fs.ensureDirSync(destDir2)
    let copied = 0, skipped = 0

    // Copy top-level files (entry point, package.json, tsconfig.json, index.js).
    // Skip the lib/ symlink — it's resolved when we copy subdirectories below.
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const srcPath = path.join(srcDir, entry.name)
        const destPath = path.join(destDir2, entry.name)
        if (entry.isSymbolicLink()) continue // resolved below
        if (entry.isDirectory()) continue // handled below
        if (
            entry.name.endsWith('.tsx') ||
            entry.name.endsWith('.ts') ||
            entry.name.endsWith('.js') ||
            entry.name === 'package.json' ||
            entry.name === 'tsconfig.json'
        ) {
            const result = smartCopyFile(
                srcPath,
                destPath,
                mode,
                manifestFiles ? manifestFiles.get(`plugins/kombinat-sidebar/${entry.name}`) : null,
            )
            if (result === 'copied') copied++
            else skipped++
        }
    }

    // Copy subdirectories (components/, hooks/, utils/, lib/) recursively.
    // Symlinks are followed (dereference: true) so the installed plugin
    // contains real files, not links back into the package source.
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
        const subSrc = path.join(srcDir, entry.name)
        const subDest = path.join(destDir2, entry.name)
        if (entry.isSymbolicLink()) {
            // Resolve the symlink target and copy the real directory contents.
            const realSrc = fs.realpathSync(subSrc)
            if (!fs.existsSync(realSrc) || !fs.statSync(realSrc).isDirectory()) continue
            fs.ensureDirSync(subDest)
            copyDirDereferenced(realSrc, subDest, mode, manifestFiles)
            copied++
            continue
        }
        const result = smartCopyDir(
            subSrc,
            subDest,
            mode,
            manifestFiles
                ? new Map(
                      [...manifestFiles.entries()]
                          .filter(([k]) => k.startsWith(`plugins/kombinat-sidebar/${entry.name}/`))
                          .map(([k, v]) => [k.slice(`plugins/kombinat-sidebar/`.length), v])
                  )
                : null,
        )
        if (result === 'copied') copied++
        else if (result === 'skipped') skipped++
    }

    return { copied, skipped, source: 'source' }
}

/**
 * Copy a directory tree following symlinks (dereferencing them to real files).
 * Used for the plugin's lib/ symlink which points into src/lib/.
 */
function copyDirDereferenced(srcDir, destDir, mode, manifestFiles) {
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const sp = path.join(srcDir, entry.name)
        const dp = path.join(destDir, entry.name)
        if (entry.isDirectory()) {
            fs.ensureDirSync(dp)
            copyDirDereferenced(sp, dp, mode, manifestFiles)
        } else if (entry.isFile() || entry.isSymbolicLink()) {
            fs.copySync(sp, dp, { overwrite: true, dereference: true })
        }
    }
}

// ─── Project Config (tui.json, opencode.jsonc, package.json) ────────────────

const PLUGIN_ENTRY = './plugins/kombinat-sidebar/index.js'

const REQUIRED_DEPS = {
    '@opencode-ai/plugin': '1.17.9',
    '@opentui/core': '>=0.1.97',
    '@opentui/solid': '>=0.1.97',
    'solid-js': '^1.9.0',
    'fs-extra': '^11.0.0',
    'fast-xml-parser': '^4.5.0',
}

/**
 * Ensure tui.json, opencode.jsonc, and package.json exist and register the
 * kombinat-sidebar plugin. Additive only — never removes user-added keys.
 */
export function ensureProjectConfig(destDir) {
    const tuiJsonPath = path.join(destDir, 'tui.json')
    const opencodeJsoncPath = path.join(destDir, 'opencode.jsonc')
    const pkgJsonPath = path.join(destDir, 'package.json')

    // tui.json
    if (!fs.existsSync(tuiJsonPath)) {
        const config = { $schema: 'https://opencode.ai/tui.json', plugin: [PLUGIN_ENTRY] }
        fs.writeJsonSync(tuiJsonPath, config, { spaces: 2 })
    } else {
        const config = parseJsonc(tuiJsonPath)
        if (config) {
            const plugins = Array.isArray(config.plugin) ? config.plugin : []
            if (!plugins.some(p => typeof p === 'string' && p.endsWith('kombinat-sidebar/index.js'))) {
                config.plugin = [...plugins, PLUGIN_ENTRY]
                fs.writeFileSync(tuiJsonPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
            }
        }
    }

    // opencode.jsonc
    if (!fs.existsSync(opencodeJsoncPath)) {
        const config = { plugin: [PLUGIN_ENTRY] }
        fs.writeFileSync(opencodeJsoncPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    } else {
        const config = parseJsonc(opencodeJsoncPath)
        if (config) {
            const plugins = Array.isArray(config.plugin) ? config.plugin : []
            if (!plugins.some(p => typeof p === 'string' && p.endsWith('kombinat-sidebar/index.js'))) {
                config.plugin = [...plugins, PLUGIN_ENTRY]
                fs.writeFileSync(opencodeJsoncPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
            }
        }
    }

    // package.json
    let pkg = {}
    if (fs.existsSync(pkgJsonPath)) {
        try { pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) } catch { pkg = {} }
    }
    pkg.type = pkg.type || 'module'
    pkg.dependencies = pkg.dependencies || {}
    let depsAdded = false
    for (const [name, version] of Object.entries(REQUIRED_DEPS)) {
        if (!pkg.dependencies[name]) {
            pkg.dependencies[name] = version
            depsAdded = true
        }
    }
    if (depsAdded) {
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    }
}

function parseJsonc(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const stripped = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    try { return JSON.parse(stripped) } catch { return null }
}

// ─── Project Structure Init ─────────────────────────────────────────────────

/**
 * Create book/, memory/, output/ scaffolding. Only creates dirs that don't
 * exist — never overwrites existing project work.
 */
export function initProjectStructure(projectRoot, track) {
    const bookDir = path.join(projectRoot, 'book')
    if (fs.existsSync(bookDir)) return false
    const dirs = [
        ['book/content'], ['book/research/sources'], ['book/research/bibliography'],
        ['book/research/interviews'], ['book/knowledge'], ['book/tracking'],
        ['book/drafts'], ['book/critique'], ['book/revisions'], ['book/metadata'],
        ['book/checkpoints'], ['memory'], ['output/manuscript'],
    ]
    for (const d of dirs) fs.ensureDirSync(path.join(projectRoot, d))
    fs.writeJsonSync(path.join(bookDir, 'track.json'), {
        track, initialized: new Date().toISOString(), version: '0.1.0'
    }, { spaces: 2 })
    return true
}

// ─── Smart copy primitives ──────────────────────────────────────────────────

/**
 * Copy a single file with mode-aware behavior.
 *
 * Modes:
 *   'install'   — first-time install; copy unconditionally (assumes dest doesn't exist)
 *   'overwrite' — overwrite all files unconditionally
 *   'preserve'  — skip files that exist locally (preserve user modifications)
 *   'diff'      — copy only files whose content differs from source
 *   'protect'   — like 'diff' but skip files whose local content differs from the
 *                 previous install's manifest (preserve locally-modified plugin files).
 *                 For refresh: copy a source file only if the destination either
 *                 doesn't exist OR matches what we last installed.
 *
 * @returns 'copied' | 'skipped'
 */
export function smartCopyFile(srcPath, destPath, mode, manifestSha = null) {
    if (!fs.existsSync(srcPath)) return 'skipped'
    if (mode === 'install') {
        // First-time install: copy unconditionally (assumes dest doesn't exist)
        fs.ensureDirSync(path.dirname(destPath))
        fs.copySync(srcPath, destPath)
        return 'copied'
    }
    if (mode === 'overwrite') {
        fs.ensureDirSync(path.dirname(destPath))
        fs.copySync(srcPath, destPath, { overwrite: true })
        return 'copied'
    }
    if (mode === 'preserve') {
        if (fs.existsSync(destPath)) return 'skipped'
        fs.ensureDirSync(path.dirname(destPath))
        fs.copySync(srcPath, destPath)
        return 'copied'
    }
    if (mode === 'diff') {
        if (!fs.existsSync(destPath)) {
            fs.ensureDirSync(path.dirname(destPath))
            fs.copySync(srcPath, destPath)
            return 'copied'
        }
        // Both exist — compare bytes
        const srcBuf = fs.readFileSync(srcPath)
        const destBuf = fs.readFileSync(destPath)
        if (srcBuf.equals(destBuf)) return 'skipped'
        // Different — overwrite
        fs.copySync(srcPath, destPath, { overwrite: true })
        return 'copied'
    }
    if (mode === 'protect') {
        if (!fs.existsSync(destPath)) {
            fs.ensureDirSync(path.dirname(destPath))
            fs.copySync(srcPath, destPath)
            return 'copied'
        }
        const srcBuf = fs.readFileSync(srcPath)
        const destBuf = fs.readFileSync(destPath)
        if (srcBuf.equals(destBuf)) return 'skipped'
        // Local differs from source. If we have a manifest and the local
        // ALSO differs from the manifest's recorded SHA, the user has
        // modified it locally — preserve.
        if (manifestSha) {
            const manifestBuf = manifestSha // we got a string SHA
            const localSha = createHash('sha256').update(destBuf).digest('hex')
            if (localSha !== manifestSha) return 'skipped' // user-modified, preserve
        } else {
            // No manifest — safer to preserve than overwrite
            return 'skipped'
        }
        // Local differs from source but matches the manifest (i.e. install
        // happened with a different version of source) — overwrite.
        fs.copySync(srcPath, destPath, { overwrite: true })
        return 'copied'
    }
    throw new Error(`Unknown copy mode: ${mode}`)
}

/**
 * Copy a directory recursively with mode-aware behavior.
 */
export function smartCopyDir(srcDir, destDir, mode, manifestFiles = null) {
    if (!fs.existsSync(srcDir)) return 'skipped'
    if (mode === 'install') {
        fs.copySync(srcDir, destDir)
        return 'copied'
    }
    if (mode === 'overwrite') {
        fs.copySync(srcDir, destDir, { overwrite: true })
        return 'copied'
    }
    if (mode === 'preserve') {
        if (fs.existsSync(destDir)) return 'skipped'
        fs.copySync(srcDir, destDir)
        return 'copied'
    }
    if (mode === 'diff' || mode === 'protect') {
        fs.ensureDirSync(destDir)
        let anyCopied = false
        const walk = (s, d) => {
            for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
                const sp = path.join(s, entry.name)
                const dp = path.join(d, entry.name)
                if (entry.isDirectory()) {
                    fs.ensureDirSync(dp)
                    walk(sp, dp)
                } else {
                    const r = smartCopyFile(sp, dp, mode, manifestFiles ? manifestFiles.get(path.relative(destDir, dp)) : null)
                    if (r === 'copied') anyCopied = true
                }
            }
        }
        walk(srcDir, destDir)
        return anyCopied ? 'copied' : 'skipped'
    }
    throw new Error(`Unknown copy mode: ${mode}`)
}

export { PACKAGE_ROOT, SRC_DIR, PLUGIN_ENTRY, REQUIRED_DEPS }
