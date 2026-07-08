/**
 * Trust Accounting (Convenience Audit)
 *
 * Scans for moments that break reader trust: convenient coincidences,
 * deus ex machina, characters acting stupid for plot reasons, lucky
 * escapes without cost.
 *
 * AI writing tends toward convenient outcomes because the model
 * optimizes for resolution over earned progression.
 */

import { GateResult } from './quality-gates.js';

/** Per-chapter report of reader trust violations (coincidence, deus ex machina, etc.). */
export interface TrustReport {
  chapter: number;
  violations: TrustViolation[];
  passed: boolean;
  blocking: string[];
  warnings: string[];
  evidence: string[];
}

interface TrustViolation {
  type: 'coincidence' | 'deus-ex-machina' | 'stupid-for-plot' | 'unearned-escape' | 'convenient-timing' | 'plot-armor';
  preview: string;
  description: string;
  severity: 'block' | 'warning';
}

const COINCIDENCE_INDICATORS = [
  'happened to be', 'just so happened', 'by coincidence', 'as luck would have it',
  'conveniently', 'by chance', 'it turned out that', 'ironically',
  'at that exact moment', 'right on cue', 'just in time for',
  'as if by magic', 'out of nowhere', 'from thin air',
];

const DEUS_EX_MACHINA_INDICATORS = [
  'suddenly appeared', 'arrived just in time', 'came from nowhere',
  'a mysterious stranger', 'an unknown ally', 'a hidden power',
  'awoke a power', 'unlocked a hidden', 'dormant ability',
  'miraculously', 'against all odds', 'impossibly',
];

const STUPID_FOR_PLOT_INDICATORS = [
  'for some reason', 'didn\'t think to', 'failed to notice',
  'ignored the obvious', 'uncharacteristically', 'out of character',
  'unlike them to', 'strangely chose not to', 'refused to believe',
  'didn\'t consider', 'overlooked the fact',
];

const PLOT_ARMOR_INDICATORS = [
  'barely escaped', 'narrowly avoided', 'by inches', 'by a hair',
  'miraculously survived', 'impossibly dodged', 'somehow managed',
  'against all probability', 'survived the impossible',
];

/** Scan XML chapter content for patterns that break reader trust. */
export function auditTrust(
  xmlContent: string,
  chapterNumber: number
): TrustReport {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];
  const violations: TrustViolation[] = [];

  const cleanText = stripXmlTags(xmlContent);
  const lowerText = cleanText.toLowerCase();

  // Check coincidence indicators
  for (const indicator of COINCIDENCE_INDICATORS) {
    if (lowerText.includes(indicator)) {
      const idx = lowerText.indexOf(indicator);
      const start = Math.max(0, idx - 30);
      const end = Math.min(cleanText.length, idx + indicator.length + 50);
      violations.push({
        type: 'coincidence',
        preview: cleanText.slice(start, end).trim(),
        description: `Coincidence indicator: "${indicator}" — readers lose trust when events resolve by luck rather than earned progression`,
        severity: 'warning',
      });
    }
  }

  // Check deus ex machina
  for (const indicator of DEUS_EX_MACHINA_INDICATORS) {
    if (lowerText.includes(indicator)) {
      const idx = lowerText.indexOf(indicator);
      const start = Math.max(0, idx - 30);
      const end = Math.min(cleanText.length, idx + indicator.length + 50);
      violations.push({
        type: 'deus-ex-machina',
        preview: cleanText.slice(start, end).trim(),
        description: `Deus ex machina indicator: "${indicator}" — solutions should be set up earlier, not introduced at the moment of need`,
        severity: 'block',
      });
    }
  }

  // Check stupid-for-plot
  for (const indicator of STUPID_FOR_PLOT_INDICATORS) {
    if (lowerText.includes(indicator)) {
      const idx = lowerText.indexOf(indicator);
      const start = Math.max(0, idx - 30);
      const end = Math.min(cleanText.length, idx + indicator.length + 50);
      violations.push({
        type: 'stupid-for-plot',
        preview: cleanText.slice(start, end).trim(),
        description: `Character acting against their intelligence: "${indicator}" — characters should make the best available choice, not the choice the plot needs`,
        severity: 'warning',
      });
    }
  }

  // Check plot armor
  for (const indicator of PLOT_ARMOR_INDICATORS) {
    if (lowerText.includes(indicator)) {
      const idx = lowerText.indexOf(indicator);
      const start = Math.max(0, idx - 30);
      const end = Math.min(cleanText.length, idx + indicator.length + 50);
      violations.push({
        type: 'plot-armor',
        preview: cleanText.slice(start, end).trim(),
        description: `Plot armor indicator: "${indicator}" — escapes should cost something. If characters always survive by inches, stakes lose meaning.`,
        severity: 'warning',
      });
    }
  }

  // Categorize
  const blockingViolations = violations.filter(v => v.severity === 'block');
  const warningViolations = violations.filter(v => v.severity === 'warning');

  for (const v of blockingViolations) {
    blocking.push(`Trust violation (${v.type}): "${v.preview}..." — ${v.description}`);
  }
  for (const v of warningViolations.slice(0, 5)) {
    warnings.push(`Trust concern (${v.type}): "${v.preview}..." — ${v.description}`);
  }

  evidence.push(`✓ Trust violations: ${violations.length} (${blockingViolations.length} blocking, ${warningViolations.length} warnings)`);
  if (violations.length === 0) {
    evidence.push(`✓ No trust-breaking patterns detected`);
  }

  return {
    chapter: chapterNumber,
    violations,
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

/** Convert a trust audit report into the generic GateResult format. */
export function trustToGateResult(report: TrustReport): GateResult {
  return {
    gate: 'trust-audit',
    passed: report.passed,
    blocking: report.blocking,
    warnings: report.warnings,
    evidence: report.evidence,
  };
}