#!/usr/bin/env bun
/**
 * Lore Query — Semantic Lorebook Retriever
 *
 * Reads lorebook/knowledge/outline/draft files, retrieves the most relevant
 * chunks for a given query using local Ollama models (embedding + reranker).
 *
 * Modes:
 *   query    (default) — Retrieve top-K chunks for a query. Uses the
 *                         precomputed on-disk index when present, otherwise
 *                         re-embeds chunks on the fly.
 *   build              — Build or incrementally update the on-disk index.
 *                         Delegates to index-builder.mjs.
 *   status             — Print index status and exit.
 *
 * Pinning (v3.1):
 *   --pin-chapter N    Include chapter N's draft verbatim in the output
 *                      (bypasses the index; reads the file directly via
 *                      xml-draft-chunker.chunkWholeChapter).
 *   --pin-side SIDE    Which adjacent chapters to pin: 'previous', 'next',
 *                      'both'. Default: 'previous'. Resolves to:
 *                        previous → N-1 (and N if also requested)
 *                        next     → N+1
 *                        both     → N-1 and N+1
 *
 * Usage:
 *   bun lore-query.mjs [project-root] --query "..." [--top 5] [--rerank]
 *                      [--pin-chapter N] [--pin-side previous|next|both]
 *   bun lore-query.mjs [project-root] --build [--force]
 *   bun lore-query.mjs [project-root] --status
 *
 * Project root defaults to process.cwd().
 *
 * Outputs a formatted markdown block with the most relevant lore context
 * for injection into subagent prompts during outline/draft/critique/revise.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { loadIndex, buildIndex, printStatus, scanSources, chunkSource } from '../index-builder.mjs'
import { chunkWholeChapter, resolveDraftFilePath } from '../xml-draft-chunker.mjs'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const RERANK_MODEL = process.env.RERANK_MODEL || 'hans-tech/bge-reranker-v2-m3:260522'

// ─── Cosine Similarity ─────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        na += a[i] * a[i]
        nb += b[i] * b[i]
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// ─── Embedding ─────────────────────────────────────────────────────────────

async function getEmbedding(text) {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.EMBED_MODEL || 'pedrohml/mxbai-embed-large:latest', input: text }),
    })
    if (!res.ok) throw new Error(`Embed error: ${res.status} ${res.statusText}`)
    const data = await res.json()
    return data.embeddings[0]
}

// ─── Reranking ─────────────────────────────────────────────────────────────

/**
 * Rerank documents using a BGE-style reranker model via Ollama's /api/generate.
 *
 * Some Ollama versions don't expose a dedicated /api/rerank endpoint, so we
 * fall back to /api/generate with a prompt template that asks the model to
 * score each document's relevance. The BGE reranker template is documented at
 * https://huggingface.co/BAAI/bge-reranker-v2-m3 — we use the standard
 * "query: ... passage: ..." prefix.
 *
 * The prompt asks the model to print JSON; we parse out the scores. If
 * parsing fails or the model returns non-numeric output, the cosine scores
 * are used as-is (graceful degradation).
 */
async function rerank(query, documents) {
    const documentsList = documents.map((d, i) => `[${i}] ${d.text.slice(0, 500)}`).join('\n')
    const prompt = `You are a relevance scorer. Given a query and a list of documents, score each document's relevance to the query on a scale from 0.0 to 1.0. Output ONLY a JSON array of numbers, one per document, in the same order.

Query: ${query}

Documents:
${documentsList}

Scores (JSON array):`

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: RERANK_MODEL,
            prompt,
            stream: false,
            options: { temperature: 0.0 },
        }),
    })
    if (!res.ok) throw new Error(`Rerank error: ${res.status} ${res.statusText}`)
    const data = await res.json()
    const text = (data.response || '').trim()

    // Try to extract a JSON array of numbers
    const match = text.match(/\[[\d\s,\.\-eE]+\]/)
    if (!match) throw new Error(`Rerank model returned non-JSON output: ${text.slice(0, 100)}`)
    let scores
    try {
        scores = JSON.parse(match[0])
    } catch {
        throw new Error(`Rerank model returned unparseable JSON: ${match[0]}`)
    }
    if (!Array.isArray(scores) || scores.length !== documents.length) {
        throw new Error(`Rerank model returned ${scores.length} scores for ${documents.length} documents`)
    }

    return documents.map((d, i) => ({ ...d, score: scores[i] }))
}

// ─── Index-backed query ────────────────────────────────────────────────────

async function queryWithIndex(index, queryVec, topK, doRerank) {
    // Score every chunk in the index against the query vector
    const scored = []
    for (const chunk of index.chunks) {
        if (!chunk.embedding) continue
        const score = cosineSimilarity(queryVec, chunk.embedding)
        scored.push({ ...chunk, score })
    }
    scored.sort((a, b) => b.score - a.score)
    const candidates = scored.slice(0, doRerank ? topK * 3 : topK)
    if (doRerank && candidates.length > 1) {
        try {
            return await rerank(query, candidates)
        } catch (err) {
            console.error(`[lore-query] Rerank failed: ${err.message}`)
            console.error(`[lore-query] Is Ollama running with ${RERANK_MODEL}?`)
            return candidates
        }
    }
    return candidates
}

// ─── Fallback: re-embed on the fly (no index) ──────────────────────────────

async function queryWithoutIndex(projectRoot, query, topK, doRerank) {
    // Re-embed everything by walking sources again
    const sources = scanSources(projectRoot)
    const allChunks = []
    for (const source of sources) {
        const chunks = chunkSource(source, projectRoot)
        allChunks.push(...chunks)
    }
    if (allChunks.length === 0) return []

    let queryVec
    try {
        queryVec = await getEmbedding(query)
    } catch (err) {
        console.error(`[lore-query] Embedding failed: ${err.message}`)
        return []
    }

    const scored = []
    for (const chunk of allChunks) {
        try {
            const vec = await getEmbedding(chunk.text)
            scored.push({ ...chunk, score: cosineSimilarity(queryVec, vec) })
        } catch {
            // skip
        }
    }
    scored.sort((a, b) => b.score - a.score)
    const candidates = scored.slice(0, doRerank ? topK * 3 : topK)
    if (doRerank && candidates.length > 1) {
        try {
            return await rerank(query, candidates)
        } catch {
            return candidates
        }
    }
    return candidates
}

// ─── Pinned chapter resolution ─────────────────────────────────────────────

/**
 * Resolve a set of chapter numbers to pin given the --pin-chapter and
 * --pin-side flags. Returns an array of chapter numbers in N-1, N, N+1 order.
 *
 * @param {number} chapter
 * @param {'previous'|'next'|'both'} side
 * @returns {number[]}
 */
function resolvePins(chapter, side) {
    const pins = []
    if (side === 'previous' || side === 'both') {
        if (chapter - 1 >= 1) pins.push(chapter - 1)
    }
    if (side === 'next' || side === 'both') {
        pins.push(chapter + 1)
    }
    return pins
}

/**
 * Read pinned chapters from disk and return them as chunks to be prepended
 * to the query output.
 */
function loadPinnedChapters(projectRoot, chapterNumbers) {
    const pinned = []
    for (const n of chapterNumbers) {
        const filePath = resolveDraftFilePath(projectRoot, n)
        if (!filePath) continue
        const rel = filePath.slice(projectRoot.length + 1)
        pinned.push(chunkWholeChapter(filePath, rel, n))
    }
    return pinned
}

// ─── Output formatting ─────────────────────────────────────────────────────

function formatOutput(query, pinned, semantic, topK) {
    const lines = []
    lines.push('## 📚 Relevant Lore Context')
    lines.push('')
    lines.push(`*Retrieved for query: "${query}"*`)
    lines.push(`*Source: series lorebook + per-book knowledge + outline + drafts*`)
    if (pinned.length > 0) {
        const labels = pinned.map(p => p.sourcePath || p.source).join(', ')
        lines.push(`*Pinned (adjacent chapters, verbatim for continuity): ${labels}*`)
    }
    lines.push(`*Semantic top-${Math.min(semantic.length, topK)} (relevance: ${semantic.slice(0, topK).map(c => `${(c.score * 100).toFixed(0)}%`).join(', ')})*`)
    lines.push('')
    lines.push('---')
    lines.push('')

    for (const chunk of pinned) {
        const src = chunk.sourcePath || chunk.source
        lines.push(`**From: \`${src}\`**  (PINNED — verbatim for continuity)`)
        lines.push('')
        lines.push('```xml')
        lines.push(chunk.text)
        lines.push('```')
        lines.push('')
    }

    for (const chunk of semantic.slice(0, topK)) {
        lines.push(`**From: \`${chunk.sourcePath}${chunk.heading ? '#' + chunk.heading : ''}\`**  (relevance: ${(chunk.score * 100).toFixed(0)}%)`)
        lines.push('')
        const fence = chunk.kind === 'draft' ? 'xml' : 'markdown'
        lines.push('```' + fence)
        lines.push(chunk.text)
        lines.push('```')
        lines.push('')
    }

    lines.push('---')
    lines.push('*End of relevant lore context*')
    lines.push('')
    return lines.join('\n')
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2)
    let projectRoot = process.cwd()
    let query = ''
    let topK = 5
    let doRerank = false
    let mode = 'query' // 'query' | 'build' | 'status'
    let force = false
    let pinChapter = null
    let pinSide = 'previous'

    for (let i = 0; i < args.length; i++) {
        const a = args[i]
        if (a === '--query') {
            query = args[++i] || ''
        } else if (a === '--top') {
            topK = parseInt(args[++i], 10) || 5
        } else if (a === '--rerank') {
            doRerank = true
        } else if (a === '--build') {
            mode = 'build'
        } else if (a === '--status') {
            mode = 'status'
        } else if (a === '--force') {
            force = true
        } else if (a === '--pin-chapter') {
            pinChapter = parseInt(args[++i], 10) || null
        } else if (a === '--pin-side') {
            pinSide = args[++i] || 'previous'
        } else if (!a.startsWith('--') && !query) {
            projectRoot = resolve(a)
        }
    }

    // ── build / status modes ──
    if (mode === 'build') {
        return buildIndex(projectRoot, { force })
    }
    if (mode === 'status') {
        return printStatus(projectRoot)
    }

    // ── query mode ──
    if (!query) {
        console.error('Usage: bun lore-query.mjs [project-root] --query "..." [--top N] [--rerank]')
        console.error('       bun lore-query.mjs [project-root] --build [--force]')
        console.error('       bun lore-query.mjs [project-root] --status')
        process.exit(1)
    }

    // Load index (if present)
    const index = loadIndex(projectRoot)
    if (!index) {
        console.error('[lore-query] No precomputed index found. Run `npx kombinat-index` to build one for faster retrieval. Continuing with on-the-fly embedding...')
    }

    // Load pinned chapters (always from disk, not from index)
    const pinned = pinChapter ? loadPinnedChapters(projectRoot, resolvePins(pinChapter, pinSide)) : []

    // Get query embedding
    let queryVec
    try {
        queryVec = await getEmbedding(query)
    } catch (err) {
        console.error(`[lore-query] Embedding failed: ${err.message}`)
        console.error('[lore-query] Is Ollama running? Falling back to lore-context.ts full-file read.')
        console.log('')
        return
    }

    // Score chunks
    let semantic
    if (index) {
        semantic = await queryWithIndex(index, queryVec, topK, doRerank)
    } else {
        semantic = await queryWithoutIndex(projectRoot, query, topK, doRerank)
    }

    console.log(formatOutput(query, pinned, semantic, topK))
}

main().catch(err => {
    console.error(`[lore-query] Fatal: ${err.message}`)
    console.log('')
    process.exit(0) // Exit 0 so the caller doesn't hard-crash on lore failures
})
