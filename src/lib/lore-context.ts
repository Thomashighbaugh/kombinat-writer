/**
 * Lore Context Injector
 *
 * Reads all available lorebook and knowledge files and returns a formatted
 * context block that phase specs can reference. The executing AI subagent
 * should load this context at the start of any content-generating phase
 * (outline, draft, critique, revise, review, specify, clarify, constitute).
 *
 * Lore sources (checked in order, all that exist are included):
 *   1. Series lorebook  → ./series/lorebook/*
 *   2. Per-book knowledge → ./book/knowledge/*
 *
 * Usage from a spec:
 *   1. Read this module's output with: bash `node src/lib/lore-context.js`
 *   2. OR read each lore file directly with bash `cat`
 */

import fs from 'fs-extra'
import path from 'path'

export interface LoreContextResult {
  /** Whether any lore was found */
  hasLore: boolean
  /** Formatted markdown block for injection into agent prompts */
  markdown: string
  /** Individual file contents keyed by relative path */
  files: Record<string, string>
  /** Warnings (e.g. file exists but is empty) */
  warnings: string[]
}

/** Paths to scan, in priority order (series first, then per-book) */
const LORE_PATHS: Array<{ prefix: string; pattern: string }> = [
  { prefix: 'series/lorebook', pattern: 'characters.md' },
  { prefix: 'series/lorebook', pattern: 'world.md' },
  { prefix: 'series/lorebook', pattern: 'glossary.md' },
  { prefix: 'series/lorebook', pattern: 'timeline.json' },
  { prefix: 'series/lorebook', pattern: 'threads.md' },
  { prefix: 'book/knowledge',  pattern: 'character-profiles.md' },
  { prefix: 'book/knowledge',  pattern: 'voice-profiles.json' },
  { prefix: 'book/knowledge',  pattern: 'locations.md' },
  { prefix: 'book/knowledge',  pattern: 'world-rules.md' },
]

/**
 * Scan project root and collect all available lore content.
 * Returns a formatted context block and per-file contents.
 */
export function loadLoreContext(projectRoot: string): LoreContextResult {
  const files: Record<string, string> = {}
  const warnings: string[] = []

  for (const entry of LORE_PATHS) {
    const fullPath = path.join(projectRoot, entry.prefix, entry.pattern)
    const relativePath = `${entry.prefix}/${entry.pattern}`
    if (!fs.existsSync(fullPath)) continue

    try {
      const stat = fs.statSync(fullPath)
      if (stat.size === 0) {
        warnings.push(`${relativePath} exists but is empty`)
        continue
      }

      const content = fs.readFileSync(fullPath, 'utf-8').trim()
      if (!content) {
        warnings.push(`${relativePath} exists but is empty after trimming`)
        continue
      }

      files[relativePath] = content
    } catch (err) {
      warnings.push(`${relativePath}: could not read — ${(err as Error).message}`)
    }
  }

  const hasLore = Object.keys(files).length > 0

  // Build formatted markdown block
  const lines: string[] = []
  if (hasLore) {
    lines.push('## 📚 Lorebook Context')
    lines.push('')
    lines.push('The following lore files exist for this project. Read them carefully — they contain canonical information about characters, world, and setting that MUST be respected during generation. If the outline, specification, or draft contradicts the lorebook, the lorebook takes precedence.')
    lines.push('')

    for (const [relPath, content] of Object.entries(files)) {
      lines.push(`### ${relPath}`)
      lines.push('')
      lines.push('```' + (relPath.endsWith('.json') ? 'json' : 'markdown'))
      lines.push(content)
      lines.push('```')
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  return { hasLore, markdown: lines.join('\n'), files, warnings }
}
