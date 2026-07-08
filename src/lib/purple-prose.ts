/**
 * Purple Prose & Overwriting Detection
 *
 * Flag passages with excessive ornamentation: too many adjectives
 * per noun, too many adverbs per verb, extended metaphors, similes
 * that don't land, elevated register where simple would be stronger.
 *
 * AI writing in creative mode tends to overwrite — the model reaches
 * for the fancy synonym, the extended metaphor, the unnecessary
 * modifier.
 */

import { GateResult } from './quality-gates.js';

/** Per-chapter report of purple prose and overwriting metrics. */
export interface PurpleProseReport {
  chapter: number;
  modifierRatio: number;       // adjectives+adverbs / total words
  metaphorDensity: number;     // metaphors+similes per 500 words
  purplePassages: PurplePassage[];
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface PurplePassage {
  preview: string;
  issue: string;
  wordCount: number;
}

const MODIFIER_THRESHOLD = 0.15;    // >15% modifiers = warning
const METAPHOR_THRESHOLD = 3;       // >3 per 500 words = warning

const METAPHOR_INDICATORS = [
  'like a', 'as if', 'as though', 'like the', 'reminded him of',
  'reminded her of', 'echoed the', 'mirrored the', 'a metaphor',
  'resembled', 'in the manner of', 'not unlike',
];

const ELEVATED_WORDS = [
  'resplendent', 'effervescent', 'magnificent', 'luminous', 'incandescent',
  'ethereal', 'transcendent', 'sublime', 'opulent', 'sumptuous',
  'iridescent', 'luminescent', 'scintillating', 'coruscating', 'nacreous',
  'gossamer', 'diaphanous', 'evanescent', 'ephemeral', 'chimerical',
  'verdant', 'susurrus', 'susurration', 'tintinnabulation', 'halcyon',
  'limpid', 'vitreous', 'lambent', 'pulchritude', 'pulchritudinous',
  'perspicacious', 'mellifluous', 'venerable', 'sagacious', 'opprobrious',
];

/** Scan XML chapter content for excessive modifiers, metaphors, and elevated vocabulary. */
export function detectPurpleProse(
  xmlContent: string,
  chapterNumber: number
): PurpleProseReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  const cleanText = stripXmlTags(xmlContent);
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  if (wordCount < 100) {
    return { chapter: chapterNumber, modifierRatio: 0, metaphorDensity: 0, purplePassages: [], passed: true, blocking, warnings, evidence: ['Too few words for purple prose analysis'] };
  }

  // Count adjectives and adverbs (heuristic)
  const adverbRegex = /\b\w+ly\b/gi;
  const adverbs = cleanText.match(adverbRegex) || [];
  // Adjectives: words before nouns (heuristic — words ending in -ful, -ous, -ive, -ic, -al, -less, -able)
  const adjectiveRegex = /\b\w+(?:ful|ous|ive|ic|al|less|able|ible|ish|like)\b/gi;
  const adjectives = cleanText.match(adjectiveRegex) || [];

  const modifierCount = adverbs.length + adjectives.length;
  const modifierRatio = modifierCount / wordCount;

  // Count metaphor/simile indicators
  let metaphorCount = 0;
  for (const indicator of METAPHOR_INDICATORS) {
    const regex = new RegExp(indicator.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    const matches = cleanText.match(regex) || [];
    metaphorCount += matches.length;
  }
  const metaphorDensity = (metaphorCount / wordCount) * 500;

  // Detect elevated vocabulary
  const lowerText = cleanText.toLowerCase();
  const elevatedFound: string[] = [];
  for (const word of ELEVATED_WORDS) {
    if (lowerText.includes(word)) {
      elevatedFound.push(word);
    }
  }

  // Find purple passages (contiguous text with high modifier/metaphor density)
  const purplePassages: PurplePassage[] = [];
  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentWords = sentence.split(/\s+/).filter(w => w.length > 0);
    if (sentWords.length < 8) continue;

    const sentAdverbs = sentence.match(adverbRegex) || [];
    const sentAdjectives = sentence.match(adjectiveRegex) || [];
    const sentModifiers = sentAdverbs.length + sentAdjectives.length;
    const sentModRatio = sentModifiers / sentWords.length;

    let sentMetaphors = 0;
    for (const indicator of METAPHOR_INDICATORS) {
      const regex = new RegExp(indicator.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      sentMetaphors += (sentence.match(regex) || []).length;
    }

    const sentElevated = ELEVATED_WORDS.filter(w => sentence.toLowerCase().includes(w));

    if (sentModRatio > 0.2 || sentMetaphors >= 2 || sentElevated.length >= 2) {
      const issues: string[] = [];
      if (sentModRatio > 0.2) issues.push(`${(sentModRatio * 100).toFixed(0)}% modifiers`);
      if (sentMetaphors >= 2) issues.push(`${sentMetaphors} metaphor/simile indicators`);
      if (sentElevated.length >= 2) issues.push(`elevated vocabulary: ${sentElevated.join(', ')}`);

      purplePassages.push({
        preview: sentence.trim().slice(0, 80),
        issue: issues.join('; '),
        wordCount: sentWords.length,
      });
    }
  }

  evidence.push(`✓ Modifier ratio: ${(modifierRatio * 100).toFixed(1)}% (threshold: ${(MODIFIER_THRESHOLD * 100).toFixed(0)}%)`);
  evidence.push(`✓ Metaphor density: ${metaphorDensity.toFixed(1)} per 500 words (threshold: ${METAPHOR_THRESHOLD})`);
  if (elevatedFound.length > 0) {
    evidence.push(`⚠ Elevated vocabulary: ${elevatedFound.join(', ')}`);
  }
  evidence.push(`✓ Purple passages: ${purplePassages.length}`);

  if (modifierRatio > MODIFIER_THRESHOLD) {
    warnings.push(`Modifier ratio: ${(modifierRatio * 100).toFixed(1)}% — excessive adjectives/adverbs. Cut modifiers and use stronger verbs/nouns.`);
  }
  if (metaphorDensity > METAPHOR_THRESHOLD) {
    warnings.push(`Metaphor density: ${metaphorDensity.toFixed(1)} per 500 words — too many similes/metaphors. Reserve figurative language for moments that deserve emphasis.`);
  }
  for (const passage of purplePassages.slice(0, 3)) {
    warnings.push(`Purple passage: "${passage.preview}..." — ${passage.issue}`);
  }

  return {
    chapter: chapterNumber,
    modifierRatio,
    metaphorDensity,
    purplePassages,
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

/** Convert a purple prose report into the generic GateResult format. */
export function purpleProseToGateResult(report: PurpleProseReport): GateResult {
  return {
    gate: 'purple-prose',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}