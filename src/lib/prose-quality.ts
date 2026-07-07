/**
 * Prose Quality Scorecard
 *
 * Linguistic-level quality analysis that runs after the post-draft gate's
 * structural checks. Catches the most common AI-writing failure modes:
 * filter words, adverb density, telling-not-showing, passive voice,
 * info-dumps, tense/POV drift, and abstract-vs-concrete ratio.
 *
 * Must-have metrics are HARD BLOCKS. Should-have metrics are warnings.
 * All metrics produce evidence with specific counts and locations.
 */

import { GateResult } from './quality-gates.js';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ProseMetric {
  name: string;
  count: number;
  total: number;          // total words or clauses (the denominator)
  density: number;        // count / total, expressed as percentage or per-1000
  threshold: number;      // the limit
  passed: boolean;
  severity: 'block' | 'warning';
  evidence: string;       // specific examples found
}

export interface ProseQualityReport {
  chapter: number;
  wordCount: number;
  metrics: ProseMetric[];
  passed: boolean;       // true if no blocking metrics fail
  blocking: string[];
  warnings: string[];
  evidence: string[];
  scorecard: string;     // formatted markdown table
}

// ─── Filter Words ──────────────────────────────────────────────────────────

const FILTER_WORDS = [
  'saw', 'heard', 'felt', 'noticed', 'realized', 'seemed', 'appeared',
  'wondered', 'knew', 'thought', 'watched', 'observed', 'perceived',
  'recognized', 'sensed', 'imagined', 'remembered', 'recalled',
];

const CRUTCH_WORDS = [
  'just', 'really', 'very', 'quite', 'somehow', 'suddenly', 'literally',
  'actually', 'basically', 'simply', 'totally', 'definitely', 'probably',
  'perhaps', 'maybe', 'somehow', 'somewhat', 'rather', 'fairly',
  'a sense of', 'a feeling of', 'a kind of', 'a sort of',
  'seemed to', 'appeared to', 'began to', 'started to',
];

const PASSIVE_INDICATORS = /\b(?:was|were|is|are|been|being|be)\s+(\w+ed|written|done|gone|seen|heard|felt|known|thought|told|shown|given|taken|made|found|left|held|sent|brought|built|cast|caught|drawn|driven|fallen|forgotten|hidden|kept|laid|led|lost|put|set|stood|struck|thrown|worn)\b/gi;

// ─── Analyzer ──────────────────────────────────────────────────────────────

export function analyzeProseQuality(
  xmlContent: string,
  chapterNumber: number
): ProseQualityReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];
  const metrics: ProseMetric[] = [];

  // Extract clean text from XML (strip tags but keep prose content)
  const cleanText = stripXmlTags(xmlContent);
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Extract narration blocks specifically
  const narrationBlocks = extractBlocks(xmlContent, 'narration');
  const narrationText = narrationBlocks.join(' ');
  const narrationWords = narrationText.split(/\s+/).filter(w => w.length > 0);

  // Extract dialogue blocks
  const dialogueBlocks = extractBlocks(xmlContent, 'dialogue');
  const dialogueText = dialogueBlocks.join(' ');

  // ── 1. Filter Word Density (BLOCK: < 3 per 1000 words) ──
  {
    const found: string[] = [];
    const lowerText = cleanText.toLowerCase();
    for (const fw of FILTER_WORDS) {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const matches = lowerText.match(regex) || [];
      for (let i = 0; i < matches.length; i++) {
        found.push(fw);
      }
    }
    const per1000 = wordCount > 0 ? (found.length / wordCount) * 1000 : 0;
    const passed = per1000 <= 3;
    const examples = [...new Set(found)].slice(0, 5).join(', ');
    metrics.push({
      name: 'Filter word density',
      count: found.length,
      total: wordCount,
      density: per1000,
      threshold: 3,
      passed,
      severity: 'block',
      evidence: `Found: ${found.length} (${examples || 'none'}) — ${per1000.toFixed(1)} per 1000 words`,
    });
    if (!passed) {
      blocking.push(`Filter word density: ${per1000.toFixed(1)}/1000 (threshold: 3/1000) — filter words create narrative distance. Found ${found.length}: ${examples}`);
    } else {
      evidence.push(`✓ Filter word density: ${per1000.toFixed(1)}/1000 (threshold: 3/1000) — ${found.length} found`);
    }
  }

  // ── 2. Adverb Density (BLOCK: < 2% of words) ──
  {
    const adverbRegex = /\b\w+ly\b/gi;
    const adverbs = cleanText.match(adverbRegex) || [];
    // Exclude non-adverb -ly words (friendly, family, only, etc.)
    const nonAdverbs = ['only', 'family', 'reply', 'apply', 'supply', 'comply', 'fly', 'July', 'multiply', 'imply', 'barely'];
    const trueAdverbs = adverbs.filter(a => !nonAdverbs.includes(a.toLowerCase()));
    const percentage = wordCount > 0 ? (trueAdverbs.length / wordCount) * 100 : 0;
    const passed = percentage <= 2;
    const examples = [...new Set(trueAdverbs.map(a => a.toLowerCase()))].slice(0, 5).join(', ');
    metrics.push({
      name: 'Adverb density',
      count: trueAdverbs.length,
      total: wordCount,
      density: percentage,
      threshold: 2,
      passed,
      severity: 'block',
      evidence: `Found: ${trueAdverbs.length} (${examples || 'none'}) — ${percentage.toFixed(2)}% of words`,
    });
    if (!passed) {
      blocking.push(`Adverb density: ${percentage.toFixed(2)}% (threshold: 2%) — adverb-heavy prose signals telling over showing. Found ${trueAdverbs.length}: ${examples}`);
    } else {
      evidence.push(`✓ Adverb density: ${percentage.toFixed(2)}% (threshold: 2%) — ${trueAdverbs.length} found`);
    }
  }

  // ── 3. Passive Voice (BLOCK: < 5% of clauses) ──
  {
    const passiveMatches = cleanText.match(PASSIVE_INDICATORS) || [];
    // Rough clause count: sentences with verbs
    const sentenceCount = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const percentage = sentenceCount > 0 ? (passiveMatches.length / sentenceCount) * 100 : 0;
    const passed = percentage <= 5;
    const examples = passiveMatches.slice(0, 3).map(m => m.trim()).join('; ');
    metrics.push({
      name: 'Passive voice',
      count: passiveMatches.length,
      total: sentenceCount,
      density: percentage,
      threshold: 5,
      passed,
      severity: 'block',
      evidence: `Found: ${passiveMatches.length} passive constructions in ${sentenceCount} sentences — ${percentage.toFixed(1)}%`,
    });
    if (!passed) {
      blocking.push(`Passive voice: ${percentage.toFixed(1)}% of sentences (threshold: 5%) — passive voice distances the reader from action. Examples: ${examples}`);
    } else {
      evidence.push(`✓ Passive voice: ${percentage.toFixed(1)}% (threshold: 5%) — ${passiveMatches.length} found`);
    }
  }

  // ── 4. Info-Dump Detection (BLOCK: no passages >100 words without action/dialogue/sensory) ──
  {
    const infoDumps = detectInfoDumps(xmlContent);
    const passed = infoDumps.length === 0;
    metrics.push({
      name: 'Info-dump detection',
      count: infoDumps.length,
      total: narrationBlocks.length,
      density: infoDumps.length,
      threshold: 0,
      passed,
      severity: 'block',
      evidence: infoDumps.length > 0
        ? `Found ${infoDumps.length} info-dump passage(s): ${infoDumps.map(d => `${d.wordCount}w at "${d.preview}..."`).join('; ')}`
        : 'No info-dump passages detected',
    });
    if (!passed) {
      for (const dump of infoDumps) {
        blocking.push(`Info-dump: ${dump.wordCount} contiguous words of exposition without dialogue/action/sensory. Preview: "${dump.preview}..."`);
      }
    } else {
      evidence.push(`✓ Info-dump detection: No passages >100 words without narrative grounding`);
    }
  }

  // ── 5. Tense/POV Consistency (BLOCK: no mid-chapter drift) ──
  {
    const tenseCheck = checkTenseConsistency(xmlContent);
    metrics.push({
      name: 'Tense/POV consistency',
      count: tenseCheck.drifts.length,
      total: tenseCheck.totalBlocks,
      density: tenseCheck.drifts.length,
      threshold: 0,
      passed: tenseCheck.drifts.length === 0,
      severity: 'block',
      evidence: tenseCheck.drifts.length === 0
        ? `Consistent ${tenseCheck.primaryTense} tense, ${tenseCheck.primaryPov} POV`
        : `Drifts detected: ${tenseCheck.drifts.map(d => d.description).join('; ')}`,
    });
    if (tenseCheck.drifts.length > 0) {
      for (const drift of tenseCheck.drifts) {
        blocking.push(`Tense/POV drift: ${drift.description}`);
      }
    } else {
      evidence.push(`✓ Tense/POV consistency: ${tenseCheck.primaryTense}, ${tenseCheck.primaryPov} — no drift detected`);
    }
  }

  // ── 6. Showing vs Telling Ratio (WARNING: >60% showing) ──
  {
    const actionBeats = (xmlContent.match(/<action\s/g) || []).length;
    const sensoryInjects = (xmlContent.match(/<sensory-inject/g) || []).length;
    const interiorityBlocks = (xmlContent.match(/<interiority/g) || []).length;
    const beatChanges = (xmlContent.match(/<beatchange/g) || []).length;
    const showingMarkers = actionBeats + sensoryInjects + beatChanges;
    const tellingMarkers = interiorityBlocks; // interiority is telling (internal thought, not shown)
    const total = showingMarkers + tellingMarkers;
    const showingPct = total > 0 ? (showingMarkers / total) * 100 : 0;
    const passed = showingPct >= 60 || total < 5; // don't warn on very short chapters
    metrics.push({
      name: 'Showing vs telling ratio',
      count: showingMarkers,
      total,
      density: showingPct,
      threshold: 60,
      passed,
      severity: 'warning',
      evidence: `${showingMarkers} showing markers (action=${actionBeats}, sensory=${sensoryInjects}, beat-change=${beatChanges}) vs ${tellingMarkers} telling markers (interiority) — ${showingPct.toFixed(0)}% showing`,
    });
    if (!passed) {
      warnings.push(`Showing vs telling: ${showingPct.toFixed(0)}% showing (target: >60%) — consider replacing interiority with shown action or sensory detail`);
    } else {
      evidence.push(`✓ Showing vs telling: ${showingPct.toFixed(0)}% showing (threshold: 60%)`);
    }
  }

  // ── 7. Concrete vs Abstract Ratio (WARNING: >70% concrete) ──
  {
    const concreteRatio = computeConcreteRatio(cleanText);
    const passed = concreteRatio >= 70;
    metrics.push({
      name: 'Concrete language ratio',
      count: 0, // computed differently
      total: wordCount,
      density: concreteRatio,
      threshold: 70,
      passed,
      severity: 'warning',
      evidence: `${concreteRatio.toFixed(0)}% concrete language (target: >70%)`,
    });
    if (!passed) {
      warnings.push(`Concrete language ratio: ${concreteRatio.toFixed(0)}% (target: >70%) — prose may be too abstract. Use more specific nouns and sensory details.`);
    } else {
      evidence.push(`✓ Concrete language ratio: ${concreteRatio.toFixed(0)}% (threshold: 70%)`);
    }
  }

  // ── 8. Crutch Word Frequency (WARNING: < 5 per 1000) ──
  {
    const found: string[] = [];
    const lowerText = cleanText.toLowerCase();
    for (const cw of CRUTCH_WORDS) {
      if (cw.includes(' ')) {
        // Multi-word crutch
        const count = (lowerText.match(new RegExp(cw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;
        for (let i = 0; i < count; i++) found.push(cw);
      } else {
        const regex = new RegExp(`\\b${cw}\\b`, 'gi');
        const matches = lowerText.match(regex) || [];
        for (let i = 0; i < matches.length; i++) found.push(cw);
      }
    }
    const per1000 = wordCount > 0 ? (found.length / wordCount) * 1000 : 0;
    const passed = per1000 <= 5;
    const topWords: Record<string, number> = {};
    for (const w of found) topWords[w] = (topWords[w] || 0) + 1;
    const sorted = Object.entries(topWords).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, c]) => `${w}(${c})`).join(', ');
    metrics.push({
      name: 'Crutch word frequency',
      count: found.length,
      total: wordCount,
      density: per1000,
      threshold: 5,
      passed,
      severity: 'warning',
      evidence: `Found: ${found.length} (${sorted || 'none'}) — ${per1000.toFixed(1)} per 1000 words`,
    });
    if (!passed) {
      warnings.push(`Crutch word frequency: ${per1000.toFixed(1)}/1000 (threshold: 5/1000) — crutch words signal AI-writing patterns. Top: ${sorted}`);
    } else {
      evidence.push(`✓ Crutch word frequency: ${per1000.toFixed(1)}/1000 (threshold: 5/1000) — ${found.length} found`);
    }
  }

  // ── 9. Dialogue-to-Narration Ratio (WARNING: within genre expectations) ──
  {
    const dialogueWordCount = dialogueText.split(/\s+/).filter(w => w.length > 0).length;
    const narrationWordCount = narrationWords.length;
    const total = dialogueWordCount + narrationWordCount;
    const dialoguePct = total > 0 ? (dialogueWordCount / total) * 100 : 0;
    // No hard threshold — genre-dependent. Just report.
    metrics.push({
      name: 'Dialogue-to-narration ratio',
      count: dialogueWordCount,
      total,
      density: dialoguePct,
      threshold: 0, // informational
      passed: true,
      severity: 'warning',
      evidence: `${dialoguePct.toFixed(0)}% dialogue / ${(100 - dialoguePct).toFixed(0)}% narration`,
    });
    evidence.push(`✓ Dialogue-to-narration: ${dialoguePct.toFixed(0)}% / ${(100 - dialoguePct).toFixed(0)}% — informational (genre-dependent)`);
  }

  // Build scorecard
  const scorecard = buildScorecard(metrics, chapterNumber, wordCount);

  return {
    chapter: chapterNumber,
    wordCount,
    metrics,
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
    scorecard,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────

function stripXmlTags(xml: string): string {
  // Remove all XML tags, keep text content
  return xml
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?\w+[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBlocks(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'g');
  const matches = [...xml.matchAll(regex)];
  return matches.map(m => m[1].trim());
}

interface InfoDump {
  wordCount: number;
  preview: string;
}

function detectInfoDumps(xmlContent: string): InfoDump[] {
  const dumps: InfoDump[] = [];
  // Find contiguous <narration> blocks without intervening <dialogue>, <action>, or <sensory-inject>
  const narrationRegex = /<narration[^>]*>([\s\S]*?)<\/narration>/g;
  const narrationMatches = [...xmlContent.matchAll(narrationRegex)];

  // Check for consecutive narration blocks without grounding elements between them
  let contiguousText = '';
  let contiguousWordCount = 0;

  for (let i = 0; i < narrationMatches.length; i++) {
    const blockText = stripXmlTags(narrationMatches[i][1]);
    const blockWords = blockText.split(/\s+/).filter(w => w.length > 0);

    // Check if there's a grounding element between this and the previous narration block
    if (i > 0) {
      const between = xmlContent.slice(narrationMatches[i - 1].index! + narrationMatches[i - 1][0].length, narrationMatches[i].index);
      const hasGrounding = /<(?:dialogue|action|sensory-inject|beatchange|interiority)\s/.test(between);
      if (hasGrounding) {
        // Reset contiguous block
        if (contiguousWordCount > 100) {
          dumps.push({
            wordCount: contiguousWordCount,
            preview: contiguousText.slice(0, 80),
          });
        }
        contiguousText = '';
        contiguousWordCount = 0;
      }
    }

    contiguousText += ' ' + blockText;
    contiguousWordCount += blockWords.length;
  }

  // Check final accumulated block
  if (contiguousWordCount > 100) {
    dumps.push({
      wordCount: contiguousWordCount,
      preview: contiguousText.trim().slice(0, 80),
    });
  }

  return dumps;
}

interface TenseDrift {
  description: string;
}

function checkTenseConsistency(xmlContent: string): { primaryTense: string; primaryPov: string; drifts: TenseDrift[]; totalBlocks: number } {
  const narrationBlocks = extractBlocks(xmlContent, 'narration');
  const dialogueBlocks = extractBlocks(xmlContent, 'dialogue');

  // Detect tense from narration register attribute or content
  const presentTenseMarkers = /\b(?:is|are|am|do[es]?|has|have|go(?:es)?|come[s]?|see[s]?|say[s]?|walk[s]?|stand[s]?|sit[s]?)\b/gi;
  const pastTenseMarkers = /\b(?:was|were|did|had|went|came|saw|said|walked|stood|sat)\b/gi;

  let presentCount = 0;
  let pastCount = 0;

  for (const block of narrationBlocks) {
    presentCount += (block.match(presentTenseMarkers) || []).length;
    pastCount += (block.match(pastTenseMarkers) || []).length;
  }

  const primaryTense = pastCount > presentCount * 1.5 ? 'past' : presentCount > pastCount * 1.5 ? 'present' : 'mixed';

  // Detect POV from pronouns
  const firstPerson = (xmlContent.match(/\bI\b/g) || []).length;
  const thirdPerson = (xmlContent.match(/\b(?:he|she|they)\b/g) || []).length;
  const primaryPov = firstPerson > thirdPerson * 1.5 ? 'first-person' : 'third-person';

  // Check for drift: blocks that contradict the primary tense
  const drifts: TenseDrift[] = [];
  const totalBlocks = narrationBlocks.length;

  if (primaryTense === 'past') {
    for (let i = 0; i < narrationBlocks.length; i++) {
      const blockPresent = (narrationBlocks[i].match(presentTenseMarkers) || []).length;
      const blockPast = (narrationBlocks[i].match(pastTenseMarkers) || []).length;
      if (blockPresent > blockPast * 2 && blockPresent > 3) {
        drifts.push({ description: `Narration block ${i + 1}: shifts to present tense (${blockPresent} present markers vs ${blockPast} past markers)` });
      }
    }
  } else if (primaryTense === 'present') {
    for (let i = 0; i < narrationBlocks.length; i++) {
      const blockPresent = (narrationBlocks[i].match(presentTenseMarkers) || []).length;
      const blockPast = (narrationBlocks[i].match(pastTenseMarkers) || []).length;
      if (blockPast > blockPresent * 2 && blockPast > 3) {
        drifts.push({ description: `Narration block ${i + 1}: shifts to past tense (${blockPast} past markers vs ${blockPresent} present markers)` });
      }
    }
  }

  // Check POV drift
  if (primaryPov === 'third-person') {
    const firstPersonInNarration = narrationBlocks.join(' ').match(/\bI\b/g);
    if (firstPersonInNarration && firstPersonInNarration.length > 3) {
      drifts.push({ description: `First-person "I" appears ${firstPersonInNarration.length} times in narration despite third-person POV` });
    }
  }

  return { primaryTense, primaryPov, drifts, totalBlocks };
}

function computeConcreteRatio(text: string): number {
  // Heuristic: concrete nouns tend to be specific (capitalized, short, physical)
  // Abstract nouns tend to be longer, conceptual words
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const abstractIndicators = [
    'love', 'hate', 'fear', 'hope', 'despair', 'joy', 'sorrow', 'anger',
    'peace', 'war', 'freedom', 'justice', 'truth', 'beauty', 'evil', 'good',
    'destiny', 'fate', 'soul', 'spirit', 'mind', 'consciousness', 'existence',
    'nature', 'essence', 'principle', 'concept', 'idea', 'thought', 'feeling',
    'emotion', 'passion', 'desire', 'dream', 'nightmare', 'memory', 'shadow',
    'silence', 'darkness', 'light', 'time', 'eternity', 'infinity',
  ];

  let concrete = 0;
  let abstract = 0;
  for (const word of words) {
    if (abstractIndicators.includes(word)) {
      abstract++;
    } else {
      concrete++;
    }
  }

  const total = concrete + abstract;
  return total > 0 ? (concrete / total) * 100 : 100;
}

function buildScorecard(metrics: ProseMetric[], chapter: number, wordCount: number): string {
  const lines: string[] = [];
  lines.push(`## Prose Quality Scorecard: Chapter ${chapter}`);
  lines.push(`**Word count:** ${wordCount}`);
  lines.push('');
  lines.push('| Metric | Count | Density | Threshold | Severity | Status |');
  lines.push('|--------|-------|---------|-----------|----------|--------|');
  for (const m of metrics) {
    const status = m.passed ? '✓' : '✗';
    const densityStr = m.density.toFixed(1) + (m.name.includes('ratio') ? '%' : '');
    lines.push(`| ${m.name} | ${m.count} | ${densityStr} | ${m.threshold} | ${m.severity} | ${status} |`);
  }
  return lines.join('\n');
}

// ─── Integration with GateResult ────────────────────────────────────────────

export function proseQualityToGateResult(report: ProseQualityReport): GateResult {
  return {
    gate: 'prose-quality',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}