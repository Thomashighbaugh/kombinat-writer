/**
 * Sentence Rhythm & Variety Analysis
 *
 * Tracks sentence length distribution per chapter. AI writing tends
 * toward uniform sentence lengths (typically 15-25 words).
 * Professional prose varies sentence length strategically for
 * rhythm and emphasis.
 */

import { GateResult } from './quality-gates.js';

export interface RhythmReport {
  chapter: number;
  totalSentences: number;
  avgLength: number;
  minLength: number;
  maxLength: number;
  distribution: LengthBucket[];
  monotonyScore: number;      // 0-1, higher = more monotonous
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface LengthBucket {
  range: string;
  count: number;
  percentage: number;
}

const MONOTONY_THRESHOLD = 0.6;  // >60% sentences in same range = warning

export function analyzeSentenceRhythm(
  xmlContent: string,
  chapterNumber: number
): RhythmReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  const cleanText = stripXmlTags(xmlContent);
  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  if (sentences.length < 5) {
    warnings.push('Too few sentences for rhythm analysis (need at least 5)');
    return { chapter: chapterNumber, totalSentences: sentences.length, avgLength: 0, minLength: 0, maxLength: 0, distribution: [], monotonyScore: 0, passed: true, blocking, warnings, evidence };
  }

  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  const totalSentences = lengths.length;
  const avgLength = lengths.reduce((a, b) => a + b, 0) / totalSentences;
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);

  // Buckets: short (1-5), medium (6-15), long (16-25), very long (26+)
  const buckets = [
    { range: '1-5 (short)', min: 1, max: 5, count: 0 },
    { range: '6-15 (medium)', min: 6, max: 15, count: 0 },
    { range: '16-25 (long)', min: 16, max: 25, count: 0 },
    { range: '26+ (very long)', min: 26, max: Infinity, count: 0 },
  ];

  for (const len of lengths) {
    for (const b of buckets) {
      if (len >= b.min && len <= b.max) {
        b.count++;
        break;
      }
    }
  }

  const distribution: LengthBucket[] = buckets.map(b => ({
    range: b.range,
    count: b.count,
    percentage: totalSentences > 0 ? (b.count / totalSentences) * 100 : 0,
  }));

  // Monotony score: percentage of sentences in the most common bucket
  const maxBucketCount = Math.max(...buckets.map(b => b.count));
  const monotonyScore = maxBucketCount / totalSentences;

  evidence.push(`✓ Sentences: ${totalSentences}`);
  evidence.push(`✓ Average length: ${avgLength.toFixed(1)} words`);
  evidence.push(`✓ Range: ${minLength}–${maxLength} words`);
  evidence.push(`✓ Distribution: ${distribution.map(d => `${d.range}=${d.percentage.toFixed(0)}%`).join(', ')}`);

  if (monotonyScore > MONOTONY_THRESHOLD) {
    const dominantBucket = distribution.find(d => d.count === maxBucketCount);
    warnings.push(`Sentence rhythm monotony: ${(monotonyScore * 100).toFixed(0)}% of sentences are ${dominantBucket?.range} — vary sentence length for rhythm and emphasis. Short sentences punch. Long sentences flow. Mix them.`);
  } else {
    evidence.push(`✓ Monotony score: ${(monotonyScore * 100).toFixed(0)}% (threshold: ${MONOTONY_THRESHOLD * 100}%)`);
  }

  // Check for all-same-length consecutive sentences
  let consecutiveSame = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < lengths.length; i++) {
    if (Math.abs(lengths[i] - lengths[i - 1]) <= 2) {
      consecutiveSame++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveSame);
    } else {
      consecutiveSame = 1;
    }
  }

  if (maxConsecutive >= 5) {
    warnings.push(`Rhythm flat spot: ${maxConsecutive} consecutive sentences with similar length — break the pattern with a short sentence or a very long one.`);
  }

  return {
    chapter: chapterNumber,
    totalSentences,
    avgLength,
    minLength,
    maxLength,
    distribution,
    monotonyScore,
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?\w+[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function rhythmToGateResult(report: RhythmReport): GateResult {
  return {
    gate: 'sentence-rhythm',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}