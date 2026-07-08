/**
 * Veto System
 *
 * The author can veto any AI suggestion with a single key: `|`.
 * Vetoes are logged to prevent re-suggestion of the same or similar items.
 *
 * Veto key: `|` (pipe character)
 * The author types `|` followed by optional reason text.
 * If no reason is given, the veto is "silent" (no explanation required).
 *
 * Pairs with feedback-memory.ts — vetoes with reasons feed into avoidance patterns.
 *
 * Vetoes stored at ./book/vetoes.json
 */

import fs from 'fs-extra';
import path from 'path';
import { loadPreferences, savePreferences, logRejection, type PreferenceSet } from './feedback-memory.js';

// ─── Types ───────────────────────────────────────────────────────────────

/** A single veto record logged when the author rejects a suggestion. */
export interface VetoRecord {
  id: string;
  timestamp: string;
  phase: string;
  chapter?: number;
  suggestionId?: string;
  suggestionSummary: string;
  hasReason: boolean;
  reason?: string;
}

/** Persistent log of all vetoes, vetoed suggestion IDs, and vetoed patterns. */
export interface VetoLog {
  vetoes: VetoRecord[];
  vetoedSuggestionIds: string[];   // IDs of vetoed suggestions — never re-suggest
  vetoedPatterns: string[];        // generalized patterns — check before suggesting
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const VETO_KEY = '|';
const VETO_PATH = 'book/vetoes.json';

// ─── Parsing ────────────────────────────────────────────────────────────────

/**
 * Parse a veto input from the author.
 * Format: `|` or `| reason text here`
 * Returns null if the input is not a veto.
 */
export function parseVetoInput(input: string): { isVeto: boolean; reason?: string } {
  const trimmed = input.trim();
  if (!trimmed.startsWith(VETO_KEY)) {
    return { isVeto: false };
  }

  const afterVetoKey = trimmed.slice(VETO_KEY.length).trim();
  if (afterVetoKey.length === 0) {
    return { isVeto: true };  // silent veto
  }

  return { isVeto: true, reason: afterVetoKey };
}

// ─── Persistence ────────────────────────────────────────────────────────────

/** Load the veto log from book/vetoes.json, or null if not found. */
export function loadVetoLog(projectRoot: string): VetoLog | null {
  const filepath = path.join(projectRoot, VETO_PATH);
  if (!fs.existsSync(filepath)) return null;
  return fs.readJsonSync(filepath);
}

/** Persist the veto log to book/vetoes.json. */
export function saveVetoLog(projectRoot: string, log: VetoLog): void {
  const filepath = path.join(projectRoot, VETO_PATH);
  fs.ensureDirSync(path.dirname(filepath));
  log.updatedAt = new Date().toISOString();
  fs.writeJsonSync(filepath, log, { spaces: 2 });
}

// ─── Veto Action ──────────────────────────────────────────────────────────────

/**
 * Record a veto. If a reason is provided, also log it in feedback memory
 * as a rejection so the AI learns the avoidance pattern.
 */
export function recordVeto(
  projectRoot: string,
  log: VetoLog,
  prefs: PreferenceSet,
  veto: Omit<VetoRecord, 'id'>
): { log: VetoLog; prefs: PreferenceSet } {
  const id = `veto-${String(log.vetoes.length + 1).padStart(3, '0')}`;
  const record: VetoRecord = { ...veto, id };

  const newLog: VetoLog = {
    ...log,
    vetoes: [...log.vetoes, record],
    vetoedSuggestionIds: veto.suggestionId
      ? [...log.vetoedSuggestionIds, veto.suggestionId]
      : log.vetoedSuggestionIds,
    updatedAt: new Date().toISOString(),
  };

  // If reason provided, also log in feedback memory
  let newPrefs = prefs;
  if (veto.hasReason && veto.reason) {
    newPrefs = logRejection(prefs, {
      timestamp: veto.timestamp,
      phase: veto.phase,
      chapter: veto.chapter,
      suggestionCategory: 'vetoed',
      suggestionSummary: veto.suggestionSummary,
      rejectionReason: veto.reason,
    });
    savePreferences(projectRoot, newPrefs);

    // Extract pattern and add to vetoed patterns
    const pattern = extractVetoPattern(veto.reason);
    if (pattern && !newLog.vetoedPatterns.includes(pattern)) {
      newLog.vetoedPatterns = [...newLog.vetoedPatterns, pattern];
    }
  }

  saveVetoLog(projectRoot, newLog);
  return { log: newLog, prefs: newPrefs };
}

// ─── Checking ──────────────────────────────────────────────────────────────

/**
 * Check if a suggestion has been vetoed or matches a vetoed pattern.
 * The AI should call this before presenting a suggestion.
 */
export function isSuggestionVetoed(
  log: VetoLog,
  suggestionId?: string,
  suggestionSummary?: string
): { vetoed: boolean; reason?: string } {
  // Check by ID
  if (suggestionId && log.vetoedSuggestionIds.includes(suggestionId)) {
    return { vetoed: true, reason: 'This exact suggestion was previously vetoed.' };
  }

  // Check by pattern
  if (suggestionSummary) {
    const summaryLower = suggestionSummary.toLowerCase();
    for (const pattern of log.vetoedPatterns) {
      if (summaryLower.includes(pattern.toLowerCase())) {
        return {
          vetoed: true,
          reason: `This suggestion matches a vetoed pattern: "${pattern}". The author has vetoed similar suggestions before.`,
        };
      }
    }
  }

  return { vetoed: false };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractVetoPattern(reason: string): string {
  const stopwords = [
    'the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'for',
    'with', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been',
    'this', 'that', 'it', 'they', 'we', 'i', 'me', 'my',
  ];

  const words = reason.toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z-]/g, ''))
    .filter(w => w.length > 2 && !stopwords.includes(w));

  return words.slice(0, 3).join('-');
}

// ─── Formatting ────────────────────────────────────────────────────────────

/** Format the prompt shown to the author when presenting a suggestion for veto. */
export function formatVetoPrompt(suggestionTitle: string): string {
  return [
    `Suggestion: ${suggestionTitle}`,
    '',
    `To veto, type: | (silent veto) or | your reason here`,
    `To accept, type: y or yes`,
    `To modify, type your modification`,
  ].join('\n');
}

/** Format the veto log as a markdown display with summary and recent entries. */
export function formatVetoLogForDisplay(log: VetoLog): string {
  const lines: string[] = [
    '## Veto Log',
    '',
    `**Total vetoes**: ${log.vetoes.length}`,
    `**Vetoed suggestion IDs**: ${log.vetoedSuggestionIds.length}`,
    `**Vetoed patterns**: ${log.vetoedPatterns.length}`,
    `**Last updated**: ${log.updatedAt}`,
    '',
  ];

  if (log.vetoedPatterns.length > 0) {
    lines.push('### Vetoed Patterns (never re-suggest)');
    for (const p of log.vetoedPatterns) {
      lines.push(`- ${p}`);
    }
    lines.push('');
  }

  if (log.vetoes.length > 0) {
    lines.push('### Recent Vetoes');
    const recent = log.vetoes.slice(-5).reverse();
    for (const v of recent) {
      const reason = v.hasReason ? v.reason : '(silent veto)';
      lines.push(`- **${v.id}** (${v.phase}): ${v.suggestionSummary}`);
      lines.push(`  - Reason: ${reason}`);
    }
  }

  return lines.join('\n');
}