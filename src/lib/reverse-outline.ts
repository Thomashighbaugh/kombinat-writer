/**
 * Reverse Outline Comparison
 *
 * After a draft chapter is complete, generates an outline of what was
 * ACTUALLY written and compares it to the PLANNED outline. Flags
 * structural drift, missing beats, and added content so the author
 * can decide if the drift is intentional.
 */

import fs from 'fs-extra';
import path from 'path';
import { GateResult } from './quality-gates.js';

export interface ReverseOutlineReport {
  chapter: number;
  plannedBeats: PlannedBeat[];
  actualBeats: ActualBeat[];
  matched: BeatMatch[];
  missingBeats: PlannedBeat[];
  addedBeats: ActualBeat[];
  driftedBeats: BeatDrift[];
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface PlannedBeat {
  sceneNumber: number;
  goal: string;
  conflict: string;
}

interface ActualBeat {
  sceneNumber: number;
  goal: string;
  conflict: string;
  pacing: string;
}

interface BeatMatch {
  planned: PlannedBeat;
  actual: ActualBeat;
  matchQuality: 'exact' | 'close' | 'partial';
}

interface BeatDrift {
  planned: PlannedBeat;
  actual: ActualBeat;
  drift: string;
}

export function generateReverseOutline(
  projectRoot: string,
  chapterNumber: number
): ReverseOutlineReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  // Load planned beats from outline
  const plannedBeats = loadPlannedBeats(projectRoot, chapterNumber);
  if (plannedBeats.length === 0) {
    warnings.push(`No planned beats found in outline for chapter ${chapterNumber} — reverse outline comparison skipped`);
    return { chapter: chapterNumber, plannedBeats: [], actualBeats: [], matched: [], missingBeats: [], addedBeats: [], driftedBeats: [], passed: true, blocking, warnings, evidence };
  }
  evidence.push(`✓ Loaded ${plannedBeats.length} planned beats from outline`);

  // Load actual beats from XML draft
  const xmlPath = path.join(projectRoot, 'book', 'drafts', `chapter_${String(chapterNumber).padStart(5, '0')}.xml`);
  if (!fs.existsSync(xmlPath)) {
    warnings.push(`No XML draft found for chapter ${chapterNumber} — reverse outline comparison skipped`);
    return { chapter: chapterNumber, plannedBeats, actualBeats: [], matched: [], missingBeats: [], addedBeats: [], driftedBeats: [], passed: true, blocking, warnings, evidence };
  }
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  const actualBeats = extractActualBeats(xmlContent);
  evidence.push(`✓ Extracted ${actualBeats.length} actual beats from XML draft`);

  // Match beats
  const matched: BeatMatch[] = [];
  const missingBeats: PlannedBeat[] = [];
  const driftedBeats: BeatDrift[] = [];
  const addedBeats: ActualBeat[] = [];

  const usedActual = new Set<number>();

  for (const planned of plannedBeats) {
    const bestMatch = findBestMatch(planned, actualBeats, usedActual);
    if (bestMatch) {
      usedActual.add(bestMatch.index);
      const match: BeatMatch = { planned, actual: bestMatch.beat, matchQuality: bestMatch.quality };
      matched.push(match);

      if (bestMatch.quality === 'partial') {
        driftedBeats.push({
          planned,
          actual: bestMatch.beat,
          drift: bestMatch.driftDescription || 'Goal/conflict drifted from plan',
        });
        warnings.push(`Scene ${planned.sceneNumber}: Drifted from plan — planned goal "${planned.goal}" vs actual "${bestMatch.beat.goal}"`);
      }
    } else {
      missingBeats.push(planned);
      blocking.push(`Scene ${planned.sceneNumber}: Planned beat MISSING from draft — goal: "${planned.goal}", conflict: "${planned.conflict}"`);
    }
  }

  // Added beats = actual beats not matched to any planned beat
  for (let i = 0; i < actualBeats.length; i++) {
    if (!usedActual.has(i)) {
      addedBeats.push(actualBeats[i]);
      warnings.push(`Scene ${actualBeats[i].sceneNumber}: Unplanned beat added in draft — goal: "${actualBeats[i].goal}"`);
    }
  }

  evidence.push(`✓ Matched: ${matched.length} beats (${matched.filter(m => m.matchQuality === 'exact').length} exact, ${matched.filter(m => m.matchQuality === 'close').length} close, ${driftedBeats.length} drifted)`);
  if (missingBeats.length > 0) {
    evidence.push(`✗ Missing beats: ${missingBeats.length} planned scenes not found in draft`);
  }
  if (addedBeats.length > 0) {
    evidence.push(`⚠ Added beats: ${addedBeats.length} unplanned scenes found in draft`);
  }

  return {
    chapter: chapterNumber,
    plannedBeats,
    actualBeats,
    matched,
    missingBeats,
    addedBeats,
    driftedBeats,
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

function loadPlannedBeats(projectRoot: string, chapterNumber: number): PlannedBeat[] {
  const outlinePath = path.join(projectRoot, 'book', 'outline.md');
  let content = '';
  if (fs.existsSync(outlinePath)) {
    content = fs.readFileSync(outlinePath, 'utf-8');
  } else {
    const shardDir = path.join(projectRoot, 'book', 'outline');
    if (fs.existsSync(shardDir)) {
      const shards = fs.readdirSync(shardDir).filter(f => f.endsWith('.md')).sort();
      content = shards.map(s => fs.readFileSync(path.join(shardDir, s), 'utf-8')).join('\n\n');
    }
  }

  if (!content) return [];

  // Find chapter block
  const chapterRegex = new RegExp(`^##\\s+Chapter\\s+${chapterNumber}\\s*[:\\-—]?\\s*(.*)$`, 'im');
  const match = content.match(chapterRegex);
  if (!match) return [];

  const startIdx = match.index ?? 0;
  const nextChapterRegex = /^##\s+Chapter\s+\d+/im;
  nextChapterRegex.lastIndex = startIdx + 1;
  const nextMatch = content.slice(startIdx + 1).match(nextChapterRegex);
  const endIdx = nextMatch ? startIdx + 1 + (nextMatch.index ?? 0) : content.length;
  const block = content.slice(startIdx, endIdx);

  // Parse scene beats
  const beats: PlannedBeat[] = [];
  const sceneRegex = /(?:[-*]\s*\*\*Scene\s+(\d+):?\*\*|###\s+Scene\s+(\d+))\s*(.*)$/gim;
  const sceneMatches = [...block.matchAll(sceneRegex)];
  for (const sm of sceneMatches) {
    const sceneNum = parseInt(sm[1] || sm[2]);
    const line = sm[3].trim();
    let goal = '';
    let conflict = '';
    const inlineMatch = line.match(/^(.+?)(?:\.|\;|\n)\s*(?:Conflict|Conflict:)\s*(.+)$/i);
    if (inlineMatch) {
      goal = inlineMatch[1].trim();
      conflict = inlineMatch[2].trim();
    } else {
      goal = line;
    }
    beats.push({ sceneNumber: sceneNum, goal, conflict });
  }
  return beats;
}

function extractActualBeats(xmlContent: string): ActualBeat[] {
  const beats: ActualBeat[] = [];
  const sceneRegex = /<scene\s+number="(\d+)"\s+type="([^"]*)"\s+goal="([^"]*)"\s+conflict="([^"]*)"[^>]*>/g;
  const matches = [...xmlContent.matchAll(sceneRegex)];
  for (const m of matches) {
    beats.push({
      sceneNumber: parseInt(m[1]),
      goal: m[3],
      conflict: m[4],
      pacing: m[2],
    });
  }

  // Fallback: if no goal/conflict attributes, extract from scene content
  if (beats.length === 0) {
    const sceneContentRegex = /<scene\s+number="(\d+)"[^>]*>([\s\S]*?)<\/scene>/g;
    const contentMatches = [...xmlContent.matchAll(sceneContentRegex)];
    for (const m of contentMatches) {
      const content = m[2];
      const goalMatch = content.match(/<(?:scene-goal|goal)>([\s\S]*?)<\/(?:scene-goal|goal)>/);
      const conflictMatch = content.match(/<(?:scene-conflict|conflict)>([\s\S]*?)<\/(?:scene-conflict|conflict)>/);
      beats.push({
        sceneNumber: parseInt(m[1]),
        goal: goalMatch ? goalMatch[1].trim() : '',
        conflict: conflictMatch ? conflictMatch[1].trim() : '',
        pacing: '',
      });
    }
  }

  return beats;
}

function findBestMatch(
  planned: PlannedBeat,
  actuals: ActualBeat[],
  used: Set<number>
): { beat: ActualBeat; index: number; quality: 'exact' | 'close' | 'partial'; driftDescription?: string } | null {
  let best: { beat: ActualBeat; index: number; quality: 'exact' | 'close' | 'partial'; driftDescription?: string } | null = null;
  let bestScore = 0;

  for (let i = 0; i < actuals.length; i++) {
    if (used.has(i)) continue;
    const actual = actuals[i];
    const score = similarity(planned.goal, actual.goal);
    if (score > bestScore) {
      bestScore = score;
      let quality: 'exact' | 'close' | 'partial';
      if (score > 0.8) quality = 'exact';
      else if (score > 0.5) quality = 'close';
      else quality = 'partial';

      best = {
        beat: actual,
        index: i,
        quality,
        driftDescription: quality === 'partial' ? `Planned: "${planned.goal}" → Actual: "${actual.goal}"` : undefined,
      };
    }
  }

  return best;
}

function similarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const bWords = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  let common = 0;
  for (const w of aWords) if (bWords.has(w)) common++;
  return (common / Math.max(aWords.size, bWords.size));
}

export function reverseOutlineToGateResult(report: ReverseOutlineReport): GateResult {
  return {
    gate: 'reverse-outline',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}