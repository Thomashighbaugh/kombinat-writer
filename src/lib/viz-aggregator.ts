/**
 * Viz aggregator — derives sidebar visualization data from the project's
 * book files. Called by the sidebar on every project refresh, AND by the
 * verify and review phases before they run their checks.
 *
 * Sources (all read from the project root):
 *   - ./book/content/chapter_*.md       — written chapters
 *   - ./book/outline.md or _index.json  — chapter structure + pacing
 *   - ./book/tracking/character-state.json — character roster
 *   - ./book/tracking/plot-tracker.json — story threads
 *   - ./book/tracking/timeline.json     — chronological anchor
 *   - ./book/tracking/*.provenance.json — per-chapter author/AI breakdown
 *
 * Idempotent. Safe to call repeatedly. Returns an empty dataset (with
 * `pacing: []`) if the project has no content yet — never throws.
 */

import fs from 'fs-extra';
import path from 'path';

import { generateThreadMatrix, type ThreadMatrix } from './thread-matrix.js';
import { analyzeCognitiveLoad } from './cognitive-load.js';
import { verifyEscalation } from './escalation-curve.js';
import { aggregateProvenance, type ChapterProvenance } from './provenance.js';

/** Pacing intensity per chapter (0..1). */
export interface PacingPoint {
  chapter: number;
  intensity: number;
}

/** Cognitive load per chapter (count of active threads + characters). */
export interface CognitivePoint {
  chapter: number;
  load: number;
}

/** Escalation tension per story beat. */
export interface EscalationPoint {
  beat: number;
  tension: number;
}

/** Flattened provenance summary for the whole manuscript. */
export interface VizProvenance {
  totalLines: number;
  author: number;
  aiDrafted: number;
  aiRevised: number;
  aiEdited: number;
  aiModified: number;
  authorRevised: number;
  percentages: { author: number; ai: number };
}

/** Aggregate visualization data for the sidebar. */
export interface VizDataset {
  pacing: PacingPoint[];
  threads: ThreadMatrix['threads'];
  provenance: VizProvenance | null;
  cognitiveLoad: CognitivePoint[];
  escalation: EscalationPoint[];
  generatedAt: string;
  chapters: number;
}

/**
 * Build the full visualization dataset for a project. Safe to call when the
 * project is empty — returns an empty `VizDataset` with `chapters: 0`.
 *
 * Order of computation (deterministic — same input, same output):
 *   1. Discover chapters on disk
 *   2. Read outline for pacing and arc structure
 *   3. Aggregate provenance
 *   4. Compute thread matrix
 *   5. Compute cognitive load
 *   6. Compute escalation curve
 */
export function buildVizDataset(projectRoot: string): VizDataset {
  const empty: VizDataset = {
    pacing: [],
    threads: [],
    provenance: null,
    cognitiveLoad: [],
    escalation: [],
    generatedAt: new Date().toISOString(),
    chapters: 0,
  }

  const contentDir = path.join(projectRoot, 'book', 'content')
  if (!fs.existsSync(contentDir)) return empty

  const chapterFiles = fs.readdirSync(contentDir)
    .filter(f => /^chapter_\d+\.md$/.test(f))
    .sort()

  if (chapterFiles.length === 0) return empty

  // ─── 1. Pacing from outline + chapter content ────────────────────────────
  const pacing = computePacing(projectRoot, chapterFiles)

  // ─── 2. Threads ──────────────────────────────────────────────────────────
  let threads: ThreadMatrix['threads'] = []
  try {
    const matrix = generateThreadMatrix(projectRoot)
    threads = matrix.threads
  } catch {
    threads = []
  }

  // ─── 3. Provenance aggregation ───────────────────────────────────────────
  let provenance: VizDataset['provenance'] = null
  try {
    const chapterProvs: ChapterProvenance[] = []
    for (const file of chapterFiles) {
      const match = file.match(/chapter_(\d+)\.md/)
      if (!match) continue
      const num = parseInt(match[1]!, 10)
      const sidecar = path.join(projectRoot, 'book', 'content', `${file}.provenance.json`)
      if (fs.existsSync(sidecar)) {
        const data = fs.readJsonSync(sidecar) as ChapterProvenance
        chapterProvs.push({ ...data, chapterNumber: num })
      }
    }
    if (chapterProvs.length > 0) {
      const agg = aggregateProvenance(chapterProvs)
      // aggregateProvenance returns ManuscriptProvenance (totals across the
      // whole manuscript). Flatten it into a single VizProvenance record so
      // the viz tab can render one bar.
      provenance = {
        totalLines: agg.totalLines,
        author: agg.aggregateByOrigin.author,
        aiDrafted: agg.aggregateByOrigin['ai-drafted'],
        aiRevised: agg.aggregateByOrigin['ai-revised'],
        aiEdited: agg.aggregateByOrigin['ai-edited'],
        aiModified: agg.aggregateByOrigin['ai-modified'],
        authorRevised: agg.aggregateByOrigin['author-revised'],
        percentages: { author: agg.authorPercent, ai: agg.aiPercent },
      }
    }
  } catch {
    provenance = null
  }

  // ─── 4. Cognitive load per chapter ───────────────────────────────────────
  let cognitiveLoad: CognitivePoint[] = []
  try {
    const report = analyzeCognitiveLoad(projectRoot)
    cognitiveLoad = report.chapters.map(c => ({ chapter: c.chapter, load: c.totalLoad }))
  } catch {
    cognitiveLoad = []
  }

  // ─── 5. Escalation curve ────────────────────────────────────────────────
  let escalation: EscalationPoint[] = []
  try {
    const report = verifyEscalation(projectRoot)
    escalation = report.chapterIntensities.map((c: any, i: number) => ({
      beat: i,
      tension: typeof c.intensity === 'number' ? c.intensity
        : typeof c.tension === 'number' ? c.tension
        : 0,
    }))
  } catch {
    escalation = []
  }

  return {
    pacing,
    threads,
    provenance,
    cognitiveLoad,
    escalation,
    generatedAt: new Date().toISOString(),
    chapters: chapterFiles.length,
  }
}

/**
 * Compute pacing intensity per chapter. Combines:
 *   - Outline's pacing tag (Calm=0.25, Rising=0.5, Action=0.7, Climax=0.95, Resolution=0.3)
 *   - Chapter content density (sentences per paragraph, dialogue ratio)
 *
 * If the outline has no pacing tag, falls back to a flat default of 0.5.
 * If no outline at all, uses content density alone.
 */
function computePacing(projectRoot: string, chapterFiles: string[]): PacingPoint[] {
  const tagIntensity: Record<string, number> = {
    calm: 0.25,
    rising: 0.5,
    action: 0.7,
    climax: 0.95,
    resolution: 0.3,
  }

  // Read outline once for tag lookups
  const tagByChapter = new Map<number, number>()
  const outlineFile = path.join(projectRoot, 'book', 'outline.md')
  if (fs.existsSync(outlineFile)) {
    try {
      const text = fs.readFileSync(outlineFile, 'utf-8')
      // Each chapter block: capture "## Chapter N" ... "Pacing: <tag>"
      const blocks = text.split(/(?=^## (?:Chapter|Section) \d+)/m)
      for (const block of blocks) {
        const head = block.match(/^## (?:Chapter|Section) (\d+)/m)
        if (!head) continue
        const num = parseInt(head[1]!, 10)
        const tagMatch = block.match(/\*\*Pacing:\*\*\s*([^*\n]+)/i)
        if (tagMatch) {
          const tag = tagMatch[1]!.trim().toLowerCase().replace(/[^a-z]/g, '')
          const intensity = tagIntensity[tag]
          if (intensity !== undefined) tagByChapter.set(num, intensity)
        }
      }
    } catch {
      // ignore — fall back to content-based density
    }
  }

  // Compute per-chapter density from content
  const result: PacingPoint[] = []
  for (const file of chapterFiles) {
    const match = file.match(/chapter_(\d+)\.md/)
    if (!match) continue
    const num = parseInt(match[1]!, 10)
    let density = 0.5 // default
    try {
      const text = fs.readFileSync(path.join(projectRoot, 'book', 'content', file), 'utf-8')
      // Heuristic: short sentences + dialogue ratio = higher intensity
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
      const avgLen = sentences.length > 0
        ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
        : 80
      const dialogue = (text.match(/["']/g) || []).length
      const lenFactor = Math.max(0, Math.min(1, 1 - (avgLen - 40) / 100))
      const dialogueFactor = Math.max(0, Math.min(1, dialogue / 50))
      density = (lenFactor * 0.5 + dialogueFactor * 0.5)
    } catch {
      // keep default
    }
    // Blend outline tag with content density (60% tag, 40% density)
    const tag = tagByChapter.get(num)
    const intensity = tag !== undefined ? tag * 0.6 + density * 0.4 : density
    result.push({ chapter: num, intensity: Math.max(0, Math.min(1, intensity)) })
  }
  return result
}
