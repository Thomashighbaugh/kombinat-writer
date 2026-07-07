/**
 * Subtext Loading Assessment
 *
 * For each dialogue passage, assess whether characters speak with
 * subtext (saying one thing, meaning another) vs on-the-nose
 * (stating exactly what they mean). Flag passages where characters
 * say exactly what they're thinking with no hidden layer.
 *
 * AI-written dialogue tends to be on-the-nose because the model
 * optimizes for clarity. Professional fiction uses subtext for depth.
 */

import { GateResult } from './quality-gates.js';

export interface SubtextReport {
  chapter: number;
  dialogueBlocks: DialogueAnalysis[];
  onTheNoseCount: number;
  subtextCount: number;
  onTheNoseRatio: number;
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface DialogueAnalysis {
  speaker: string;
  emotion: string;
  subtext: string;          // declared subtext from XML attribute
  text: string;
  assessment: 'on-the-nose' | 'subtext' | 'partial';
  reason: string;
}

const ON_THE_NOSE_THRESHOLD = 0.4;  // >40% on-the-nose = warning

export function analyzeSubtext(
  xmlContent: string,
  chapterNumber: number
): SubtextReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];
  const dialogueBlocks: DialogueAnalysis[] = [];

  // Extract all <dialogue> blocks
  const dialogueRegex = /<dialogue\s+speaker="([^"]*)"(?:\s+emotion="([^"]*)")?(?:\s+subtext="([^"]*)")?[^>]*>([\s\S]*?)<\/dialogue>/g;
  const matches = [...xmlContent.matchAll(dialogueRegex)];

  if (matches.length === 0) {
    blocking.push('Subtext analysis: No <dialogue> blocks found — cannot assess dialogue quality');
    return { chapter: chapterNumber, dialogueBlocks: [], onTheNoseCount: 0, subtextCount: 0, onTheNoseRatio: 0, passed: false, blocking, warnings, evidence };
  }

  let onTheNoseCount = 0;
  let subtextCount = 0;

  for (const m of matches) {
    const speaker = m[1];
    const emotion = m[2] || '';
    const subtext = m[3] || '';
    const text = m[4].trim();

    // Determine if on-the-nose or subtextual
    let assessment: 'on-the-nose' | 'subtext' | 'partial' = 'subtext';
    let reason = '';

    if (!subtext || subtext.trim() === '' || subtext.toLowerCase() === 'none') {
      // No subtext declared — check if dialogue text directly states emotion
      const emotionWords = emotion.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const textLower = text.toLowerCase();
      const directEmotionMatch = emotionWords.some(w => textLower.includes(w));

      if (directEmotionMatch) {
        assessment = 'on-the-nose';
        reason = `Dialogue directly states emotion "${emotion}" — character says exactly what they feel`;
        onTheNoseCount++;
      } else if (text.length < 20) {
        assessment = 'partial';
        reason = `Short dialogue with no declared subtext — may be functional but lacks depth`;
        onTheNoseCount++;
      } else {
        // No subtext attribute, but dialogue doesn't directly state emotion
        assessment = 'partial';
        reason = `No subtext declared in XML — assess whether dialogue has hidden meaning`;
        onTheNoseCount++;
      }
    } else {
      // Subtext is declared — verify it differs from surface text
      const subtextLower = subtext.toLowerCase();
      const textLower = text.toLowerCase();

      // Check if subtext is just a restatement of the dialogue
      const subtextWords = subtextLower.split(/\s+/).filter(w => w.length > 3);
      const textWords = textLower.split(/\s+/).filter(w => w.length > 3);
      const commonWords = subtextWords.filter(w => textWords.includes(w));
      const overlapRatio = subtextWords.length > 0 ? commonWords.length / subtextWords.length : 0;

      if (overlapRatio > 0.7) {
        assessment = 'on-the-nose';
        reason = `Subtext "${subtext}" largely restates the dialogue text — not real subtext`;
        onTheNoseCount++;
      } else {
        assessment = 'subtext';
        reason = `Subtext "${subtext}" differs from surface text — good subtextual layer`;
        subtextCount++;
      }
    }

    dialogueBlocks.push({ speaker, emotion, subtext, text, assessment, reason });
  }

  const onTheNoseRatio = matches.length > 0 ? onTheNoseCount / matches.length : 0;

  evidence.push(`✓ Dialogue blocks: ${matches.length}`);
  evidence.push(`✓ Subtextual: ${subtextCount} (${((1 - onTheNoseRatio) * 100).toFixed(0)}%)`);
  evidence.push(`✓ On-the-nose: ${onTheNoseCount} (${(onTheNoseRatio * 100).toFixed(0)}%)`);

  if (onTheNoseRatio > ON_THE_NOSE_THRESHOLD) {
    warnings.push(`On-the-nose dialogue: ${(onTheNoseRatio * 100).toFixed(0)}% of dialogue states exactly what characters mean (threshold: ${ON_THE_NOSE_THRESHOLD * 100}%). Add subtext — characters rarely say exactly what they think.`);
  } else {
    evidence.push(`✓ On-the-nose ratio: ${(onTheNoseRatio * 100).toFixed(0)}% (threshold: ${ON_THE_NOSE_THRESHOLD * 100}%)`);
  }

  // Flag specific on-the-nose passages
  for (const d of dialogueBlocks.filter(b => b.assessment === 'on-the-nose').slice(0, 3)) {
    warnings.push(`${d.speaker}: "${d.text.slice(0, 50)}..." — ${d.reason}`);
  }

  return {
    chapter: chapterNumber,
    dialogueBlocks,
    onTheNoseCount,
    subtextCount,
    onTheNoseRatio,
    passed: blocking.length === 0,
    blocking,
    warnings,
    evidence,
  };
}

export function subtextToGateResult(report: SubtextReport): GateResult {
  return {
    gate: 'subtext',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}