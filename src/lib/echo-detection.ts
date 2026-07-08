/**
 * Echo & Repetition Detection
 *
 * Detects unintentional repetition at multiple levels:
 *   - Word echo: same word within 3 sentences
 *   - Structural echo: same sentence structure pattern
 *   - Beat pattern echo: same scene beat sequence across scenes
 *   - Crutch word frequency: AI-typical crutch words overused
 *
 * All checks produce evidence with specific locations.
 * Word echo and crutch words are BLOCKS. Structural and beat echoes are warnings.
 */

import { GateResult } from './quality-gates.js';

/** Scan results for unintentional repetition across word structural and beat levels. */
export interface EchoReport {
  chapter: number;
  wordEchoes: WordEcho[];
  structuralEchoes: StructuralEcho[];
  beatEchoes: BeatEcho[];
  crutchWords: CrutchWordEntry[];
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface WordEcho {
  word: string;
  count: number;
  locations: string[];   // sentence numbers or quoted context
}

interface StructuralEcho {
  pattern: string;
  count: number;
  examples: string[];
}

interface BeatEcho {
  beatSequence: string;
  count: number;
  scenes: number[];
}

interface CrutchWordEntry {
  word: string;
  count: number;
  per1000: number;
}

// ─── Echo Detection ────────────────────────────────────────────────────────

const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'of', 'for',
  'with', 'from', 'by', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'can', 'that', 'this', 'these', 'those', 'it', 'its',
  'he', 'she', 'they', 'we', 'you', 'i', 'his', 'her', 'their', 'our', 'your',
  'my', 'me', 'him', 'them', 'us', 'who', 'whom', 'whose', 'which', 'what',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'then', 'here', 'there',
  'up', 'down', 'out', 'over', 'under', 'again', 'once', 'if', 'because',
  'while', 'during', 'before', 'after', 'above', 'below', 'between', 'through',
  'about', 'against', 'into', 'through', 'during', 'per', 'via', 'one', 'two',
  'said', 'says', 'say',
]);

/** Scan XML content for word echoes crutch words structural repetition and beat pattern echoes. */
export function detectEchoes(
  xmlContent: string,
  chapterNumber: number
): EchoReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  const cleanText = stripXmlTags(xmlContent);
  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;

  // ── 1. Word Echo (BLOCK: >3 significant word echoes) ──
  const wordEchoes = detectWordEchoes(sentences);
  const significantEchoes = wordEchoes.filter(e => e.count >= 3);
  if (significantEchoes.length > 3) {
    for (const echo of significantEchoes.slice(0, 5)) {
      blocking.push(`Word echo: "${echo.word}" appears ${echo.count} times in close proximity. Locations: ${echo.locations.slice(0, 3).join(', ')}`);
    }
  } else {
    evidence.push(`✓ Word echo: ${wordEchoes.length} echoes found, ${significantEchoes.length} significant (threshold: >3 significant echoes)`);
  }

  // ── 2. Crutch Word Frequency (BLOCK: top crutch >3 per 1000) ──
  const crutchWords = detectCrutchWords(cleanText, wordCount);
  const overusedCrutch = crutchWords.filter(c => c.per1000 > 3);
  if (overusedCrutch.length > 0) {
    for (const cw of overusedCrutch.slice(0, 3)) {
      blocking.push(`Crutch word "${cw.word}": ${cw.count} occurrences (${cw.per1000.toFixed(1)}/1000 words). This is an AI-writing marker.`);
    }
  } else {
    evidence.push(`✓ Crutch words: ${crutchWords.length} detected, none above 3/1000 threshold`);
  }

  // ── 3. Structural Echo (WARNING: same sentence openers >5 times) ──
  const structuralEchoes = detectStructuralEchoes(sentences);
  const repetitiveStructure = structuralEchoes.filter(e => e.count >= 5);
  for (const echo of repetitiveStructure) {
    warnings.push(`Structural echo: "${echo.pattern}" used ${echo.count} times. Examples: ${echo.examples.slice(0, 2).join(' | ')}`);
  }
  if (repetitiveStructure.length === 0) {
    evidence.push(`✓ Structural echo: No sentence-opening patterns repeated 5+ times`);
  }

  // ── 4. Beat Pattern Echo (WARNING: same beat sequence across scenes) ──
  const beatEchoes = detectBeatEchoes(xmlContent);
  for (const echo of beatEchoes) {
    warnings.push(`Beat echo: Scene beat sequence "${echo.beatSequence}" repeated in scenes ${echo.scenes.join(', ')}`);
  }
  if (beatEchoes.length === 0) {
    evidence.push(`✓ Beat echo: No repeated scene beat sequences detected`);
  }

  return {
    chapter: chapterNumber,
    wordEchoes,
    structuralEchoes,
    beatEchoes,
    crutchWords,
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?\w+[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectWordEchoes(sentences: string[]): WordEcho[] {
  const echoes: WordEcho[] = [];
  const echoMap: Record<string, { count: number; locations: string[] }> = {};

  // Check within sliding window of 3 sentences
  for (let i = 0; i < sentences.length; i++) {
    const window = sentences.slice(i, Math.min(i + 3, sentences.length));
    const windowText = window.join(' ').toLowerCase();
    const words = windowText.split(/\s+/).filter(w => w.length > 3 && !COMMON_WORDS.has(w));

    const wordSet: Record<string, number> = {};
    for (const w of words) {
      wordSet[w] = (wordSet[w] || 0) + 1;
    }

    for (const [word, count] of Object.entries(wordSet)) {
      if (count >= 2) {
        if (!echoMap[word]) {
          echoMap[word] = { count: 0, locations: [] };
        }
        echoMap[word].count += count;
        if (echoMap[word].locations.length < 5) {
          echoMap[word].locations.push(`S${i + 1}`);
        }
      }
    }
  }

  for (const [word, data] of Object.entries(echoMap)) {
    if (data.count >= 3) {
      echoes.push({ word, count: data.count, locations: data.locations });
    }
  }

  return echoes.sort((a, b) => b.count - a.count);
}

const CRUTCH_WORDS_LIST = [
  'suddenly', 'somehow', 'literally', 'actually', 'basically', 'simply',
  'totally', 'definitely', 'probably', 'perhaps', 'maybe', 'somewhat',
  'rather', 'fairly', 'quite', 'really', 'very', 'just',
  'seemed to', 'appeared to', 'began to', 'started to',
  'a sense of', 'a feeling of', 'a kind of', 'a sort of',
  'couldn\'t help but', 'couldn\'t help noticing',
  'something about', 'for a moment', 'in that moment',
  'without warning', 'out of nowhere', 'all of a sudden',
];

function detectCrutchWords(text: string, wordCount: number): CrutchWordEntry[] {
  const lowerText = text.toLowerCase();
  const entries: CrutchWordEntry[] = [];

  for (const cw of CRUTCH_WORDS_LIST) {
    let count: number;
    if (cw.includes(' ')) {
      const regex = new RegExp(cw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      count = (lowerText.match(regex) || []).length;
    } else {
      const regex = new RegExp(`\\b${cw}\\b`, 'g');
      count = (lowerText.match(regex) || []).length;
    }
    if (count > 0) {
      entries.push({
        word: cw,
        count,
        per1000: wordCount > 0 ? (count / wordCount) * 1000 : 0,
      });
    }
  }

  return entries.sort((a, b) => b.per1000 - a.per1000);
}

function detectStructuralEchoes(sentences: string[]): StructuralEcho[] {
  const echoes: StructuralEcho[] = [];
  const patternMap: Record<string, { count: number; examples: string[] }> = {};

  for (const sentence of sentences) {
    // Extract sentence opening pattern (first 2-3 words, normalized)
    const words = sentence.trim().split(/\s+/);
    if (words.length < 2) continue;

    // Pattern 1: First word
    const opener = words[0].toLowerCase().replace(/[^a-z]/g, '');
    if (opener.length < 2) continue;

    // Pattern 2: Sentence structure (The + noun, He + verb, etc.)
    let pattern = opener;
    if (words.length > 1) {
      const second = words[1].toLowerCase().replace(/[^a-z]/g, '');
      if (second.length > 0) {
        pattern += ' + ' + second;
      }
    }

    if (!patternMap[pattern]) {
      patternMap[pattern] = { count: 0, examples: [] };
    }
    patternMap[pattern].count++;
    if (patternMap[pattern].examples.length < 3) {
      patternMap[pattern].examples.push(sentence.trim().slice(0, 60));
    }
  }

  for (const [pattern, data] of Object.entries(patternMap)) {
    if (data.count >= 5) {
      echoes.push({ pattern, count: data.count, examples: data.examples });
    }
  }

  return echoes.sort((a, b) => b.count - a.count);
}

function detectBeatEchoes(xmlContent: string): BeatEcho[] {
  // Extract beat sequences from scenes
  const sceneRegex = /<scene\s+[^>]*>([\s\S]*?)<\/scene>/g;
  const scenes = [...xmlContent.matchAll(sceneRegex)];

  const beatSequences: string[][] = [];
  for (const scene of scenes) {
    const sceneContent = scene[1];
    const beats: string[] = [];
    // Extract beat types in order
    const tagRegex = /<(narration|dialogue|action|interiority|beatchange|sensory-inject)\s/g;
    const tagMatches = [...sceneContent.matchAll(tagRegex)];
    for (const m of tagMatches) {
      beats.push(m[1]);
    }
    beatSequences.push(beats);
  }

  // Compare sequences for repetition
  const echoes: BeatEcho[] = [];
  for (let i = 0; i < beatSequences.length; i++) {
    for (let j = i + 1; j < beatSequences.length; j++) {
      const seq1 = beatSequences[i].join('→');
      const seq2 = beatSequences[j].join('→');
      if (seq1 === seq2 && seq1.length > 10) {
        // Check if this echo is already recorded
        const existing = echoes.find(e => e.beatSequence === seq1);
        if (existing) {
          if (!existing.scenes.includes(j + 1)) existing.scenes.push(j + 1);
        } else {
          echoes.push({ beatSequence: seq1, count: 2, scenes: [i + 1, j + 1] });
        }
      }
    }
  }

  return echoes;
}

// ─── Integration ────────────────────────────────────────────────────────────

/** Convert an echo report into a standard quality-gate result. */
export function echoReportToGateResult(report: EchoReport): GateResult {
  return {
    gate: 'echo-detection',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}