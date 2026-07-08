/**
 * Cognitive Load Management
 *
 * Tracks how many active plot threads, named characters, and
 * simultaneous reader-questions are active per chapter. Flag
 * chapters that exceed cognitive load thresholds.
 *
 * Readers have limited cognitive capacity. Introducing too many
 * characters or threads in one chapter causes confusion and
 * skimming.
 */

import fs from 'fs-extra';
import path from 'path';

/** Per-chapter cognitive load metrics with overloaded chapters flagged. */
export interface CognitiveLoadReport {
  chapters: ChapterLoad[];
  overloadedChapters: ChapterLoad[];
  evidence: string[];
}

interface ChapterLoad {
  chapter: number;
  namedCharacters: number;
  activeThreads: number;
  openQuestions: number;
  totalLoad: number;
  overloaded: boolean;
}

const MAX_NAMED_CHARACTERS = 7;
const MAX_ACTIVE_THREADS = 5;
const MAX_OPEN_QUESTIONS = 3;

/** Scan XML drafts to measure named characters active threads and open questions per chapter. */
export function analyzeCognitiveLoad(
  projectRoot: string
): CognitiveLoadReport {
  const evidence: string[] = [];
  const chapters: ChapterLoad[] = [];

  const draftsDir = path.join(projectRoot, 'book', 'drafts');
  if (!fs.existsSync(draftsDir)) {
    return { chapters: [], overloadedChapters: [], evidence: ['No drafts found'] };
  }

  const xmlFiles = fs.readdirSync(draftsDir).filter(f => f.endsWith('.xml')).sort();

  // Load character state tracking for cumulative character data
  const trackerPath = path.join(projectRoot, 'book', 'tracking', 'character-state.json');
  let allCharacters: string[] = [];
  if (fs.existsSync(trackerPath)) {
    try {
      const tracker = fs.readJsonSync(trackerPath);
      if (Array.isArray(tracker.characters)) {
        allCharacters = tracker.characters.map((c: any) => c.name);
      }
    } catch { /* ignore */ }
  }

  for (const xmlFile of xmlFiles) {
    const match = xmlFile.match(/chapter_(\d+)\.xml/);
    if (!match) continue;
    const chapterNum = parseInt(match[1]);
    const content = fs.readFileSync(path.join(draftsDir, xmlFile), 'utf-8');

    // Count named characters in this chapter (from dialogue speakers and characters-present metadata)
    const speakerRegex = /<dialogue\s+speaker="([^"]+)"/g;
    const speakers = new Set([...content.matchAll(speakerRegex)].map(m => m[1]));

    const presentMatch = content.match(/<characters-present>([^<]+)<\/characters-present>/);
    if (presentMatch) {
      const present = presentMatch[1].split(/,|\band\b/).map(s => s.trim()).filter(s => s.length > 0);
      present.forEach(p => speakers.add(p));
    }

    const namedCharacters = speakers.size;

    // Count active plot threads
    const threadRegex = /<plot-thread\s+name="([^"]+)"\s+status="(introduced|advanced|development)"/g;
    const activeThreads = new Set([...content.matchAll(threadRegex)].map(m => m[1])).size;

    // Count open questions (from interiority with question marks)
    const interiorityRegex = /<interiority\s+[^>]*?thought="([^"]*)"[^>]*>/g;
    const thoughts = [...content.matchAll(interiorityRegex)].map(m => m[1]);
    const openQuestions = thoughts.filter(t => /\?/.test(t) || /^(why|how|what|who|where|when)\b/i.test(t)).length;

    const totalLoad = namedCharacters + activeThreads + openQuestions;
    const overloaded = namedCharacters > MAX_NAMED_CHARACTERS || activeThreads > MAX_ACTIVE_THREADS || openQuestions > MAX_OPEN_QUESTIONS;

    chapters.push({ chapter: chapterNum, namedCharacters, activeThreads, openQuestions, totalLoad, overloaded });

    if (overloaded) {
      const reasons: string[] = [];
      if (namedCharacters > MAX_NAMED_CHARACTERS) reasons.push(`${namedCharacters} named characters (max ${MAX_NAMED_CHARACTERS})`);
      if (activeThreads > MAX_ACTIVE_THREADS) reasons.push(`${activeThreads} active threads (max ${MAX_ACTIVE_THREADS})`);
      if (openQuestions > MAX_OPEN_QUESTIONS) reasons.push(`${openQuestions} open questions (max ${MAX_OPEN_QUESTIONS})`);
      evidence.push(`✗ Ch${chapterNum}: Cognitive overload — ${reasons.join(', ')}`);
    } else {
      evidence.push(`✓ Ch${chapterNum}: Load=${totalLoad} (${namedCharacters} chars, ${activeThreads} threads, ${openQuestions} questions) — within limits`);
    }
  }

  const overloadedChapters = chapters.filter(c => c.overloaded);
  evidence.unshift(`✓ Analyzed ${chapters.length} chapters, ${overloadedChapters.length} overloaded`);

  return { chapters, overloadedChapters, evidence };
}

/** Format a cognitive load report as a markdown table. */
export function formatCognitiveLoadReport(report: CognitiveLoadReport): string {
  const lines: string[] = [];
  lines.push('# Cognitive Load Analysis');
  lines.push('');
  lines.push(`**Chapters analyzed:** ${report.chapters.length}`);
  lines.push(`**Overloaded chapters:** ${report.overloadedChapters.length}`);
  lines.push('');
  lines.push('| Chapter | Characters | Threads | Questions | Total Load | Status |');
  lines.push('|---------|------------|---------|-----------|------------|--------|');
  for (const ch of report.chapters) {
    lines.push(`| Ch${ch.chapter} | ${ch.namedCharacters}/${MAX_NAMED_CHARACTERS} | ${ch.activeThreads}/${MAX_ACTIVE_THREADS} | ${ch.openQuestions}/${MAX_OPEN_QUESTIONS} | ${ch.totalLoad} | ${ch.overloaded ? '✗ Overloaded' : '✓ OK'} |`);
  }
  return lines.join('\n');
}