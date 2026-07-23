#!/usr/bin/env node
/**
 * kombinat-index — Build or update the lore/knowledge/outline/draft index
 *
 * Thin CLI wrapper around src/lib/index-builder.mjs. Installed by the
 * per-project installer into .opencode/tools/lib/scripts/ alongside
 * lore-query.mjs, and exposed as the `kombinat-index` bin entry.
 *
 * Usage:
 *   npx kombinat-index [project-root] [--force] [--quiet]
 *   npx kombinat-index --status [project-root]
 *
 * If project-root is omitted, defaults to the current working directory.
 *
 * Exits:
 *   0  — success
 *   1  — status mode, no index found
 *   2  — build failed (e.g. Ollama unreachable)
 */

import { resolve } from 'path'

// Resolve the index-builder module relative to this script
// (bin/build-lore-index.mjs → ../src/lib/index-builder.mjs)
const here = new URL(import.meta.url).pathname
const indexBuilderPath = resolve(here, '../../src/lib/index-builder.mjs')
const { buildIndex, printStatus } = await import(indexBuilderPath)

const args = process.argv.slice(2)
let projectRoot = process.cwd()
let statusOnly = false
let force = false
let quiet = false

for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--status') statusOnly = true
    else if (a === '--force') force = true
    else if (a === '--quiet') quiet = true
    else if (a === '--help' || a === '-h') {
        console.log('Usage: kombinat-index [project-root] [--force] [--quiet]')
        console.log('       kombinat-index --status [project-root]')
        process.exit(0)
    } else if (!a.startsWith('--')) {
        projectRoot = resolve(a)
    }
}

if (statusOnly) {
    printStatus(projectRoot)
    process.exit(0)
}

try {
    const summary = await buildIndex(projectRoot, { force, quiet })
    if (!quiet) {
        console.log('')
        console.log(`  Index ready: ${summary.indexPath}`)
        console.log(`  ${summary.chunksTotal} chunks from ${summary.sourcesTotal} sources`)
        console.log(`  Build time:  ${(summary.durationMs / 1000).toFixed(1)}s`)
    }
    process.exit(0)
} catch (err) {
    console.error(`[kombinat-index] Build failed: ${err.message}`)
    process.exit(2)
}
