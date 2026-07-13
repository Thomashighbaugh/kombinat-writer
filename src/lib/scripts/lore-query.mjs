#!/usr/bin/env bun
/**
 * Lore Query — Semantic Lorebook Retriever
 *
 * Reads lorebook/knowledge files, chunks them, retrieves the most relevant
 * chunks for a given query using local Ollama models (embedding + reranker).
 *
 * Usage:
 *   bun lore-query.mjs [project-root] --query "..." [--top 5] [--rerank]
 *
 * Project root defaults to process.cwd().
 * Pass --rerank to additionally score results with bge-reranker-v2-m3.
 *
 * Outputs a formatted markdown block with the most relevant lore context
 * for injection into subagent prompts during outline/draft/critique/revise.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const EMBED_MODEL = process.env.EMBED_MODEL || 'pedrohml/mxbai-embed-large:latest'
const RERANK_MODEL = process.env.RERANK_MODEL || 'hans-tech/bge-reranker-v2-m3:260522'

// ─── Chunking ─────────────────────────────────────────────────────────────

/**
 * Split markdown/text into semantic chunks.
 * For markdown, splits on ## headings (each section is a chunk).
 * For JSON, keeps the whole file as one chunk.
 * For plain text, splits on paragraphs (double newlines).
 */
function chunkContent(content, sourcePath) {
  const chunks = []

  if (sourcePath.endsWith('.json')) {
    chunks.push({ text: content, source: sourcePath })
    return chunks
  }

  // Try ## heading split first
  const headingRegex = /^## (.+)$/gm
  let lastIndex = 0
  let lastHeading = '(header)'
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingRegex)
    if (match && i > 0) {
      // Emit previous chunk
      const chunkText = lines.slice(lastIndex, i).join('\n').trim()
      if (chunkText.length > 20) {
        chunks.push({ text: chunkText, source: `${sourcePath}#${lastHeading}` })
      }
      lastIndex = i
      lastHeading = lines[i].replace(/^## /, '').trim()
    }
  }

  // Last chunk
  const remaining = lines.slice(lastIndex).join('\n').trim()
  if (remaining.length > 20) {
    chunks.push({ text: remaining, source: `${sourcePath}#${lastHeading}` })
  }

  // Fallback: if no headings found, split by paragraphs
  if (chunks.length <= 1) {
    chunks.length = 0
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20)
    for (const p of paragraphs) {
      chunks.push({ text: p.trim(), source: sourcePath })
    }
  }

  // If still nothing useful, return the whole thing as one chunk
  if (chunks.length === 0 && content.trim().length > 0) {
    chunks.push({ text: content.trim(), source: sourcePath })
  }

  return chunks
}

// ─── Lore File Scanner ────────────────────────────────────────────────────

const LORE_PATTERNS = [
  'series/lorebook/characters.md',
  'series/lorebook/world.md',
  'series/lorebook/glossary.md',
  'series/lorebook/timeline.json',
  'series/lorebook/threads.md',
  'book/knowledge/character-profiles.md',
  'book/knowledge/voice-profiles.json',
  'book/knowledge/locations.md',
  'book/knowledge/world-rules.md',
]

function scanLoreFiles(projectRoot) {
  const files = []
  for (const pattern of LORE_PATTERNS) {
    const fullPath = join(projectRoot, pattern)
    if (!existsSync(fullPath)) continue
    const content = readFileSync(fullPath, 'utf-8').trim()
    if (!content) continue
    files.push({ path: pattern, content })
  }
  return files
}

// ─── Embedding ────────────────────────────────────────────────────────────

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

// ─── Cosine Similarity ───────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// ─── Reranking ────────────────────────────────────────────────────────────

async function rerank(query, documents) {
  const res = await fetch(`${OLLAMA_URL}/api/rerank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: RERANK_MODEL,
      query,
      documents: documents.map(d => d.text),
    }),
  })
  if (!res.ok) throw new Error(`Rerank error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  // data.results is array of { index, relevance_score, ... }
  return data.results.map(r => ({
    ...documents[r.index],
    score: r.relevance_score || r.score || 0,
  }))
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  let projectRoot = process.cwd()
  let query = ''
  let topK = 5
  let doRerank = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--query') {
      query = args[++i] || ''
    } else if (args[i] === '--top') {
      topK = parseInt(args[++i], 10) || 5
    } else if (args[i] === '--rerank') {
      doRerank = true
    } else if (!args[i].startsWith('--') && !query) {
      // First non-flag argument is project root
      projectRoot = resolve(args[i])
    }
  }

  if (!query) {
    console.error('Usage: bun lore-query.mjs [project-root] --query "..." [--top N] [--rerank]')
    process.exit(1)
  }

  // 1. Scan lore files
  const loreFiles = scanLoreFiles(projectRoot)
  if (loreFiles.length === 0) {
    // No lore found — output empty block
    console.log('')
    return
  }

  // 2. Chunk
  const allChunks = []
  for (const file of loreFiles) {
    const chunks = chunkContent(file.content, file.path)
    allChunks.push(...chunks)
  }

  if (allChunks.length === 0) {
    console.log('')
    return
  }

  // 3. Embed query
  let queryVec
  try {
    queryVec = await getEmbedding(query)
  } catch (err) {
    console.error(`[lore-query] Embedding failed: ${err.message}`, file.fd)
    console.error('[lore-query] Is Ollama running with pedrohml/mxbai-embed-large?')
    console.log('')
    return
  }

  // 4. Score chunks by cosine similarity
  const scored = []
  for (const chunk of allChunks) {
    try {
      const vec = await getEmbedding(chunk.text)
      const score = cosineSimilarity(queryVec, vec)
      scored.push({ ...chunk, score })
    } catch {
      // Skip chunks that fail embedding
    }
  }

  // 5. Sort by score descending, take topK * 2 for rerank candidate pool
  scored.sort((a, b) => b.score - a.score)
  const candidates = scored.slice(0, doRerank ? topK * 3 : topK)

  // 6. Optionally rerank
  let results = candidates
  if (doRerank && candidates.length > 1) {
    try {
      results = await rerank(query, candidates)
    } catch (err) {
      console.error(`[lore-query] Rerank failed: ${err.message}`, file.fd)
      console.error('[lore-query] Is Ollama running with hans-tech/bge-reranker-v2-m3?')
      // Fall back to cosine scores
    }
  }

  // Sort by final score descending
  results.sort((a, b) => (b.score || 0) - (a.score || 0))
  const top = results.slice(0, topK)

  // 7. Output formatted markdown
  const lines = []
  lines.push('## 📚 Relevant Lore Context')
  lines.push('')
  lines.push(`*Retrieved for query: "${query}"*`)
  lines.push('*Source: series lorebook + per-book knowledge files*')
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const chunk of top) {
    lines.push(`**From: \`${chunk.source}\`**  (relevance: ${(chunk.score * 100).toFixed(0)}%)`)
    lines.push('')
    lines.push('```markdown')
    lines.push(chunk.text)
    lines.push('```')
    lines.push('')
  }

  lines.push('---')
  lines.push('*End of relevant lore context*')
  lines.push('')

  console.log(lines.join('\n'))
}

main().catch(err => {
  console.error(`[lore-query] Fatal: ${err.message}`)
  console.log('')
  process.exit(0) // Exit 0 so the caller doesn't hard-crash on lore failures
})
