/**
 * Escalation Curve Verification
 *
 * Verifies that stakes, obstacles, and emotional intensity increase
 * from act to act. No plateau longer than 2 chapters without
 * escalation. AI-written books often plateau because the model has
 * no sense of global escalation.
 */

import fs from 'fs-extra';
import path from 'path';

export interface EscalationReport {
  chapterIntensities: ChapterIntensity[];
  plateaus: Plateau[];
  descendingStretches: DescendingStretch[];
  overallTrend: 'rising' | 'flat' | 'descending' | 'mixed';
  evidence: string[];
}

interface ChapterIntensity {
  chapter: number;
  pacing: string;
  intensityScore: number;   // 0-10
  stakes: string;
  hasClimax: boolean;
}

interface Plateau {
  startChapter: number;
  endChapter: number;
  length: number;
  intensity: number;
}

interface DescendingStretch {
  startChapter: number;
  endChapter: number;
  startIntensity: number;
  endIntensity: number;
}

const PACING_INTENSITY: Record<string, number> = {
  'action': 8,
  'rising': 7,
  'climax': 10,
  'calm': 3,
  'resolution': 2,
  'foundation': 4,
  'deep-dive': 5,
  'synthesis': 6,
  'application': 6,
};

export function verifyEscalation(
  projectRoot: string
): EscalationReport {
  const evidence: string[] = [];
  const chapterIntensities: ChapterIntensity[] = [];

  // Parse XML drafts for pacing tags and stakes info
  const draftsDir = path.join(projectRoot, 'book', 'drafts');
  if (!fs.existsSync(draftsDir)) {
    return { chapterIntensities: [], plateaus: [], descendingStretches: [], overallTrend: 'flat', evidence: ['No drafts found'] };
  }

  const xmlFiles = fs.readdirSync(draftsDir).filter(f => f.endsWith('.xml')).sort();
  for (const xmlFile of xmlFiles) {
    const match = xmlFile.match(/chapter_(\d+)\.xml/);
    if (!match) continue;
    const chapterNum = parseInt(match[1]);
    const content = fs.readFileSync(path.join(draftsDir, xmlFile), 'utf-8');

    // Extract pacing from chapter tag
    const chapterTagMatch = content.match(/<chapter\s+[^>]*?pacing="([^"]*)"[^>]*?>/);
    const pacing = chapterTagMatch ? chapterTagMatch[1].toLowerCase() : '';
    let intensity = PACING_INTENSITY[pacing] || 5;

    // Check for climax indicators in content
    const hasClimax = /climax|final battle|confrontation|ultimate|showdown|reckoning/i.test(content);
    if (hasClimax) intensity = Math.max(intensity, 9);

    // Check for stakes escalation keywords
    const stakesKeywords = ['death', 'doom', 'destruction', 'end of', 'last chance', 'everything', 'lose all', 'never', 'final'];
    let stakes = '';
    for (const kw of stakesKeywords) {
      if (content.toLowerCase().includes(kw)) {
        stakes = kw;
        intensity = Math.max(intensity, 7);
        break;
      }
    }

    chapterIntensities.push({ chapter: chapterNum, pacing, intensityScore: intensity, stakes, hasClimax });
  }

  if (chapterIntensities.length === 0) {
    return { chapterIntensities: [], plateaus: [], descendingStretches: [], overallTrend: 'flat', evidence: ['No chapter data found'] };
  }

  evidence.push(`✓ Analyzed ${chapterIntensities.length} chapters for escalation`);

  // Detect plateaus (3+ chapters at same intensity)
  const plateaus: Plateau[] = [];
  let plateauStart = 0;
  let plateauIntensity = chapterIntensities[0].intensityScore;

  for (let i = 1; i <= chapterIntensities.length; i++) {
    const current = i < chapterIntensities.length ? chapterIntensities[i].intensityScore : -1;
    if (current === plateauIntensity) {
      // Continue plateau
    } else {
      const plateauLength = i - plateauStart;
      if (plateauLength >= 3 && plateauIntensity < 8) {
        plateaus.push({
          startChapter: chapterIntensities[plateauStart].chapter,
          endChapter: chapterIntensities[i - 1].chapter,
          length: plateauLength,
          intensity: plateauIntensity,
        });
        evidence.push(`⚠ Plateau: Ch${chapterIntensities[plateauStart].chapter}–Ch${chapterIntensities[i - 1].chapter} (${plateauLength} chapters at intensity ${plateauIntensity})`);
      }
      plateauStart = i;
      plateauIntensity = current;
    }
  }

  // Detect descending stretches (intensity decreasing over 2+ chapters)
  const descendingStretches: DescendingStretch[] = [];
  for (let i = 0; i < chapterIntensities.length - 1; i++) {
    let descLen = 0;
    for (let j = i; j < chapterIntensities.length - 1; j++) {
      if (chapterIntensities[j + 1].intensityScore < chapterIntensities[j].intensityScore) {
        descLen++;
      } else break;
    }
    if (descLen >= 2) {
      descendingStretches.push({
        startChapter: chapterIntensities[i].chapter,
        endChapter: chapterIntensities[i + descLen].chapter,
        startIntensity: chapterIntensities[i].intensityScore,
        endIntensity: chapterIntensities[i + descLen].intensityScore,
      });
      evidence.push(`✗ Descending: Ch${chapterIntensities[i].chapter}–Ch${chapterIntensities[i + descLen].chapter} (intensity ${chapterIntensities[i].intensityScore}→${chapterIntensities[i + descLen].intensityScore})`);
      i += descLen; // Skip ahead
    }
  }

  // Overall trend
  const firstIntensity = chapterIntensities[0].intensityScore;
  const lastIntensity = chapterIntensities[chapterIntensities.length - 1].intensityScore;
  const diff = lastIntensity - firstIntensity;
  let overallTrend: 'rising' | 'flat' | 'descending' | 'mixed';
  if (diff > 3) overallTrend = 'rising';
  else if (diff < -2) overallTrend = 'descending';
  else if (Math.abs(diff) <= 1 && plateaus.length > 0) overallTrend = 'flat';
  else overallTrend = 'mixed';

  evidence.push(`✓ Overall trend: ${overallTrend} (first=${firstIntensity}, last=${lastIntensity})`);

  if (overallTrend === 'flat') {
    evidence.push('✗ Overall trend is flat — stakes should escalate from beginning to end');
  }
  if (overallTrend === 'descending') {
    evidence.push('✗ Overall trend is descending — stakes decrease, book feels anti-climactic');
  }
  if (overallTrend === 'rising') {
    evidence.push('✓ Overall trend is rising — good escalation curve');
  }

  return { chapterIntensities, plateaus, descendingStretches, overallTrend, evidence };
}

export function formatEscalationReport(report: EscalationReport): string {
  const lines: string[] = [];
  lines.push('# Escalation Curve Verification');
  lines.push('');
  lines.push(`**Overall trend:** ${report.overallTrend}`);
  lines.push(`**Chapters analyzed:** ${report.chapterIntensities.length}`);
  lines.push(`**Plateaus:** ${report.plateaus.length}`);
  lines.push(`**Descending stretches:** ${report.descendingStretches.length}`);
  lines.push('');

  // Intensity chart
  lines.push('## Chapter Intensity');
  lines.push('| Chapter | Pacing | Intensity | Stakes | Climax |');
  lines.push('|---------|--------|-----------|--------|--------|');
  for (const ci of report.chapterIntensities) {
    const bar = '█'.repeat(Math.round(ci.intensityScore)) + '░'.repeat(10 - Math.round(ci.intensityScore));
    lines.push(`| Ch${ci.chapter} | ${ci.pacing} | ${bar} ${ci.intensityScore}/10 | ${ci.stakes || '—'} | ${ci.hasClimax ? '✓' : '—'} |`);
  }

  if (report.plateaus.length > 0) {
    lines.push('');
    lines.push('## Plateaus (3+ chapters at same intensity, no escalation)');
    for (const p of report.plateaus) {
      lines.push(`- Ch${p.startChapter}–Ch${p.endChapter}: ${p.length} chapters at intensity ${p.intensity}/10`);
    }
  }

  if (report.descendingStretches.length > 0) {
    lines.push('');
    lines.push('## Descending Stretches (intensity decreasing)');
    for (const d of report.descendingStretches) {
      lines.push(`- Ch${d.startChapter}–Ch${d.endChapter}: intensity ${d.startIntensity}→${d.endIntensity}`);
    }
  }

  return lines.join('\n');
}