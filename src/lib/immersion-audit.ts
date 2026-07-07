/**
 * Immersion Break Audit
 *
 * Scans for passages that break the reader's immersive trance:
 * anachronisms, tone shifts, authorial intrusion, logic breaks,
 * references that pull the reader out of the world.
 */

import { GateResult } from './quality-gates.js';

export interface ImmersionReport {
  chapter: number;
  breaks: ImmersionBreak[];
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface ImmersionBreak {
  type: 'anachronism' | 'tone-shift' | 'authorial-intrusion' | 'logic-break' | 'meta-reference' | 'modernism' | 'info-dump-voice';
  preview: string;
  description: string;
}

export function auditImmersion(
  xmlContent: string,
  chapterNumber: number,
  settingContext?: string
): ImmersionReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];
  const breaks: ImmersionBreak[] = [];

  const cleanText = stripXmlTags(xmlContent);
  const lowerText = cleanText.toLowerCase();

  // ── Anachronism detection ──
  // Modern terms that would break historical/fantasy immersion
  const modernTerms = [
    'okay', 'ok', 'cool', 'awesome', 'guy', 'guys', 'kids', 'yeah',
    'no way', 'whatever', 'dude', 'basically', 'literally', 'totally',
    'cell phone', 'smartphone', 'phone', 'internet', 'website', 'email',
    'television', 'tv', 'movie', 'film', 'camera', 'photo', 'selfie',
    'okay so', 'like i said', 'you know', 'i mean',
    'google', 'search engine', 'app', 'download', 'upload', 'streaming',
  ];

  for (const term of modernTerms) {
    if (lowerText.includes(term)) {
      // Get context
      const idx = lowerText.indexOf(term);
      const start = Math.max(0, idx - 30);
      const end = Math.min(cleanText.length, idx + term.length + 30);
      breaks.push({
        type: 'modernism',
        preview: cleanText.slice(start, end).trim(),
        description: `Modern term "${term}" may break immersion in a pre-modern setting`,
      });
    }
  }

  // ── Authorial intrusion detection ──
  // Phrases that sound like the author explaining, not the narrator narrating
  const intrusionPhrases = [
    'it is worth noting that', 'it should be mentioned that',
    'needless to say', 'as the reader might expect', 'as you can imagine',
    'little did they know', 'little did he know', 'little did she know',
    'unbeknownst to', 'as fate would have it', 'it was at this moment',
    'in hindsight', 'looking back', 'upon reflection',
  ];

  for (const phrase of intrusionPhrases) {
    if (lowerText.includes(phrase)) {
      const idx = lowerText.indexOf(phrase);
      const start = Math.max(0, idx - 20);
      const end = Math.min(cleanText.length, idx + phrase.length + 40);
      breaks.push({
        type: 'authorial-intrusion',
        preview: cleanText.slice(start, end).trim(),
        description: `Authorial intrusion: "${phrase}" — show, don't tell the reader what to think`,
      });
    }
  }

  // ── Meta-reference detection ──
  // References to writing/storytelling that break the fourth wall
  const metaReferences = [
    'as the story', 'this narrative', 'our story', 'the tale of',
    'in this chapter', 'in the next chapter', 'as we shall see',
    'the reader will', 'the audience will',
  ];

  for (const phrase of metaReferences) {
    if (lowerText.includes(phrase)) {
      const idx = lowerText.indexOf(phrase);
      const start = Math.max(0, idx - 20);
      const end = Math.min(cleanText.length, idx + phrase.length + 40);
      breaks.push({
        type: 'meta-reference',
        preview: cleanText.slice(start, end).trim(),
        description: `Meta-reference: "${phrase}" breaks the narrative fourth wall`,
      });
    }
  }

  // ── Tone shift detection ──
  // Detect sudden register changes in narration
  const narrationBlocks = extractBlocks(xmlContent, 'narration');
  if (narrationBlocks.length > 1) {
    const registers = narrationBlocks.map(b => {
      const match = b.match(/register="([^"]*)"/);
      return match ? match[1] : '';
    }).filter(r => r.length > 0);

    const uniqueRegisters = [...new Set(registers)];
    if (uniqueRegisters.length > 3) {
      warnings.push(`Tone variety: ${uniqueRegisters.length} different narration registers used — verify shifts are intentional, not drift`);
    }
  }

  // ── Logic break detection ──
  // Characters knowing things they shouldn't, contradictions
  // (This is heuristic — the LLM agent should supplement with deeper analysis)
  const interiorityBlocks = extractBlocks(xmlContent, 'interiority');
  for (const block of interiorityBlocks) {
    const thoughtMatch = block.match(/thought="([^"]*)"/);
    if (thoughtMatch) {
      const thought = thoughtMatch[1].toLowerCase();
      // Check if character seems to know something they shouldn't
      const knowingWords = ['somehow knew', 'instinctively knew', 'could tell that', 'sensed that', 'knew without knowing why'];
      for (const kw of knowingWords) {
        if (thought.includes(kw)) {
          breaks.push({
            type: 'logic-break',
            preview: thoughtMatch[1].slice(0, 80),
            description: `Character may know something without justification: "${kw}" — verify this is earned, not authorial convenience`,
          });
        }
      }
    }
  }

  for (const brk of breaks) {
    warnings.push(`${brk.type}: "${brk.preview}..." — ${brk.description}`);
  }

  if (breaks.length === 0) {
    evidence.push(`✓ Immersion audit: No immersion breaks detected`);
  } else {
    evidence.push(`✗ Immersion breaks: ${breaks.length} found`);
  }

  return {
    chapter: chapterNumber,
    breaks,
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

function extractBlocks(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'g');
  return [...xml.matchAll(regex)].map(m => m[0]);
}

export function immersionToGateResult(report: ImmersionReport): GateResult {
  return {
    gate: 'immersion-audit',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}