/**
 * Authorial Intent Capture
 *
 * Before each phase (draft, revise, edit), the author states their intent
 * in 1-2 sentences. The AI checks its output against this stated intent.
 *
 * If the author doesn't know or doesn't want to specify, a generic intent
 * is used: "Produce the best possible output consistent with the outline
 * and manifest."
 *
 * Intents stored at ./book/intents/
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────

/** Writing phase that the intent applies to. */
export type IntentPhase = 'draft' | 'revise' | 'edit' | 'critique';

/** Record of an author's stated intent for a phase chapter, with verification status. */
export interface AuthorialIntent {
  phase: IntentPhase;
  chapter?: number;
  intent: string;
  isGeneric: boolean;
  timestamp: string;
  honored: boolean | null; // null = not yet checked, true = output matched, false = drift detected
  driftNotes?: string;
}

/** Fallback intent used when the author provides no explicit direction. */
export const GENERIC_INTENT = 'Produce the best possible output consistent with the outline and manifest.';

// ─── Capture ────────────────────────────────────────────────────────────────

/**
 * Create an intent record. If the author provides no intent, use the generic fallback.
 */
export function captureIntent(
  phase: IntentPhase,
  intentText: string | undefined,
  chapter?: number
): AuthorialIntent {
  const trimmed = intentText?.trim();
  const isGeneric = !trimmed || trimmed.length < 5;

  return {
    phase,
    chapter,
    intent: isGeneric ? GENERIC_INTENT : trimmed!,
    isGeneric,
    timestamp: new Date().toISOString(),
    honored: null,
  };
}

// ─── Verification ────────────────────────────────────────────────────────────

/**
 * Check whether produced content honors the stated intent.
 * For generic intents, always passes (the manifest and outline are the check).
 * For specific intents, the agent performs semantic verification.
 *
 * This function provides structural checks the agent can use:
 * - keyword presence (does the content address the intent's stated focus?)
 * - scope alignment (does the content match the chapter scope the intent references?)
 */
export function verifyIntent(
  intent: AuthorialIntent,
  content: string
): { honored: boolean; driftNotes?: string } {
  // Generic intents always pass — they delegate to manifest/outline
  if (intent.isGeneric) {
    return { honored: true };
  }

  const intentLower = intent.intent.toLowerCase();
  const contentLower = content.toLowerCase();

  // Extract focus keywords from the intent
  const keywords = extractIntentKeywords(intentLower);

  if (keywords.length === 0) {
    // Can't extract keywords — assume honored, let agent review
    return { honored: true };
  }

  // Check if at least half the focus keywords appear in the content
  const present = keywords.filter(kw => contentLower.includes(kw));
  const ratio = present.length / keywords.length;

  if (ratio >= 0.5) {
    return { honored: true };
  }

  // Drift detected
  const missing = keywords.filter(kw => !contentLower.includes(kw));
  return {
    honored: false,
    driftNotes: `Intent mentions: ${keywords.join(', ')}. Missing from output: ${missing.join(', ')}. The output may not address the author's stated intent.`,
  };
}

function extractIntentKeywords(intent: string): string[] {
  // Extract significant words from intent, filter stopwords
  const stopwords = [
    'the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'for',
    'with', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been',
    'this', 'that', 'these', 'those', 'it', 'they', 'we', 'i',
    'want', 'need', 'should', 'must', 'will', 'would', 'could',
    'chapter', 'scene', 'paragraph', 'write', 'make', 'ensure',
  ];
  return intent
    .split(/\s+/)
    .map(w => w.replace(/[^a-z-]/g, ''))
    .filter(w => w.length > 3 && !stopwords.includes(w));
}

// ─── Persistence ────────────────────────────────────────────────────────────

/** Persist an intent record to `book/intents/` as JSON. */
export function saveIntent(projectRoot: string, intent: AuthorialIntent): void {
  const dir = path.join(projectRoot, 'book', 'intents');
  fs.ensureDirSync(dir);
  const filename = `${intent.phase}-ch${intent.chapter ?? 'all'}-${intent.timestamp.replace(/[:.]/g, '-')}.json`;
  fs.writeJsonSync(path.join(dir, filename), intent, { spaces: 2 });
}

/** Load the most recent intent for the given phase and optional chapter. Returns null if none exist. */
export function loadLatestIntent(
  projectRoot: string,
  phase: IntentPhase,
  chapter?: number
): AuthorialIntent | null {
  const dir = path.join(projectRoot, 'book', 'intents');
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(`${phase}-ch${chapter ?? 'all'}`))
    .sort()
    .reverse();

  if (files.length === 0) return null;
  return fs.readJsonSync(path.join(dir, files[0]));
}

// ─── Formatting ────────────────────────────────────────────────────────────

/** Build a markdown prompt asking the author to state their intent for a phase. */
export function formatIntentPrompt(phase: IntentPhase, chapter?: number): string {
  const chStr = chapter ? ` Chapter ${chapter}` : '';
  return [
    `## Authorial Intent — ${phase}${chStr}`,
    '',
    'State your intent for this phase in 1-2 sentences. What are you trying to accomplish?',
    'If you\'re unsure, type "generic" or leave blank — a default intent will be used.',
    '',
    'Examples:',
    '- "Make chapter 4 feel claustrophobic — tight prose, short sentences, enclosed setting."',
    '- "Revise chapter 7 to strengthen Mira\'s motivation for the betrayal."',
    '- "Edit chapter 12 for dialogue punch — cut tags, tighten exchanges."',
    '- "generic"',
  ].join('\n');
}

/** Format an intent record as a human-readable markdown block. */
export function formatIntentForDisplay(intent: AuthorialIntent): string {
  const lines: string[] = [
    `## Authorial Intent`,
    '',
    `**Phase**: ${intent.phase}${intent.chapter ? ` — Chapter ${intent.chapter}` : ''}`,
    `**Intent**: ${intent.intent}`,
    `**Type**: ${intent.isGeneric ? 'Generic (delegates to manifest/outline)' : 'Author-specified'}`,
    `**Captured**: ${intent.timestamp}`,
  ];

  if (intent.honored !== null) {
    lines.push(`**Honored**: ${intent.honored ? 'Yes' : 'No — drift detected'}`);
    if (intent.driftNotes) {
      lines.push(`**Drift notes**: ${intent.driftNotes}`);
    }
  }

  return lines.join('\n');
}