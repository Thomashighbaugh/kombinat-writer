/**
 * Emotional Beat Arc Tracking
 *
 * Parses <beatchange> tags from the XML draft to construct the emotional
 * trajectory of each chapter. Verifies the arc is coherent (not flat or
 * repetitive) and connects to adjacent chapters' arcs.
 *
 * Uses the XML structure's existing <beatchange from="X" to="Y" trigger="Z" />
 * tags — this is analysis of data the drafting phase already produces.
 */

import { GateResult } from './quality-gates.js';

export interface BeatArcReport {
  chapter: number;
  beats: BeatChange[];
  arcShape: string;          // e.g., "tension→release→tension→climax"
  arcDescription: string;    // e.g., "Rising tension with one release before climax"
  flatStreak: number;         // consecutive same-emotion beats
  repeatedPatterns: string[];// beat patterns that repeat
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface BeatChange {
  from: string;
  to: string;
  trigger: string;
  sceneNumber: number;
}

const FLAT_STREAK_THRESHOLD = 3;     // >3 consecutive same-emotion beats = flat
const REPETITION_THRESHOLD = 2;     // same from→to pattern appearing 2+ times

export function analyzeBeatArc(
  xmlContent: string,
  chapterNumber: number
): BeatArcReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  // Extract all <beatchange> tags with their scene context
  const beats = extractBeatChanges(xmlContent);

  if (beats.length === 0) {
    blocking.push('Beat arc: No <beatchange> tags found — draft must track emotional shifts for arc analysis');
    return {
      chapter: chapterNumber,
      beats: [],
      arcShape: 'unknown',
      arcDescription: 'No beat data',
      flatStreak: 0,
      repeatedPatterns: [],
      passed: false,
      blocking,
      warnings,
      evidence,
    };
  }

  evidence.push(`✓ Beat arc: ${beats.length} emotional beat changes tracked`);

  // Build arc shape
  const arcParts: string[] = [];
  let currentEmotion = beats[0].from;
  arcParts.push(currentEmotion);
  for (const beat of beats) {
    arcParts.push(beat.to);
  }
  const arcShape = arcParts.join('→');
  evidence.push(`✓ Arc shape: ${arcShape}`);

  // Detect flat streaks (consecutive same-emotion)
  let flatStreak = 0;
  let maxFlatStreak = 0;
  let currentEmotion2 = beats[0].to;
  for (const beat of beats) {
    if (beat.to === currentEmotion2) {
      flatStreak++;
    } else {
      maxFlatStreak = Math.max(maxFlatStreak, flatStreak);
      flatStreak = 0;
      currentEmotion2 = beat.to;
    }
  }
  maxFlatStreak = Math.max(maxFlatStreak, flatStreak);

  if (maxFlatStreak > FLAT_STREAK_THRESHOLD) {
    warnings.push(`Flat emotional streak: ${maxFlatStreak} consecutive beats with same emotion — consider adding emotional variety`);
  } else {
    evidence.push(`✓ Flat streak: max ${maxFlatStreak} consecutive same-emotion beats (threshold: ${FLAT_STREAK_THRESHOLD})`);
  }

  // Detect repeated from→to patterns
  const patternMap: Record<string, number> = {};
  for (const beat of beats) {
    const pattern = `${beat.from}→${beat.to}`;
    patternMap[pattern] = (patternMap[pattern] || 0) + 1;
  }

  const repeatedPatterns: string[] = [];
  for (const [pattern, count] of Object.entries(patternMap)) {
    if (count >= REPETITION_THRESHOLD) {
      repeatedPatterns.push(`${pattern} (×${count})`);
      if (count >= 3) {
        warnings.push(`Repetitive beat pattern: "${pattern}" appears ${count} times — the emotional arc is cycling rather than progressing`);
      }
    }
  }

  if (repeatedPatterns.length === 0) {
    evidence.push(`✓ Beat repetition: No from→to patterns repeated ${REPETITION_THRESHOLD}+ times`);
  }

  // Build arc description
  const arcDescription = describeArc(beats);
  evidence.push(`✓ Arc description: ${arcDescription}`);

  return {
    chapter: chapterNumber,
    beats,
    arcShape,
    arcDescription,
    flatStreak: maxFlatStreak,
    repeatedPatterns,
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

function extractBeatChanges(xmlContent: string): BeatChange[] {
  const beats: BeatChange[] = [];
  // Match <beatchange from="X" to="Y" trigger="Z" /> (self-closing or with content)
  const regex = /<beatchange\s+[^>]*?from="([^"]*)"[^>]*?to="([^"]*)"[^>]*?(?:trigger="([^"]*)")?[^>]*?\/?>/gi;
  const matches = [...xmlContent.matchAll(regex)];

  // Also find which scene each beat belongs to
  const sceneRegex = /<scene\s+number="(\d+)"[^>]*>([\s\S]*?)<\/scene>/g;
  const sceneMatches = [...xmlContent.matchAll(sceneRegex)];

  for (const m of matches) {
    const beatIndex = m.index ?? 0;
    let sceneNumber = 0;
    for (const sm of sceneMatches) {
      const sceneStart = sm.index ?? 0;
      const sceneEnd = sceneStart + sm[0].length;
      if (beatIndex >= sceneStart && beatIndex < sceneEnd) {
        sceneNumber = parseInt(sm[1]);
        break;
      }
    }
    beats.push({
      from: m[1],
      to: m[2],
      trigger: m[3] || '',
      sceneNumber,
    });
  }

  return beats;
}

function describeArc(beats: BeatChange[]): string {
  if (beats.length === 0) return 'No beats';

  const emotions = beats.map(b => b.to);
  const uniqueEmotions = [...new Set(emotions)];

  // Check for common arc shapes
  const first = emotions[0];
  const last = emotions[emotions.length - 1];

  if (uniqueEmotions.length <= 2) {
    return `Static arc — oscillates between ${uniqueEmotions.join(' and ')}`;
  }

  // Detect rising arc
  const tensionWords = ['tension', 'fear', 'anger', 'dread', 'anxiety', 'panic', 'horror', 'despair'];
  const reliefWords = ['relief', 'calm', 'peace', 'hope', 'joy', 'contentment', 'release'];
  const lastTension = emotions.findIndex(e => tensionWords.some(t => e.toLowerCase().includes(t)));
  const lastRelief = emotions.findIndex(e => reliefWords.some(r => e.toLowerCase().includes(r)));

  if (last && tensionWords.some(t => last.toLowerCase().includes(t))) {
    return `Rising arc to ${last} — tension/darkness dominates the ending`;
  }
  if (last && reliefWords.some(r => last.toLowerCase().includes(r))) {
    return `Arc resolving to ${last} — emotional release at chapter end`;
  }

  return `Complex arc through ${uniqueEmotions.length} emotional states (${first}→...→${last})`;
}

// ─── Cross-Chapter Arc Analysis ─────────────────────────────────────────────

export function analyzeCrossChapterArcs(
  projectRoot: string,
  chapterRange: [number, number]
): { arcMap: Record<number, string>; gaps: string[]; evidence: string[] } {
  const fs = require('fs');
  const path = require('path');
  const draftsDir = path.join(projectRoot, 'book', 'drafts');
  const arcMap: Record<number, string> = {};
  const gaps: string[] = [];
  const evidence: string[] = [];

  for (let ch = chapterRange[0]; ch <= chapterRange[1]; ch++) {
    const xmlPath = path.join(draftsDir, `chapter_${String(ch).padStart(5, '0')}.xml`);
    if (!fs.existsSync(xmlPath)) {
      gaps.push(`Chapter ${ch}: no XML draft found — cannot analyze arc`);
      continue;
    }
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const report = analyzeBeatArc(xmlContent, ch);
    arcMap[ch] = report.arcShape;
    evidence.push(`Chapter ${ch}: ${report.arcDescription}`);
  }

  // Check for arc continuity between adjacent chapters
  const chapterNums = Object.keys(arcMap).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < chapterNums.length - 1; i++) {
    const current = arcMap[chapterNums[i]];
    const next = arcMap[chapterNums[i + 1]];
    // The last emotion of chapter N should connect to the first of N+1
    // This is a soft check — we note the transition for awareness
    evidence.push(`Transition ${chapterNums[i]}→${chapterNums[i + 1]}: ${current.split('→').pop()} → ${next.split('→')[0]}`);
  }

  return { arcMap, gaps, evidence };
}

// ─── Integration ────────────────────────────────────────────────────────────

export function beatArcToGateResult(report: BeatArcReport): GateResult {
  return {
    gate: 'beat-arc',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}