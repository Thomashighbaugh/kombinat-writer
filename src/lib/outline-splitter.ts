/**
 * Outline splitter — converts ./book/outline.md into per-chapter files.
 *
 * Used by:
 *   1. The outline phase of /kombinat (after writing outline.md, this
 *      function is called to produce ./book/outline/chapter_NN.md and
 *      ./book/outline/_index.json).
 *   2. Disaster recovery: if per-chapter files or the index are ever lost,
 *      re-run this against the canonical ./book/outline.md to re-derive them.
 *
 * The function is pure and idempotent: running it twice on the same input
 * produces the same output. It does NOT touch ./book/outline.md.
 *
 * Output structure (created if missing):
 *
 *   ./book/outline/
 *     _index.json            # machine-readable chapter manifest
 *     chapter_01.md          # per-chapter file, zero-padded
 *     chapter_02.md
 *     ...
 *     chapter_NN.md
 *
 * For non-fiction, output filenames use `section_NN.md` instead of
 * `chapter_NN.md`. Pass `unit: 'section'` to switch.
 */

import fs from 'fs-extra';
import path from 'path';

export type OutlineUnit = 'chapter' | 'section';

export interface OutlineChapterMeta {
  /** 1-based chapter/section number */
  number: number;
  /** Title as parsed from the heading (may include "The Cave" or other prose) */
  title: string;
  /** Filename relative to ./book/outline/ — e.g. "chapter_01.md" */
  file: string;
  /** Pacing tag parsed from the chapter entry, if present */
  pacing?: string;
  /** Arc name parsed from the nearest preceding "## Arc" or "## Part" heading */
  arc?: string;
  /** Characters present, if declared in the chapter entry */
  characters: string[];
  /** Order in the document (0-based) — used to preserve authoring order */
  order: number;
}

export interface OutlineIndex {
  version: 1;
  generated_at: string;
  track: 'fiction' | 'non-fiction' | 'mixed';
  unit: OutlineUnit;
  total_chapters: number;
  chapters: OutlineChapterMeta[];
  source_outline: string;
}

export interface SplitResult {
  index: OutlineIndex;
  filesWritten: string[];
  chapters: number;
}

/**
 * Parse a chapter/section heading line.
 *
 * Accepts:
 *   "### Chapter 1: The Cave"
 *   "## Chapter 12 — The Reckoning"
 *   "### Section 3. Methodology"
 *   "## Part 2, Chapter 5: The Hunt"
 *
 * Returns null if the line is not a chapter heading.
 */
function parseChapterHeading(line: string, unit: OutlineUnit): { number: number; title: string } | null {
  // Strip leading # and whitespace
  const stripped = line.replace(/^#+\s*/, '').trim();

  // Match patterns like:
  //   "Chapter 1: Title"
  //   "Chapter 1 — Title"
  //   "Chapter 1 - Title"
  //   "Chapter 1. Title"
  //   "Chapter 1 Title"
  //   "Section 3. Title"
  //   "Part 2, Chapter 5: Title"
  const word = unit === 'section' ? 'Section' : 'Chapter';
  // Build a regex that captures (Part N, )? Chapter N (separator) Title
  const re = new RegExp(
    `^(?:Part\\s+\\d+,\\s+)?${word}\\s+(\\d+)\\s*[:\\-—.\\s]+(.+)$`,
    'i'
  );
  const m = stripped.match(re);
  if (!m) return null;
  const num = parseInt(m[1]!, 10);
  if (Number.isNaN(num) || num < 1) return null;
  const title = m[2]!.trim();
  return { number: num, title };
}

/**
 * Parse an arc/part heading.
 *
 * Accepts: "## Arc 1: Survival (Chapters 1–4)", "## Part 2: Investigation"
 */
function parseArcHeading(line: string): string | null {
  const stripped = line.replace(/^#+\s*/, '').trim();
  const m = stripped.match(/^(?:Arc|Part)\s+\d+\s*[:\-—.\s]+(.+?)(?:\s*\(.*\))?$/i);
  if (!m) return null;
  return m[1]!.trim();
}

/**
 * Parse the per-chapter metadata fields.
 *
 * Looks for patterns:
 *   "**Pacing:** Calm"
 *   "**Timeline:** Day 1"
 *   "**Characters Present:** Fubiki, Hika"
 */
function parseChapterBody(body: string): { pacing?: string; characters: string[] } {
  const result: { pacing?: string; characters: string[] } = { characters: [] };
  const pacingMatch = body.match(/\*\*Pacing:\*\*\s*([^*\n]+)/i);
  if (pacingMatch) result.pacing = pacingMatch[1]!.trim();
  const charsMatch = body.match(/\*\*Characters Present:\*\*\s*([^*\n]+)/i);
  if (charsMatch) {
    result.characters = charsMatch[1]!
      .split(/,|and/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return result;
}

/**
 * Split `./book/outline.md` into per-chapter files.
 *
 * @param projectRoot Absolute path to the project root (where ./book/ lives)
 * @param options.track "fiction" | "non-fiction" | "mixed"
 * @param options.unit  "chapter" (default) or "section" (non-fiction)
 * @param options.dryRun If true, parse and report without writing files
 */
export async function splitOutline(
  projectRoot: string,
  options: {
    track?: 'fiction' | 'non-fiction' | 'mixed';
    unit?: OutlineUnit;
    dryRun?: boolean;
  } = {}
): Promise<SplitResult> {
  const track = options.track ?? 'fiction';
  const unit: OutlineUnit = options.unit ?? (track === 'non-fiction' ? 'section' : 'chapter');
  const outlineFile = path.join(projectRoot, 'book', 'outline.md');

  if (!(await fs.pathExists(outlineFile))) {
    throw new Error(
      `Cannot split outline: ${outlineFile} does not exist. ` +
      `The user must have a ./book/outline.md file before per-chapter files can be derived.`
    );
  }

  const content = await fs.readFile(outlineFile, 'utf-8');
  const lines = content.split('\n');

  // First pass: identify chapter heading lines and the body of each chapter
  interface Heading {
    lineIndex: number;
    number: number;
    title: string;
  }

  const headings: Heading[] = [];
  let currentArc: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const arc = parseArcHeading(line);
    if (arc !== null) {
      currentArc = arc;
      continue;
    }
    const ch = parseChapterHeading(line, unit);
    if (ch !== null) {
      headings.push({ lineIndex: i, number: ch.number, title: ch.title });
    }
  }

  if (headings.length === 0) {
    throw new Error(
      `No chapter headings found in ${outlineFile}. ` +
      `Expected lines like "## Chapter 1: Title" or "## Section 1: Title" ` +
      `(unit=${unit}). Cannot derive per-chapter files.`
    );
  }

  // Second pass: extract each chapter's body (from heading to next heading)
  const chapters: { meta: OutlineChapterMeta; body: string }[] = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]!;
    const start = h.lineIndex;
    const end = i + 1 < headings.length ? headings[i + 1]!.lineIndex : lines.length;
    const block = lines.slice(start, end).join('\n');
    const body = parseChapterBody(block);
    const filename = `${unit}_${String(h.number).padStart(2, '0')}.md`;
    chapters.push({
      meta: {
        number: h.number,
        title: h.title,
        file: filename,
        arc: currentArc ?? undefined,
        characters: body.characters,
        pacing: body.pacing,
        order: i,
      },
      body: block,
    });
  }

  // Verify we have chapters 1..N with no gaps
  const numbers = chapters.map(c => c.meta.number).sort((a, b) => a - b);
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) {
      throw new Error(
        `Chapter numbering has a gap or starts not at 1. ` +
        `Found: [${numbers.join(', ')}]. ` +
        `Outline must have chapters 1, 2, 3, …, N with no gaps.`
      );
    }
  }

  const now = new Date().toISOString();
  const index: OutlineIndex = {
    version: 1,
    generated_at: now,
    track,
    unit,
    total_chapters: chapters.length,
    chapters: chapters.map(c => c.meta),
    source_outline: './book/outline.md',
  };

  const filesWritten: string[] = [];

  if (!options.dryRun) {
    const outDir = path.join(projectRoot, 'book', 'outline');
    await fs.ensureDir(outDir);

    for (const c of chapters) {
      const outFile = path.join(outDir, c.meta.file);
      await fs.writeFile(outFile, c.body, 'utf-8');
      filesWritten.push(outFile);
    }

    const indexFile = path.join(outDir, '_index.json');
    await fs.writeJson(indexFile, index, { spaces: 2 });
    filesWritten.push(indexFile);
  }

  return {
    index,
    filesWritten,
    chapters: chapters.length,
  };
}
