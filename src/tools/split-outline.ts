/**
 * splitOutline — Tool wrapper for the outline splitter library.
 *
 * The agent calls this after saving ./book/outline.md during the
 * /kombinat outline phase, or as a recovery action if per-chapter
 * files are missing.
 *
 * The tool is a thin wrapper around the library so it can be invoked
 * from the TUI agent context (which has tool dispatch) rather than
 * the user running it from a terminal.
 */

import { tool } from "@opencode-ai/plugin"
import { splitOutline } from "../lib/outline-splitter.js"
import path from "path"
import os from "os"

export default tool({
  description:
    "Split ./book/outline.md into per-chapter files (./book/outline/chapter_NN.md) and a machine-readable _index.json. Use after the outline phase, when per-chapter files are missing, or after hand-editing outline.md. The outline.md is the source of truth — per-chapter files are a derivable cache.",
  args: {
    track: tool.schema.enum(['fiction', 'non-fiction', 'mixed']).optional().describe("Book track — affects file naming. Default: fiction"),
    unit: tool.schema.enum(['chapter', 'section']).optional().describe("Structural unit. 'chapter' for fiction, 'section' for non-fiction. Default inferred from track."),
    projectRoot: tool.schema.string().optional().describe("Absolute path to the project root. Default: process.cwd()"),
    dryRun: tool.schema.boolean().optional().describe("Parse and report without writing files. Default: false"),
  },
  async execute(args) {
    const projectRoot = args.projectRoot ?? process.cwd()
    const result = await splitOutline(projectRoot, {
      track: args.track,
      unit: args.unit,
      dryRun: args.dryRun,
    })

    const outDir = path.join(projectRoot, 'book', 'outline')
    return [
      `✓ Split outline into ${String(result.chapters)} chapter files at ${outDir}/`,
      ``,
      `Files written:`,
      ...result.filesWritten.map(f => `  - ${f}`),
      ``,
      `Index summary:`,
      `  Total chapters: ${String(result.index.total_chapters)}`,
      `  Track: ${result.index.track}`,
      `  Unit: ${result.index.unit}`,
      `  Generated: ${result.index.generated_at}`,
      ``,
      `Chapters in index:`,
      ...result.index.chapters.map(c =>
        `  ${String(c.number).padStart(2, '0')}. ${c.title} → ${c.file}` +
        (c.pacing ? ` [${c.pacing}]` : '') +
        (c.arc ? ` (${c.arc})` : '')
      ),
    ].join('\n')
  },
})
