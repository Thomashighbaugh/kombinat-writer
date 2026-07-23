#!/usr/bin/env node
/**
 * Index Builder — builds the lore/knowledge/outline/draft retrieval index
 *
 * Scans a project's lore, knowledge, outline, and draft files; chunks them
 * using the right chunker per source kind; embeds each chunk via local
 * Ollama; writes the on-disk JSON index at:
 *
 *     <projectRoot>/.opencode/cache/lore-index/index.json
 *
 * The index is the source of truth for runtime query (lore-query.mjs). When
 * the index is missing, the query falls back to re-embedding on the fly
 * (slow, but functional). When Ollama is unreachable, the query falls back
 * to reading the full lore files (lore-context.ts path).
 *
 * Indexing is incremental: re-running on an up-to-date index is a no-op
 * because per-source file hashes are checked before re-embedding.
 *
 * Usage:
 *   node index-builder.mjs [project-root] [--quiet]
 *   node index-builder.mjs --status [project-root]
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, renameSync } from 'fs'
import { join, resolve, dirname } from 'path'

import { chunkMarkdownFile, classifySourceKind } from './md-chunker.mjs'
import { chunkXmlDraftFile, resolveDraftFilePath } from './xml-draft-chunker.mjs'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const EMBED_MODEL = process.env.EMBED_MODEL || 'pedrohml/mxbai-embed-large:latest'
const INDEX_FILENAME = 'index.json'
const INDEX_SCHEMA_VERSION = 1

// ─── Source patterns (kept in sync with lore-context.ts LORE_PATHS) ────────

/**
 * Source patterns the indexer scans. Each entry:
 *   - glob: a simple `prefix/*.ext` or `prefix/**` pattern (no glob library;
 *     we resolve each by reading the directory directly)
 *   - kind: source kind, used for chunker dispatch and metadata
 *   - chapterNumberFromFilename: if true, extract chapter number from
 *     the filename (for `chapter_NNNNN.xml` style)
 *   - priority: 'high' | 'normal' | 'low' (used by the reranker to break ties)
 *   - pinnable: whether chunks from this source can be pinned (--pin-chapter)
 *   - lowPriority: hint that this source is lower-priority in retrieval
 */
const SOURCE_PATTERNS = [
    // Series lorebook
    { pattern: 'series/lorebook/characters.md', kind: 'lore' },
    { pattern: 'series/lorebook/world.md', kind: 'lore' },
    { pattern: 'series/lorebook/glossary.md', kind: 'lore' },
    { pattern: 'series/lorebook/timeline.json', kind: 'lore' },
    { pattern: 'series/lorebook/threads.md', kind: 'lore' },

    // Series outline (condensed, cross-book)
    { pattern: 'series/outline.md', kind: 'outline' },

    // Per-book knowledge
    { pattern: 'book/knowledge/character-profiles.md', kind: 'lore' },
    { pattern: 'book/knowledge/voice-profiles.json', kind: 'lore' },
    { pattern: 'book/knowledge/locations.md', kind: 'lore' },
    { pattern: 'book/knowledge/world-rules.md', kind: 'lore' },
    { pattern: 'book/knowledge/character-voices.md', kind: 'lore' },

    // Book canon & spec
    { pattern: 'book/manifest.md', kind: 'canon', priority: 'high' },
    { pattern: 'book/specification.md', kind: 'spec', priority: 'high' },

    // Book outline (whole book)
    { pattern: 'book/outline.md', kind: 'outline' },
    // Per-chapter outline details: book/outline/chapter_NN.md
    { pattern: 'book/outline/', kind: 'outline', recursive: true, ext: '.md' },

    // Drafts (XML) — handled by glob
    { pattern: 'book/drafts/', kind: 'draft', recursive: true, ext: '.xml', pinnable: true, chapterNumberFromFilename: true },
]

// ─── Source scanning ────────────────────────────────────────────────────────

/**
 * Scan the project for all source files matching SOURCE_PATTERNS.
 *
 * @param {string} projectRoot
 * @returns {Array<{path: string, kind: string, chapterNumber?: number, priority?: string, pinnable?: boolean}>}
 */
export function scanSources(projectRoot) {
    const sources = []
    for (const pattern of SOURCE_PATTERNS) {
        const fullPath = join(projectRoot, pattern.pattern)
        if (!existsSync(fullPath)) continue

        if (pattern.recursive) {
            // Directory: walk and pick files with the right extension
            const files = walkDir(fullPath, pattern.ext)
            for (const f of files) {
                const rel = f.slice(projectRoot.length + 1)
                const src = {
                    path: rel,
                    kind: pattern.kind,
                }
                if (pattern.chapterNumberFromFilename) {
                    const m = rel.match(/chapter_(\d+)\.xml$/)
                    if (m) src.chapterNumber = parseInt(m[1], 10)
                }
                if (pattern.priority) src.priority = pattern.priority
                if (pattern.pinnable) src.pinnable = pattern.pinnable
                sources.push(src)
            }
        } else {
            // Single file
            const stat = existsSync(fullPath) ? statSync(fullPath) : null
            if (!stat || !stat.isFile()) continue
            const rel = pattern.pattern
            const src = {
                path: rel,
                kind: pattern.kind,
            }
            if (pattern.priority) src.priority = pattern.priority
            if (pattern.pinnable) src.pinnable = pattern.pinnable
            sources.push(src)
        }
    }
    return sources
}

function walkDir(dir, ext) {
    const out = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            out.push(...walkDir(full, ext))
        } else if (entry.isFile() && (!ext || entry.name.endsWith(ext))) {
            out.push(full)
        }
    }
    return out
}

// ─── Hashing ────────────────────────────────────────────────────────────────

function hashFile(filePath) {
    const h = createHash('sha256')
    h.update(readFileSync(filePath))
    return h.digest('hex')
}

// ─── Chunking dispatch ──────────────────────────────────────────────────────

/**
 * Chunk a source file using the appropriate chunker for its kind.
 *
 * @param {{path: string, kind: string, chapterNumber?: number}} source
 * @param {string} projectRoot
 * @returns {Array<object>} chunks
 */
export function chunkSource(source, projectRoot) {
    const fullPath = join(projectRoot, source.path)
    if (!existsSync(fullPath)) return []
    if (source.kind === 'draft') {
        return chunkXmlDraftFile(fullPath, source.path, source.chapterNumber)
    }
    // All other kinds use the markdown chunker
    return chunkMarkdownFile(fullPath, source.path).map(c => ({
        text: c.text,
        source: c.source,
        chunkKind: c.source.includes('#') ? c.source.split('#').pop() : 'section',
        kind: source.kind,
        chapterNumber: source.chapterNumber ?? null,
        pinnable: source.pinnable ?? false,
    }))
}

// ─── Embedding ──────────────────────────────────────────────────────────────

/**
 * Embed a single text via Ollama. Returns a Float32Array-as-array of length
 * matching the model's output dimension.
 */
async function getEmbedding(text) {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    })
    if (!res.ok) throw new Error(`Embed error: ${res.status} ${res.statusText}`)
    const data = await res.json()
    return data.embeddings[0]
}

// ─── Index read/write ───────────────────────────────────────────────────────

/**
 * Get the path to the on-disk index file for a project.
 */
export function getIndexPath(projectRoot) {
    return join(projectRoot, '.opencode', 'cache', 'lore-index', INDEX_FILENAME)
}

/**
 * Load the existing index (or return null if absent / unparseable).
 */
export function loadIndex(projectRoot) {
    const p = getIndexPath(projectRoot)
    if (!existsSync(p)) return null
    try {
        return JSON.parse(readFileSync(p, 'utf-8'))
    } catch {
        return null
    }
}

/**
 * Write the index atomically (write to .tmp then rename).
 */
export function writeIndex(projectRoot, index) {
    const p = getIndexPath(projectRoot)
    mkdirSync(dirname(p), { recursive: true })
    const tmpPath = p + '.tmp'
    writeFileSync(tmpPath, JSON.stringify(index, null, 2) + '\n', 'utf-8')
    renameSync(tmpPath, p)
}

// ─── Build (incremental) ────────────────────────────────────────────────────

/**
 * Build or incrementally update the index. Returns a summary:
 *
 *   {
 *     sourcesTotal, sourcesAdded, sourcesUpdated, sourcesUnchanged,
 *     chunksTotal, chunksAdded, chunksEmbedded, chunksReused,
 *     durationMs, indexPath
 *   }
 *
 * Strategy:
 *   1. Scan sources.
 *   2. For each source: hash the file. If the prior index has a source
 *      entry with the same hash, keep its chunks (and embeddings) as-is.
 *   3. If the hash changed (or it's a new source), re-chunk the file and
 *      re-embed all its chunks.
 *   4. If a source disappeared from disk, drop its chunks.
 *   5. Write the new index.
 *
 * @param {string} projectRoot
 * @param {object} [opts] { quiet?: boolean, force?: boolean }
 */
export async function buildIndex(projectRoot, opts = {}) {
    const t0 = Date.now()
    const sources = scanSources(projectRoot)
    const prev = opts.force ? null : loadIndex(projectRoot)

    // Build a lookup of prev sources by path
    const prevSources = new Map()
    if (prev && Array.isArray(prev.sources)) {
        for (const s of prev.sources) prevSources.set(s.path, s)
    }

    // Build a lookup of prev chunks by id (for reusing embeddings when a
    // source is unchanged)
    const prevChunksById = new Map()
    if (prev && Array.isArray(prev.chunks)) {
        for (const c of prev.chunks) prevChunksById.set(c.id, c)
    }

    const newSources = []
    const newChunks = []
    let sourcesAdded = 0, sourcesUpdated = 0, sourcesUnchanged = 0
    let chunksAdded = 0, chunksReused = 0
    let chunksEmbedded = 0
    let chunkIdCounter = 0

    for (const source of sources) {
        const fullPath = join(projectRoot, source.path)
        const hash = hashFile(fullPath)
        const prevSource = prevSources.get(source.path)

        const sourceEntry = {
            path: source.path,
            kind: source.kind,
            hash: `sha256:${hash}`,
            chapterNumber: source.chapterNumber ?? null,
            priority: source.priority ?? 'normal',
            lowPriority: source.priority === 'low',
            pinnable: source.pinnable ?? false,
        }

        if (prevSource && prevSource.hash === sourceEntry.hash) {
            // Unchanged — reuse prior chunks for this source
            sourcesUnchanged++
            newSources.push(sourceEntry)
            for (const c of (prev.chunks || []).filter(c => c.sourcePath === source.path)) {
                newChunks.push(c)
                chunksReused++
            }
            continue
        }

        // New or updated source: re-chunk
        if (prevSource) sourcesUpdated++
        else sourcesAdded++

        newSources.push(sourceEntry)
        const chunks = chunkSource(source, projectRoot)
        for (const c of chunks) {
            chunkIdCounter++
            const id = `chunk-${String(chunkIdCounter).padStart(5, '0')}`
            let embedding = null
            try {
                embedding = await getEmbedding(c.text)
                chunksEmbedded++
            } catch (err) {
                if (!opts.quiet) {
                    console.error(`[index-builder] Embedding failed for ${c.source}: ${err.message}`)
                }
                // Skip chunks that fail to embed — they'll be retried on the next build
                continue
            }
            newChunks.push({
                id,
                sourcePath: source.path,
                kind: c.kind ?? source.kind,
                chunkKind: c.chunkKind ?? 'section',
                chapterNumber: c.chapterNumber ?? null,
                sceneNumber: c.sceneNumber ?? null,
                continuation: c.continuation ?? false,
                heading: c.source.includes('#') ? c.source.split('#').pop() : null,
                text: c.text,
                embedding,
                lowPriority: sourceEntry.lowPriority,
                pinnable: sourceEntry.pinnable,
            })
            chunksAdded++
        }
    }

    const index = {
        schemaVersion: INDEX_SCHEMA_VERSION,
        builtAt: new Date().toISOString(),
        projectRoot,
        embedModel: EMBED_MODEL,
        chunkCount: newChunks.length,
        sources: newSources,
        chunks: newChunks,
    }
    writeIndex(projectRoot, index)

    const durationMs = Date.now() - t0
    return {
        sourcesTotal: newSources.length,
        sourcesAdded,
        sourcesUpdated,
        sourcesUnchanged,
        chunksTotal: newChunks.length,
        chunksAdded,
        chunksEmbedded,
        chunksReused,
        durationMs,
        indexPath: getIndexPath(projectRoot),
    }
}

// ─── Status ─────────────────────────────────────────────────────────────────

/**
 * Print index status and exit 0 (or 1 if no index).
 *
 * @param {string} projectRoot
 */
export function printStatus(projectRoot) {
    const index = loadIndex(projectRoot)
    if (!index) {
        console.error(`[index-builder] No index found at ${getIndexPath(projectRoot)}`)
        process.exit(1)
    }
    const byKind = {}
    for (const s of index.sources) byKind[s.kind] = (byKind[s.kind] || 0) + 1
    const ageMs = Date.now() - new Date(index.builtAt).getTime()
    const ageHours = (ageMs / 3600000).toFixed(1)
    console.log(`Index: ${getIndexPath(projectRoot)}`)
    console.log(`  Built:     ${index.builtAt} (${ageHours}h ago)`)
    console.log(`  Embedder:  ${index.embedModel}`)
    console.log(`  Sources:   ${index.sources.length} (${Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join(', ')})`)
    console.log(`  Chunks:    ${index.chunks.length} (${index.chunks.filter(c => c.embedding).length} embedded)`)
}

// ─── CLI entry ──────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2)
    let projectRoot = process.cwd()
    let statusOnly = false
    let force = false
    let quiet = false

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--status') statusOnly = true
        else if (args[i] === '--force') force = true
        else if (args[i] === '--quiet') quiet = true
        else if (!args[i].startsWith('--')) projectRoot = resolve(args[i])
    }

    if (statusOnly) {
        printStatus(projectRoot)
        return
    }

    if (!quiet) {
        console.log(`[index-builder] Scanning ${projectRoot}...`)
    }

    let summary
    try {
        summary = await buildIndex(projectRoot, { quiet, force })
    } catch (err) {
        console.error(`[index-builder] Build failed: ${err.message}`)
        console.error(`[index-builder] Is Ollama running at ${OLLAMA_URL} with ${EMBED_MODEL}?`)
        process.exit(2)
    }

    if (!quiet) {
        console.log(`[index-builder] Done in ${(summary.durationMs / 1000).toFixed(1)}s`)
        console.log(`  Sources:   ${summary.sourcesTotal} (${summary.sourcesAdded} added, ${summary.sourcesUpdated} updated, ${summary.sourcesUnchanged} unchanged)`)
        console.log(`  Chunks:    ${summary.chunksTotal} (${summary.chunksAdded} new, ${summary.chunksEmbedded} embedded, ${summary.chunksReused} reused)`)
        console.log(`  Index:     ${summary.indexPath}`)
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}
