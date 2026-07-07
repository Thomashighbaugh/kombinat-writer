/**
 * Feedback Loop Memory
 *
 * When the author rejects a suggestion and explains why, the AI logs
 * this as a preference. The AI checks preferences before making future
 * suggestions and avoids suggesting things that match a logged rejection.
 *
 * Preferences stored at ./book/feedback-memory.json
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────

export interface RejectionRecord {
  id: string;
  timestamp: string;
  phase: string;             // 'critique', 'revise', 'edit'
  chapter?: number;
  suggestionCategory: string; // 'cut-scene', 'dialogue-rewrite', 'pacing-change', etc.
  suggestionSummary: string;  // what was suggested
  rejectionReason: string;    // author's explanation
  pattern: string;            // generalized pattern to avoid (extracted from reason)
}

export interface PreferenceSet {
  rejections: RejectionRecord[];
  patterns: AvoidancePattern[];
  updatedAt: string;
}

export interface AvoidancePattern {
  pattern: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  categories: string[];
}

// ─── Persistence ────────────────────────────────────────────────────────────

const MEMORY_PATH = 'book/feedback-memory.json';

export function loadPreferences(projectRoot: string): PreferenceSet | null {
  const filepath = path.join(projectRoot, MEMORY_PATH);
  if (!fs.existsSync(filepath)) return null;
  return fs.readJsonSync(filepath);
}

export function savePreferences(projectRoot: string, prefs: PreferenceSet): void {
  const filepath = path.join(projectRoot, MEMORY_PATH);
  fs.ensureDirSync(path.dirname(filepath));
  prefs.updatedAt = new Date().toISOString();
  fs.writeJsonSync(filepath, prefs, { spaces: 2 });
}

// ─── Logging Rejections ─────────────────────────────────────────────────────

/**
 * Log a rejected suggestion. The rejection reason is analyzed to extract
 * a generalized avoidance pattern.
 */
export function logRejection(
  prefs: PreferenceSet,
  rejection: Omit<RejectionRecord, 'id' | 'pattern'>
): PreferenceSet {
  const id = `rejection-${String(prefs.rejections.length + 1).padStart(3, '0')}`;
  const pattern = extractPattern(rejection.rejectionReason, rejection.suggestionCategory);

  const record: RejectionRecord = {
    ...rejection,
    id,
    pattern,
  };

  const rejections = [...prefs.rejections, record];
  const patterns = updatePatterns(prefs.patterns, pattern, rejection.suggestionCategory, rejection.timestamp);

  return { ...prefs, rejections, patterns };
}

// ─── Checking Against Preferences ────────────────────────────────────────────

export interface PreferenceCheckResult {
  isAvoided: boolean;
  matchedPattern?: AvoidancePattern;
  warning?: string;
}

/**
 * Check if a proposed suggestion matches an avoidance pattern.
 * If it does, the AI should not make the suggestion (or frame it differently).
 */
export function checkAgainstPreferences(
  prefs: PreferenceSet,
  suggestionCategory: string,
  suggestionSummary: string
): PreferenceCheckResult {
  const summaryLower = suggestionSummary.toLowerCase();

  for (const pattern of prefs.patterns) {
    // Check if the pattern appears in the suggestion summary
    if (summaryLower.includes(pattern.pattern.toLowerCase())) {
      return {
        isAvoided: true,
        matchedPattern: pattern,
        warning: `This suggestion matches an avoidance pattern (${pattern.pattern}, rejected ${pattern.occurrences}x). Consider reframing or skipping.`,
      };
    }

    // Check category match with high occurrence count
    if (
      pattern.categories.includes(suggestionCategory) &&
      pattern.occurrences >= 3
    ) {
      return {
        isAvoided: true,
        matchedPattern: pattern,
        warning: `Category "${suggestionCategory}" has ${pattern.occurrences} rejections with pattern "${pattern.pattern}". The author has consistently rejected this type of suggestion.`,
      };
    }
  }

  return { isAvoided: false };
}

// ─── Pattern Extraction ──────────────────────────────────────────────────────

/**
 * Extract a generalized avoidance pattern from a rejection reason.
 * e.g., "I'm keeping this flashback because it establishes Theron's motivation"
 *       → pattern: "keeping-flashback-for-motivation"
 */
function extractPattern(reason: string, category: string): string {
  const stopwords = [
    'the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'for',
    'with', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been',
    'this', 'that', 'it', 'they', 'we', 'i', 'me', 'my',
    'because', 'since', 'but', 'however', 'though',
  ];

  const words = reason.toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z-]/g, ''))
    .filter(w => w.length > 2 && !stopwords.includes(w));

  // Take the 3-4 most significant words
  const significant = words.slice(0, 4);
  return significant.join('-');
}

function updatePatterns(
  existing: AvoidancePattern[],
  pattern: string,
  category: string,
  timestamp: string
): AvoidancePattern[] {
  const existingIdx = existing.findIndex(p => p.pattern === pattern);

  if (existingIdx >= 0) {
    const updated = [...existing];
    const p = updated[existingIdx];
    updated[existingIdx] = {
      ...p,
      occurrences: p.occurrences + 1,
      lastSeen: timestamp,
      categories: p.categories.includes(category)
        ? p.categories
        : [...p.categories, category],
    };
    return updated;
  }

  return [
    ...existing,
    {
      pattern,
      occurrences: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      categories: [category],
    },
  ];
}

// ─── Formatting ────────────────────────────────────────────────────────────

export function formatPreferencesForDisplay(prefs: PreferenceSet): string {
  const lines: string[] = [
    '## Feedback Memory — Author Preferences',
    '',
    `**Total rejections logged**: ${prefs.rejections.length}`,
    `**Avoidance patterns**: ${prefs.patterns.length}`,
    `**Last updated**: ${prefs.updatedAt}`,
    '',
  ];

  if (prefs.patterns.length > 0) {
    lines.push('### Avoidance Patterns');
    for (const p of prefs.patterns) {
      lines.push(`- **${p.pattern}** — ${p.occurrences}x rejected (categories: ${p.categories.join(', ')})`);
    }
    lines.push('');
  }

  if (prefs.rejections.length > 0) {
    lines.push('### Recent Rejections');
    const recent = prefs.rejections.slice(-5).reverse();
    for (const r of recent) {
      lines.push(`- **${r.id}** (${r.phase}, ${r.timestamp}): ${r.suggestionSummary}`);
      lines.push(`  - Reason: ${r.rejectionReason}`);
      lines.push(`  - Pattern: ${r.pattern}`);
    }
  }

  return lines.join('\n');
}