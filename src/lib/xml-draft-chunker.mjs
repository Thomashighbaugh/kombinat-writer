#!/usr/bin/env node
/**
 * XML Draft Chunker — splits kombinat XML drafts into semantic chunks
 *
 * The kombinat draft schema is structurally nested, not prose. The markdown
 * chunker doesn't know what a <scene> or <awareness-map> is, so it falls
 * through to "whole file = one chunk" — which is too coarse for semantic
 * search (a 3500-word chapter becomes one giant vector).
 *
 * This chunker recognizes the four useful chunk kinds in a draft:
 *   1. metadata   — chapter-level who/where/when (POV, setting, time, chars)
 *   2. awareness  — cross-chapter refs (sets-up, payoff-from, continuity anchors)
 *   3. scene      — one chunk per <scene> element
 *   4. whole-chapter — the entire raw file (used only by the pinned path)
 *
 * Schema notes:
 *   - <scene> with a number="N" attribute is a numbered scene.
 *   - <scene continuation="true" ...> (no number) is a continuation scene that
 *     follows the previous numbered scene. The chunker infers a sequential
 *     number (4, 5, 6, 7, ...) for these so the agent sees 7 scene chunks
 *     for a 7-scene chapter, not 3 + 1. Continuation scenes are marked
 *     `continuation: true` in the chunk metadata.
 *
 * Schema (v1) — see test-kombinat/book/drafts/ for examples:
 *
 *   <chapter number="N" title="..." pacing="..." word-target="...">
 *     <metadata>
 *       <outline-purpose>...</outline-purpose>
 *       <pov>...</pov>
 *       <setting>...</setting>
 *       <time>...</time>
 *       <characters-present>...</characters-present>
 *       <plot-threads-advanced>...</plot-threads-advanced>
 *     </metadata>
 *     <awareness-map>
 *       <sets-up ref="ChM: ...">text</sets-up>
 *       <payoff-from ref="ChM: ...">text</payoff-from>
 *       <continuity-anchors>
 *         <anchor name="...">text</anchor>
 *       </continuity-anchors>
 *     </awareness-map>
 *     <scene number="K" type="..." goal="..." conflict="...">
 *       <narration register="..." sensory-focus="...">prose</narration>
 *       <interiority character="..." emotion="..." thought="..." />
 *       <sensory-inject type="...">text</sensory-inject>
 *       <beatchange from="..." to="..." trigger="..." />
 *       <action beat="..." significance="..." />
 *       <dialogue>...</dialogue>
 *     </scene>
 *     <scene continuation="true" type="..." goal="..." conflict="...">
 *       ...same children as above...
 *     </scene>
 *   </chapter>
 *
 * The chunker is permissive: missing <metadata> or <awareness-map> blocks
 * are skipped silently; unknown <scene> children are flattened to text;
 * <anchor> without a name attribute is dropped; malformed ref attributes
 * are kept as raw text. This means a slightly different draft schema still
 * works — the chunker just emits less.
 */

import { readFileSync, existsSync } from 'fs'
import { XMLParser } from 'fast-xml-parser'

const LARGE_FILE_WARNING_BYTES = 100 * 1024 // 100 KB

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: false,
    trimValues: true,
    textNodeName: '#text',
    parseAttributeValue: false,
    isArray: (name) => ['sets-up', 'payoff-from', 'anchor', 'scene', 'sensory-inject', 'beatchange', 'action'].includes(name),
})

/**
 * Chunk an XML draft into metadata/awareness/scene chunks.
 *
 * @param {string} xmlText Raw XML file content
 * @param {string} sourcePath Relative path for chunk source labels
 * @param {number} chapterNumber Chapter number (from filename)
 * @returns {Array<{
 *   text: string,
 *   source: string,
 *   chunkKind: 'metadata' | 'awareness' | 'scene' | 'whole-chapter',
 *   chapterNumber: number,
 *   sceneNumber?: number,
 * }>}
 */
export function chunkXmlDraft(xmlText, sourcePath, chapterNumber) {
    if (xmlText.length > LARGE_FILE_WARNING_BYTES) {
        console.warn(`[xml-draft-chunker] ${sourcePath} is unusually large (${(xmlText.length / 1024).toFixed(0)} KB); semantic similarity will be coarse for whole-chapter lookups.`)
    }

    const chunks = []
    const parsed = parser.parse(xmlText)
    const chapter = parsed.chapter
    if (!chapter) {
        // Couldn't find <chapter> root. Fall back to whole file.
        chunks.push({
            text: xmlText.trim(),
            source: sourcePath,
            chunkKind: 'whole-chapter',
            chapterNumber,
        })
        return chunks
    }

    const title = chapter['@_title'] || ''
    const wordTarget = chapter['@_word-target'] || ''
    const pacing = chapter['@_pacing'] || ''

    // ── 1. metadata chunk ──────────────────────────────────────────────────
    const meta = chapter.metadata
    if (meta) {
        const metaLines = []
        metaLines.push(`Chapter ${chapterNumber}${title ? ` — ${title}` : ''}${pacing ? ` (pacing: ${pacing})` : ''}${wordTarget ? ` (target: ${wordTarget} words)` : ''}.`)
        if (meta['outline-purpose']) metaLines.push(`Purpose: ${textOf(meta['outline-purpose'])}.`)
        if (meta.pov) metaLines.push(`POV: ${textOf(meta.pov)}.`)
        if (meta.setting) metaLines.push(`Setting: ${textOf(meta.setting)}.`)
        if (meta.time) metaLines.push(`Time: ${textOf(meta.time)}.`)
        if (meta['characters-present']) metaLines.push(`Characters present: ${textOf(meta['characters-present'])}.`)
        if (meta['plot-threads-advanced']) metaLines.push(`Plot threads advanced: ${textOf(meta['plot-threads-advanced'])}.`)
        const metaText = metaLines.join(' ')
        if (metaText.length > 20) {
            chunks.push({
                text: metaText,
                source: `${sourcePath}#metadata`,
                chunkKind: 'metadata',
                chapterNumber,
            })
        }
    }

    // ── 2. awareness chunk ─────────────────────────────────────────────────
    const am = chapter['awareness-map']
    if (am) {
        const amLines = []
        const setsUp = arr(am['sets-up'])
        for (const s of setsUp) {
            const ref = s['@_ref'] || 'unknown'
            amLines.push(`Sets up ${ref}: ${textOf(s)}.`)
        }
        const payoffs = arr(am['payoff-from'])
        for (const p of payoffs) {
            const ref = p['@_ref'] || 'unknown'
            amLines.push(`Payoff from ${ref}: ${textOf(p)}.`)
        }
        const anchors = arr(am['continuity-anchors'] && am['continuity-anchors'].anchor)
        for (const a of anchors) {
            const name = a['@_name']
            if (!name) continue
            amLines.push(`Continuity anchor "${name}": ${textOf(a)}.`)
        }
        const amText = amLines.join(' ')
        if (amText.length > 20) {
            chunks.push({
                text: amText,
                source: `${sourcePath}#awareness-map`,
                chunkKind: 'awareness',
                chapterNumber,
            })
        }
    }

    // ── 3. scene chunks ────────────────────────────────────────────────────
    const scenes = arr(chapter.scene)
    let inferredSceneNum = 0
    for (const scene of scenes) {
        const rawNum = scene['@_number']
        const isContinuation = scene['@_continuation'] === 'true' || scene['@_continuation'] === true
        // Numbered scenes use their explicit number. Continuation scenes
        // (which have no number attribute) are inferred sequentially: the
        // first continuation after scene N is N+1, the next is N+2, etc.
        // This ensures a 7-scene chapter always produces 7 scene chunks.
        let sceneNum
        if (rawNum != null) {
            sceneNum = String(rawNum)
            inferredSceneNum = parseInt(rawNum, 10) || inferredSceneNum
        } else if (isContinuation) {
            inferredSceneNum += 1
            sceneNum = String(inferredSceneNum)
        } else {
            // Unnumbered and not flagged as continuation — treat as a new
            // scene with an inferred number, but don't advance the counter
            // because we can't tell if more continuation scenes follow.
            sceneNum = String(inferredSceneNum + 1) + '*'
        }
        const sceneType = scene['@_type'] || ''
        const goal = scene['@_goal'] || ''
        const conflict = scene['@_conflict'] || ''
        const sceneLines = []
        sceneLines.push(`Chapter ${chapterNumber}${title ? ` — ${title}` : ''}, Scene ${sceneNum}${sceneType ? ` (${sceneType})` : ''}.`)
        if (goal) sceneLines.push(`Goal: ${goal}.`)
        if (conflict) sceneLines.push(`Conflict: ${conflict}.`)

        const narration = scene.narration
        if (narration) {
            const reg = narration['@_register'] ? ` [register: ${narration['@_register']}]` : ''
            const sens = narration['@_sensory-focus'] ? ` [sensory: ${narration['@_sensory-focus']}]` : ''
            const narText = textOf(narration)
            if (narText) sceneLines.push(`Narration${reg}${sens}: ${narText}`)
        }

        const interiors = arr(scene.interiority)
        for (const i of interiors) {
            const ch = i['@_character'] || 'unknown'
            const em = i['@_emotion'] ? ` [emotion: ${i['@_emotion']}]` : ''
            const thought = textOf(i)
            if (thought) sceneLines.push(`Interiority (${ch})${em}: ${thought}`)
        }

        const sjs = arr(scene['sensory-inject'])
        for (const s of sjs) {
            const t = s['@_type'] || 'sense'
            sceneLines.push(`Sensory inject (${t}): ${textOf(s)}`)
        }

        const bcs = arr(scene.beatchange)
        for (const b of bcs) {
            sceneLines.push(`Beat change: ${b['@_from']} → ${b['@_to']} (trigger: ${b['@_trigger'] || 'unspecified'})`)
        }

        const actions = arr(scene.action)
        for (const a of actions) {
            const beat = a['@_beat'] || ''
            const sig = a['@_significance'] || ''
            sceneLines.push(`Action: ${beat}${sig ? ` — ${sig}` : ''}`)
        }

        const dialogues = arr(scene.dialogue)
        for (const d of dialogues) {
            sceneLines.push(`Dialogue: ${textOf(d)}`)
        }

        // Fallback: if scene has no recognized children, concatenate all text
        if (sceneLines.length === 1) {
            const fallback = collectAllText(scene)
            if (fallback.length > 20) sceneLines.push(fallback)
        }

        const sceneText = sceneLines.join(' ')
        if (sceneText.length > 20) {
            const parsedSceneNum = parseInt(sceneNum, 10)
            chunks.push({
                text: sceneText,
                source: `${sourcePath}#scene-${sceneNum}`,
                chunkKind: 'scene',
                chapterNumber,
                sceneNumber: isNaN(parsedSceneNum) ? null : parsedSceneNum,
                continuation: isContinuation,
            })
        }
    }

    return chunks
}

/**
 * Chunk an XML draft from disk and return chunks. Convenience wrapper.
 *
 * @param {string} filePath Absolute path
 * @param {string} sourcePath Relative path for chunk source labels
 * @param {number} chapterNumber Chapter number (from filename)
 * @returns {Array}
 */
export function chunkXmlDraftFile(filePath, sourcePath, chapterNumber) {
    const content = readFileSync(filePath, 'utf-8')
    return chunkXmlDraft(content, sourcePath, chapterNumber)
}

/**
 * Return the entire raw XML as a single "whole-chapter" chunk. Used by the
 * pinned path in lore-query.mjs — the agent needs the entire prior chapter
 * verbatim for continuity, not a per-scene slice.
 *
 * @param {string} filePath Absolute path
 * @param {string} sourcePath Relative path
 * @param {number} chapterNumber Chapter number
 * @returns {{text: string, source: string, chunkKind: 'whole-chapter', chapterNumber: number}}
 */
export function chunkWholeChapter(filePath, sourcePath, chapterNumber) {
    const content = readFileSync(filePath, 'utf-8').trim()
    return {
        text: content,
        source: sourcePath,
        chunkKind: 'whole-chapter',
        chapterNumber,
    }
}

/**
 * Resolve a chapter number to its draft file path under a project root.
 * Uses the test-kombinat convention: book/drafts/chapter_NNNNN.xml
 * (5-digit zero-padded).
 *
 * @param {string} projectRoot Absolute path
 * @param {number} chapterNumber
 * @returns {string|null} Absolute file path, or null if no file exists
 */
export function resolveDraftFilePath(projectRoot, chapterNumber) {
    const padded = String(chapterNumber).padStart(5, '0')
    const p = `${projectRoot}/book/drafts/chapter_${padded}.xml`
    return existsSync(p) ? p : null
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Extract text from an XML node (handles text-only nodes and nodes with mixed content). */
function textOf(node) {
    if (node == null) return ''
    if (typeof node === 'string') return node.trim()
    if (typeof node === 'number' || typeof node === 'boolean') return String(node)
    if (typeof node === 'object') {
        // fast-xml-parser puts the text under '#text' for nodes with attributes
        if (typeof node['#text'] === 'string') return node['#text'].trim()
        // Or the node itself is a text-bearing object with child text fields
        return collectAllText(node)
    }
    return ''
}

/** Recursively collect all text content from a node tree. */
function collectAllText(node) {
    if (node == null) return ''
    if (typeof node === 'string') return node
    if (typeof node !== 'object') return String(node)
    let out = ''
    for (const [k, v] of Object.entries(node)) {
        if (k.startsWith('@_')) continue // skip attributes
        if (k === '#text' && typeof v === 'string') out += v + ' '
        else if (Array.isArray(v)) {
            for (const item of v) out += collectAllText(item) + ' '
        } else if (typeof v === 'object') {
            out += collectAllText(v) + ' '
        } else if (typeof v === 'string') {
            out += v + ' '
        }
    }
    return out.trim()
}

/** Coerce a value to an array. fast-xml-parser with isArray only returns arrays for known tags, so a single child comes as an object, not an array. */
function arr(v) {
    if (v == null) return []
    if (Array.isArray(v)) return v
    return [v]
}
