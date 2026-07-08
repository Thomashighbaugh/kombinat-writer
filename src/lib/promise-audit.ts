/**
 * Promise Keeping Audit
 *
 * Verifies that every implicit promise made to the reader — genre
 * promise, tone promise from opening, structural promise — is kept
 * by the end of the book. AI writing often makes promises it doesn't
 * keep.
 */

import fs from 'fs-extra';
import path from 'path';

/** Report of reader promises: declared, kept, and broken. */
export interface PromiseReport {
  promises: ReaderPromise[];
  kept: ReaderPromise[];
  broken: ReaderPromise[];
  evidence: string[];
}

/** A single promise made to the reader — genre, tone, structural, etc. */
export interface ReaderPromise {
  id: string;
  type: 'genre' | 'tone' | 'structural' | 'thematic' | 'mystery' | 'romantic' | 'content-warning';
  promise: string;
  declaredIn: string;       // constitution, opening chapter, genre convention
  keptInChapter?: number;
  kept: boolean;
  evidence: string;
}

/** Scan the book's constitution and content for declared and fulfilled reader promises. */
export function auditPromises(
  projectRoot: string
): PromiseReport {
  const evidence: string[] = [];
  const promises: ReaderPromise[] = [];

  // Load constitution for declared promises
  const constitutionPath = path.join(projectRoot, 'book', 'constitution.md');
  if (fs.existsSync(constitutionPath)) {
    const constitution = fs.readFileSync(constitutionPath, 'utf-8');

    // Extract thematic statement
    const thematicMatch = constitution.match(/##\s*Thematic Statement\s*\n([^\n]+)/i);
    if (thematicMatch) {
      promises.push({
        id: 'P-thematic',
        type: 'thematic',
        promise: `Thematic argument: ${thematicMatch[1].trim()}`,
        declaredIn: 'constitution',
        kept: false,
        evidence: 'Must be verified in final chapter resolution',
      });
    }

    // Extract genre promises from Reader Contract
    const contractMatch = constitution.match(/##\s*Reader Contract\s*\n([\s\S]*?)(?=\n##|\Z)/i);
    if (contractMatch) {
      const contract = contractMatch[1];
      const lines = contract.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
      for (const line of lines) {
        const text = line.trim().replace(/^[-*]\s*/, '');
        if (text.match(/HEA|HFN|happily ever after|happy ending|fair.?play|mystery|clue|promise|guarantee|warning|content/i)) {
          promises.push({
            id: `P-genre-${promises.length}`,
            type: text.match(/warning|content/i) ? 'content-warning' : 'genre',
            promise: text,
            declaredIn: 'constitution reader contract',
            kept: false,
            evidence: 'Genre convention — must be fulfilled',
          });
        }
      }
    }

    // Extract pacing promise
    const pacingMatch = constitution.match(/pacing.*?(Relentless|Balanced|Literary|Rollercoaster|Custom)/i);
    if (pacingMatch) {
      promises.push({
        id: 'P-pacing',
        type: 'structural',
        promise: `Pacing: ${pacingMatch[1]}`,
        declaredIn: 'constitution',
        kept: false,
        evidence: 'Pacing distribution should match declared strategy',
      });
    }
    evidence.push(`✓ Extracted ${promises.length} declared promises from constitution`);
  }

  // Load first chapter for tone promises
  const firstChapterPath = path.join(projectRoot, 'book', 'content');
  if (fs.existsSync(firstChapterPath)) {
    const firstChapters = fs.readdirSync(firstChapterPath).filter(f => f.startsWith('chapter_') && f.endsWith('.md')).sort();
    if (firstChapters.length > 0) {
      const firstChapter = fs.readFileSync(path.join(firstChapterPath, firstChapters[0]), 'utf-8');
      const openingWords = firstChapter.split(/\s+/).slice(0, 200).join(' ');

      // Detect tone promises from opening
      if (/dark|grim|horror|terrifying|dread/i.test(openingWords)) {
        promises.push({
          id: 'P-tone-dark',
          type: 'tone',
          promise: 'Dark/grim tone established in opening',
          declaredIn: 'opening chapter',
          kept: false,
          evidence: 'Tone must be maintained or deliberately evolved',
        });
      }
      if (/humor|funny|witty|light.?hearted|comedic/i.test(openingWords)) {
        promises.push({
          id: 'P-tone-humor',
          type: 'tone',
          promise: 'Humorous tone established in opening',
          declaredIn: 'opening chapter',
          kept: false,
          evidence: 'Humor must be sustained or transition earned',
        });
      }
      if (/mystery|secret|puzzle|enigma|unknown/i.test(openingWords)) {
        promises.push({
          id: 'P-mystery',
          type: 'mystery',
          promise: 'Mystery element introduced in opening',
          declaredIn: 'opening chapter',
          kept: false,
          evidence: 'Mystery must be resolved by book end',
        });
      }
      if (/romance|attraction|chemistry|tension.*?between/i.test(openingWords)) {
        promises.push({
          id: 'P-romantic',
          type: 'romantic',
          promise: 'Romantic tension introduced in opening',
          declaredIn: 'opening chapter',
          kept: false,
          evidence: 'Romance must be resolved (HEA/HFN for genre romance)',
        });
      }
      evidence.push(`✓ Extracted tone/mystery/romance promises from opening chapter`);
    }
  }

  // Load last chapter to verify promises kept
  const lastChapterPath = path.join(projectRoot, 'book', 'content');
  if (fs.existsSync(lastChapterPath)) {
    const chapters = fs.readdirSync(lastChapterPath).filter(f => f.startsWith('chapter_') && f.endsWith('.md')).sort();
    if (chapters.length > 0) {
      const lastChapter = fs.readFileSync(path.join(lastChapterPath, chapters[chapters.length - 1]), 'utf-8');
      const lastWords = lastChapter.split(/\s+/).slice(-200).join(' ');

      // Check thematic promise
      for (const p of promises) {
        if (p.type === 'thematic' && !p.kept) {
          const thematicKeywords = p.promise.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          const matches = thematicKeywords.filter(k => lastWords.toLowerCase().includes(k));
          if (matches.length >= 2) {
            p.kept = true;
            p.keptInChapter = chapters.length;
            p.evidence = `Thematic keywords found in final chapter: ${matches.join(', ')}`;
          }
        }

        // Check mystery promise
        if (p.type === 'mystery' && !p.kept) {
          if (/reveal|answer|solve|truth|explanation|turns out|was actually/i.test(lastWords)) {
            p.kept = true;
            p.keptInChapter = chapters.length;
            p.evidence = 'Mystery resolution language found in final chapter';
          }
        }

        // Check romantic promise
        if (p.type === 'romantic' && !p.kept) {
          if (/together|love|kiss|happily|forever|married|couple|finally/i.test(lastWords)) {
            p.kept = true;
            p.keptInChapter = chapters.length;
            p.evidence = 'Romantic resolution found in final chapter';
          }
        }

        // Check dark tone promise — should be maintained or earned transition
        if (p.type === 'tone' && p.promise.includes('Dark') && !p.kept) {
          if (/dark|shadow|grim|cold|heavy|weight|loss|sacrifice/i.test(lastWords)) {
            p.kept = true;
            p.keptInChapter = chapters.length;
            p.evidence = 'Dark tone maintained through ending';
          }
        }

        // Check humor promise
        if (p.type === 'tone' && p.promise.includes('Humor') && !p.kept) {
          if (/laugh|smile|grin|joke|witty|amusing|chuckle/i.test(lastWords)) {
            p.kept = true;
            p.keptInChapter = chapters.length;
            p.evidence = 'Humor present in ending';
          }
        }
      }
    }
  }

  // Check pacing promise via pacing tags
  // (Would need to parse XML drafts for pacing tags — done in pacing-audit.ts)

  const kept = promises.filter(p => p.kept);
  const broken = promises.filter(p => !p.kept);

  evidence.push(`✓ Promises declared: ${promises.length}`);
  evidence.push(`✓ Promises kept: ${kept.length}`);
  if (broken.length > 0) {
    evidence.push(`✗ Promises broken: ${broken.length}`);
    for (const p of broken) {
      evidence.push(`  ${p.id}: ${p.promise} — ${p.evidence}`);
    }
  }

  return { promises, kept, broken, evidence };
}

/** Format the promise audit as a markdown report. */
export function formatPromiseReport(report: PromiseReport): string {
  const lines: string[] = [];
  lines.push('# Promise Keeping Audit');
  lines.push('');
  lines.push(`**Promises declared:** ${report.promises.length}`);
  lines.push(`**Kept:** ${report.kept.length}`);
  lines.push(`**Broken:** ${report.broken.length}`);
  lines.push('');

  if (report.broken.length > 0) {
    lines.push('## Broken Promises');
    lines.push('| ID | Type | Promise | Declared In | Evidence |');
    lines.push('|----|------|---------|------------|----------|');
    for (const p of report.broken) {
      lines.push(`| ${p.id} | ${p.type} | ${p.promise} | ${p.declaredIn} | ${p.evidence} |`);
    }
    lines.push('');
  }

  if (report.kept.length > 0) {
    lines.push('## Kept Promises');
    lines.push('| ID | Type | Promise | Kept In | Evidence |');
    lines.push('|----|------|---------|---------|----------|');
    for (const p of report.kept) {
      lines.push(`| ${p.id} | ${p.type} | ${p.promise} | Ch${p.keptInChapter} | ${p.evidence} |`);
    }
  }

  return lines.join('\n');
}