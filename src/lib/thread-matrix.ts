/**
 * Thread Tracking Matrix
 *
 * Generates a tabular view of plot threads across chapters from the
 * existing tracking data. Rows = plot threads, columns = chapters.
 * Each cell shows the thread's status: absent, setup, development,
 * payoff, resolved.
 *
 * Reveals gaps, over-concentration, and dropped threads at a glance.
 */

import fs from 'fs-extra';
import path from 'path';

export interface ThreadMatrix {
  threads: ThreadRow[];
  chapters: number[];
  droppedThreads: string[];     // threads with setup but no resolution
  orphanedPayoffs: string[];    // payoffs with no setup
  overconcentrated: string[];   // threads active in too many consecutive chapters
  evidence: string[];
}

interface ThreadRow {
  name: string;
  statusByChapter: Record<number, string>;  // chapter → status
  firstAppearance: number;
  lastAppearance: number;
  totalChapters: number;
}

export function generateThreadMatrix(
  projectRoot: string
): ThreadMatrix {
  const trackingDir = path.join(projectRoot, 'book', 'tracking');
  const draftsDir = path.join(projectRoot, 'book', 'drafts');
  const evidence: string[] = [];

  // Collect all plot threads from tracking
  const threads: ThreadRow[] = [];
  const threadMap: Record<string, ThreadRow> = {};

  // Load plot-tracker.json if it exists
  const plotTrackerPath = path.join(trackingDir, 'plot-tracker.json');
  if (fs.existsSync(plotTrackerPath)) {
    try {
      const tracker = fs.readJsonSync(plotTrackerPath);
      if (Array.isArray(tracker.threads)) {
        for (const t of tracker.threads) {
          const name = t.name || t.thread || 'unknown';
          threadMap[name] = {
            name,
            statusByChapter: {},
            firstAppearance: t.firstAppearance || 0,
            lastAppearance: t.lastAppearance || 0,
            totalChapters: 0,
          };
        }
      }
      evidence.push(`✓ Loaded ${Object.keys(threadMap).length} threads from plot-tracker.json`);
    } catch {
      evidence.push('⚠ plot-tracker.json exists but could not be parsed');
    }
  } else {
    evidence.push('⚠ plot-tracker.json not found — extracting threads from XML drafts');
  }

  // Parse XML drafts for <plot-thread> tracking updates
  if (fs.existsSync(draftsDir)) {
    const xmlFiles = fs.readdirSync(draftsDir).filter(f => f.endsWith('.xml')).sort();
    for (const xmlFile of xmlFiles) {
      const match = xmlFile.match(/chapter_(\d+)\.xml/);
      if (!match) continue;
      const chapterNum = parseInt(match[1]);

      const content = fs.readFileSync(path.join(draftsDir, xmlFile), 'utf-8');
      const plotThreadRegex = /<plot-thread\s+name="([^"]+)"\s+status="([^"]+)"[^>]*\/>/g;
      const threadMatches = [...content.matchAll(plotThreadRegex)];

      for (const m of threadMatches) {
        const name = m[1];
        const status = m[2];

        if (!threadMap[name]) {
          threadMap[name] = {
            name,
            statusByChapter: {},
            firstAppearance: chapterNum,
            lastAppearance: chapterNum,
            totalChapters: 0,
          };
        }

        threadMap[name].statusByChapter[chapterNum] = status;
        if (chapterNum < threadMap[name].firstAppearance || threadMap[name].firstAppearance === 0) {
          threadMap[name].firstAppearance = chapterNum;
        }
        if (chapterNum > threadMap[name].lastAppearance) {
          threadMap[name].lastAppearance = chapterNum;
        }
        threadMap[name].totalChapters++;
      }
    }
    evidence.push(`✓ Parsed ${Object.keys(threadMap).length} threads from ${fs.readdirSync(draftsDir).filter(f => f.endsWith('.xml')).length} XML drafts`);
  }

  const chapters = Object.values(threadMap)
    .flatMap(t => Object.keys(t.statusByChapter).map(Number))
    .filter((v, i, a) => a.indexOf(v) === v)
    .sort((a, b) => a - b);

  for (const row of Object.values(threadMap)) {
    threads.push(row);
  }
  threads.sort((a, b) => a.firstAppearance - b.firstAppearance);

  // Detect dropped threads (setup but no resolution)
  const droppedThreads: string[] = [];
  for (const thread of threads) {
    const statuses = Object.values(thread.statusByChapter);
    const hasSetup = statuses.some(s => s === 'introduced' || s === 'setup');
    const hasResolution = statuses.some(s => s === 'complete' || s === 'resolved');
    if (hasSetup && !hasResolution) {
      droppedThreads.push(`${thread.name} (appeared in chapters ${thread.firstAppearance}–${thread.lastAppearance}, never resolved)`);
    }
  }
  if (droppedThreads.length === 0) {
    evidence.push('✓ Dropped threads: none — all setup threads have resolutions');
  } else {
    evidence.push(`✗ Dropped threads: ${droppedThreads.length} threads have setup but no resolution`);
  }

  // Detect orphaned payoffs (payoff with no prior setup)
  const orphanedPayoffs: string[] = [];
  for (const thread of threads) {
    const statuses = Object.entries(thread.statusByChapter).sort((a, b) => Number(a[0]) - Number(b[0]));
    const firstStatus = statuses[0]?.[1];
    if (firstStatus === 'complete' || firstStatus === 'resolved') {
      orphanedPayoffs.push(`${thread.name} (resolved in chapter ${statuses[0][0]} but never set up)`);
    }
  }
  if (orphanedPayoffs.length === 0) {
    evidence.push('✓ Orphaned payoffs: none — all resolutions have prior setups');
  } else {
    evidence.push(`✗ Orphaned payoffs: ${orphanedPayoffs.length} threads resolved without setup`);
  }

  // Detect over-concentration (thread active in >70% of chapters)
  const overconcentrated: string[] = [];
  const totalChapters = chapters.length;
  if (totalChapters > 5) {
    for (const thread of threads) {
      if (thread.totalChapters / totalChapters > 0.7) {
        overconcentrated.push(`${thread.name} (active in ${thread.totalChapters}/${totalChapters} chapters — may be overused)`);
      }
    }
  }
  if (overconcentrated.length === 0) {
    evidence.push('✓ Over-concentration: no threads active in >70% of chapters');
  } else {
    evidence.push(`⚠ Over-concentration: ${overconcentrated.length} threads may be overused`);
  }

  return { threads, chapters, droppedThreads, orphanedPayoffs, overconcentrated, evidence };
}

export function formatThreadMatrix(matrix: ThreadMatrix): string {
  const lines: string[] = [];
  lines.push('# Thread Tracking Matrix');
  lines.push('');
  lines.push(`**Chapters:** ${matrix.chapters.join(', ') || 'none'}`);
  lines.push(`**Threads tracked:** ${matrix.threads.length}`);
  lines.push('');

  // Matrix table
  if (matrix.chapters.length > 0 && matrix.threads.length > 0) {
    const header = '| Thread | ' + matrix.chapters.map(c => `Ch${c}`).join(' | ') + ' | First | Last |';
    const separator = '|--------|' + matrix.chapters.map(() => '------').join('|') + '|------|------|';
    lines.push(header);
    lines.push(separator);

    for (const thread of matrix.threads) {
      const cells = matrix.chapters.map(ch => {
        const status = thread.statusByChapter[ch];
        if (!status) return '—';
        const symbols: Record<string, string> = {
          introduced: '⨯',
          setup: '⨯',
          development: '→',
          advanced: '→',
          payoff: '✓',
          complete: '✓',
          resolved: '✓',
        };
        return symbols[status] || status.slice(0, 4);
      });
      lines.push(`| ${thread.name} | ${cells.join(' | ')} | ${thread.firstAppearance || '—'} | ${thread.lastAppearance || '—'} |`);
    }

    lines.push('');
    lines.push('Legend: ⨯ = setup/introduced, → = development, ✓ = payoff/resolved, — = absent');
  }

  // Issues
  if (matrix.droppedThreads.length > 0) {
    lines.push('');
    lines.push('## Dropped Threads (setup without resolution)');
    for (const d of matrix.droppedThreads) lines.push(`- ${d}`);
  }
  if (matrix.orphanedPayoffs.length > 0) {
    lines.push('');
    lines.push('## Orphaned Payoffs (resolution without setup)');
    for (const o of matrix.orphanedPayoffs) lines.push(`- ${o}`);
  }
  if (matrix.overconcentrated.length > 0) {
    lines.push('');
    lines.push('## Over-Concentration Warning');
    for (const o of matrix.overconcentrated) lines.push(`- ${o}`);
  }

  return lines.join('\n');
}