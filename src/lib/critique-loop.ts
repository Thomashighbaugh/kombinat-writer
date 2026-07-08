/**
 * Critique Loop Tool
 *
 * Manages critique rounds: feedback categorization, severity
 * assessment, priority matrix generation, round persistence, and
 * formatted report generation.
 */

import fs from 'fs-extra';
import path from 'path';

/** Critique pass mode — determines depth and focus. */
export type CritiqueMode = 'alpha' | 'beta' | 'peer' | 'sensitivity' | 'comprehensive';
/** Severity level of a critique finding. */
export type Severity = 'critical' | 'major' | 'minor' | 'observation';

/** A single critique finding with category severity and recommendation. */
export interface CritiqueItem {
  id: string;
  chapter: number;
  category: string;
  severity: Severity;
  summary: string;
  location: string;
  effect: string;
  recommendation: string;
}

/** A complete critique round with items and mode metadata. */
export interface CritiqueRound {
  round: number;
  mode: CritiqueMode;
  chapters: number[];
  items: CritiqueItem[];
  date: string;
}

// ─── categorizeFeedback ─────────────────────────────────────────────────

/**
 * Group critique items by their category.
 * Returns a map of category name → items in that category.
 */
export function categorizeFeedback(round: CritiqueRound): Record<string, CritiqueItem[]> {
  const categorized: Record<string, CritiqueItem[]> = {};

  for (const item of round.items) {
    const cat = item.category || 'Uncategorized';
    if (!categorized[cat]) {
      categorized[cat] = [];
    }
    categorized[cat].push(item);
  }

  return categorized;
}

// ─── priorityMatrix ─────────────────────────────────────────────────────

/**
 * Build a priority matrix sorted by severity (critical → observation)
 * with item counts for each severity level.
 */
export function priorityMatrix(items: CritiqueItem[]): Array<{
  priority: Severity;
  count: number;
  items: CritiqueItem[];
}> {
  const severityOrder: Severity[] = ['critical', 'major', 'minor', 'observation'];
  const matrix: Array<{ priority: Severity; count: number; items: CritiqueItem[] }> = [];

  for (const severity of severityOrder) {
    const filtered = items.filter(i => i.severity === severity);
    if (filtered.length > 0) {
      matrix.push({
        priority: severity,
        count: filtered.length,
        items: filtered.sort((a, b) => a.chapter - b.chapter),
      });
    }
  }

  return matrix;
}

// ─── generateReport ─────────────────────────────────────────────────────

/**
 * Generate a complete critique report as a formatted string.
 * Includes round header, per-chapter breakdown, category summary,
 * priority matrix, and item details.
 */
export function generateReport(items: CritiqueItem[], mode: CritiqueMode): string {
  const sections: string[] = [];

  // — Header
  sections.push(`# Critique Report (${mode} mode)`);
  sections.push(`**Generated**: ${new Date().toISOString().split('T')[0]}`);
  sections.push(`**Total items**: ${items.length}\n`);

  // — Priority Matrix Summary
  const matrix = priorityMatrix(items);
  sections.push('## Priority Matrix\n');
  for (const entry of matrix) {
    sections.push(`| ${entry.priority} | ${entry.count} |`);
  }
  sections.push('');

  // — Category Summary
  const catMap = new Map<string, number>();
  for (const item of items) {
    const cat = item.category || 'Uncategorized';
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  }
  sections.push('## Category Summary\n');
  for (const [cat, count] of [...catMap.entries()].sort((a, b) => b[1] - a[1])) {
    sections.push(`- **${cat}**: ${count} item${count !== 1 ? 's' : ''}`);
  }
  sections.push('');

  // — Per-Chapter Breakdown
  const chapterMap = new Map<number, CritiqueItem[]>();
  for (const item of items) {
    const ch = item.chapter || 0;
    if (!chapterMap.has(ch)) chapterMap.set(ch, []);
    chapterMap.get(ch)!.push(item);
  }

  sections.push('## Chapter Breakdown\n');
  for (const [ch, chItems] of [...chapterMap.entries()].sort((a, b) => a[0] - b[0])) {
    const chLabel = ch === 0 ? 'Front/Back Matter' : `Chapter ${ch}`;
    sections.push(`### ${chLabel} (${chItems.length} items)\n`);

    for (const item of chItems) {
      sections.push(`#### [${item.severity.toUpperCase()}] ${item.summary}`);
      sections.push(`- **Location**: ${item.location}`);
      sections.push(`- **Category**: ${item.category}`);
      sections.push(`- **Effect**: ${item.effect}`);
      sections.push(`- **Recommendation**: ${item.recommendation}`);
      sections.push('');
    }
  }

  // — Full Item List
  sections.push('---\n');
  sections.push('## All Items\n');
  for (const item of items) {
    sections.push(`- **[${item.id}]** (Ch. ${item.chapter}, ${item.severity}, ${item.category}): ${item.summary}`);
  }
  sections.push('');

  return sections.join('\n');
}

// ─── saveRound ──────────────────────────────────────────────────────────

/**
 * Save a critique round to the project's critique directory.
 *
 * Writes to `{critiqueDir}/round-{N}/`:
 *   - `summary.md` — full report
 *   - `per-chapter_{N}.md` — items for each chapter
 */
export function saveRound(round: CritiqueRound, critiqueDir: string): void {
  const roundDir = path.join(critiqueDir, `round-${round.round}`);
  fs.ensureDirSync(roundDir);

  // — Save the full report
  const report = generateReport(round.items, round.mode);
  fs.writeFileSync(path.join(roundDir, 'summary.md'), report, 'utf-8');

  // — Save the raw round data as JSON (for programmatic reload)
  const roundJson = {
    round: round.round,
    mode: round.mode,
    chapters: round.chapters,
    date: round.date,
    itemCount: round.items.length,
  };
  fs.writeJsonSync(path.join(roundDir, 'round.json'), roundJson, { spaces: 2 });

  // — Save per-chapter files
  const chapterMap = new Map<number, CritiqueItem[]>();
  for (const item of round.items) {
    const ch = item.chapter || 0;
    if (!chapterMap.has(ch)) chapterMap.set(ch, []);
    chapterMap.get(ch)!.push(item);
  }

  for (const [ch, chItems] of chapterMap) {
    const chLabel = ch === 0 ? 'front-back-matter' : `chapter_${ch}`;
    const chapterReport = generateReport(chItems, round.mode);
    fs.writeFileSync(path.join(roundDir, `${chLabel}.md`), chapterReport, 'utf-8');
  }

  // — Save items as JSON for data processing
  fs.writeJsonSync(path.join(roundDir, 'items.json'), round.items, { spaces: 2 });
}

// ─── loadRound ──────────────────────────────────────────────────────────

/**
 * Load a previous critique round from disk.
 * Reads `items.json` and `round.json` from the round directory.
 * Returns null if the round does not exist.
 */
export function loadRound(roundNumber: number, critiqueDir: string): CritiqueRound | null {
  const roundDir = path.join(critiqueDir, `round-${roundNumber}`);
  const itemsPath = path.join(roundDir, 'items.json');
  const roundPath = path.join(roundDir, 'round.json');

  if (!fs.existsSync(roundDir) || !fs.existsSync(itemsPath) || !fs.existsSync(roundPath)) {
    return null;
  }

  try {
    const items: CritiqueItem[] = fs.readJsonSync(itemsPath);
    const roundMeta: { round: number; mode: CritiqueMode; chapters: number[]; date: string } =
      fs.readJsonSync(roundPath);

    return {
      round: roundMeta.round,
      mode: roundMeta.mode,
      chapters: roundMeta.chapters,
      items,
      date: roundMeta.date,
    };
  } catch {
    return null;
  }
}
