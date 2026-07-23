#!/usr/bin/env node
/**
 * Markdown Chunker — splits markdown/text files into semantic chunks
 *
 * Extracted from lore-query.mjs so it can be reused by both the runtime
 * query path (fallback when no on-disk index exists) and the index-builder
 * (when building the index from scratch).
 *
 * Chunking strategy:
 *   1. JSON files → keep the whole file as one chunk (don't split structured data)
 *   2. Markdown files → split on `## ` headings (each section is a chunk)
 *   3. Fallback: split on paragraph boundaries (double newlines)
 *   4. Last resort: whole file as one chunk
 *
 * For the index-builder, the markdown chunker is used for these source kinds:
 *   - lore       (series/lorebook/*, book/knowledge/*)
 *   - outline    (series/outline.md, book/outline.md, book/outline/chapter_*.md)
 *   - canon      (book/manifest.md)
 *   - spec       (book/specification.md)
 *
 * XML drafts use a separate chunker (xml-draft-chunker.mjs) that knows the
 * draft schema.
 */

import { readFileSync } from 'fs'

const MIN_CHUNK_LENGTH = 20

/**
 * Split markdown/text into semantic chunks.
 *
 * @param {string} content The file's text content
 * @param {string} sourcePath Relative path used for chunk source labels
 * @returns {Array<{text: string, source: string}>}
 */
export function chunkMarkdown(content, sourcePath) {
    const chunks = []

    // JSON: keep whole file as one chunk
    if (sourcePath.endsWith('.json')) {
        if (content.trim().length > 0) {
            chunks.push({ text: content.trim(), source: sourcePath })
        }
        return chunks
    }

    // Markdown: try ## heading split first
    const headingRegex = /^## (.+)$/gm
    const lines = content.split('\n')

    if (hasMarkdownHeadings(lines)) {
        let lastIndex = 0
        let lastHeading = '(header)'
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(headingRegex)
            if (match && i > 0) {
                const chunkText = lines.slice(lastIndex, i).join('\n').trim()
                if (chunkText.length > MIN_CHUNK_LENGTH) {
                    chunks.push({ text: chunkText, source: `${sourcePath}#${lastHeading}` })
                }
                lastIndex = i
                lastHeading = lines[i].replace(/^## /, '').trim()
            }
        }
        const remaining = lines.slice(lastIndex).join('\n').trim()
        if (remaining.length > MIN_CHUNK_LENGTH) {
            chunks.push({ text: remaining, source: `${sourcePath}#${lastHeading}` })
        }
    }

    // Fallback: paragraph split
    if (chunks.length <= 1) {
        chunks.length = 0
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > MIN_CHUNK_LENGTH)
        for (const p of paragraphs) {
            chunks.push({ text: p.trim(), source: sourcePath })
        }
    }

    // Last resort: whole file
    if (chunks.length === 0 && content.trim().length > 0) {
        chunks.push({ text: content.trim(), source: sourcePath })
    }

    return chunks
}

/**
 * Chunk a file by reading it from disk. Convenience wrapper.
 *
 * @param {string} filePath Absolute path to the file
 * @param {string} sourcePath Relative path used for chunk source labels
 * @returns {Array<{text: string, source: string}>}
 */
export function chunkMarkdownFile(filePath, sourcePath) {
    const content = readFileSync(filePath, 'utf-8')
    return chunkMarkdown(content, sourcePath)
}

/**
 * Detect whether a file's line array contains any markdown `## ` headings.
 *
 * @param {string[]} lines
 * @returns {boolean}
 */
function hasMarkdownHeadings(lines) {
    return lines.some(l => /^## .+/.test(l))
}

/**
 * Determine the source kind from a relative path. Returns one of:
 * 'lore' | 'outline' | 'canon' | 'spec' | 'draft' | 'unknown'
 *
 * Used by index-builder.mjs to dispatch to the right chunker.
 *
 * @param {string} relPath Posix-style relative path
 * @returns {string}
 */
export function classifySourceKind(relPath) {
    relPath = relPath.replace(/\\/g, '/')
    if (relPath.includes('/lorebook/')) return 'lore'
    if (relPath.includes('/knowledge/')) return 'lore'
    if (relPath.startsWith('series/outline') || relPath.startsWith('series/lorebook')) return 'outline'
    if (relPath.startsWith('book/outline')) return 'outline'
    if (relPath === 'book/manifest.md') return 'canon'
    if (relPath === 'book/specification.md') return 'spec'
    if (relPath.startsWith('book/drafts/') && relPath.endsWith('.xml')) return 'draft'
    return 'unknown'
}
