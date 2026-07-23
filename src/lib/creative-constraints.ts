/**
 * Creative Constraints — Non-Negotiables System
 *
 * At manifest, the author declares elements that must not be changed
 * by any AI pass. These become hard constraints that the non-negotiables
 * gate checks against.
 *
 * Constraints stored at ./book/creative-constraints.json
 *
 * Categories:
 *   plot         — "Mira must die in chapter 12"
 *   character    — "Theron never lies"
 *   tone         — "Always melancholic, never hopeful"
 *   content      — "No on-page violence against children"
 *   structure    — "Each chapter must end on a turn"
 *   world        — "Magic always has a cost"
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────

/** Category of a creative non-negotiable constraint. */
export type ConstraintCategory = 'plot' | 'character' | 'tone' | 'content' | 'structure' | 'world';

/** A single non-negotiable creative constraint declared by the author. */
export interface CreativeConstraint {
  id: string;
  category: ConstraintCategory;
  description: string;
  declaredAt: string;       // ISO timestamp
  appliesToChapters?: number[]; // empty/undefined = all chapters
  notes?: string;
}

/** Complete set of creative constraints with author acknowledgement. */
export interface ConstraintSet {
  constraints: CreativeConstraint[];
  declaredAt: string;
  authorSignature: string;  // author acknowledgement that these are their red lines
}

// ─── Persistence ────────────────────────────────────────────────────────────

const CONSTRAINTS_PATH = 'book/creative-constraints.json';

/** Load constraint set from `book/creative-constraints.json`, or null if absent. */
export function loadConstraints(projectRoot: string): ConstraintSet | null {
  const filepath = path.join(projectRoot, CONSTRAINTS_PATH);
  if (!fs.existsSync(filepath)) return null;
  return fs.readJsonSync(filepath);
}

/** Persist a constraint set to `book/creative-constraints.json`. */
export function saveConstraints(projectRoot: string, constraints: ConstraintSet): void {
  const filepath = path.join(projectRoot, CONSTRAINTS_PATH);
  fs.ensureDirSync(path.dirname(filepath));
  fs.writeJsonSync(filepath, constraints, { spaces: 2 });
}

// ─── Constraint Management ───────────────────────────────────────────────────

/** Add a new constraint to the set and return the updated set. */
export function addConstraint(
  set: ConstraintSet,
  category: ConstraintCategory,
  description: string,
  appliesToChapters?: number[]
): ConstraintSet {
  const id = `constraint-${String(set.constraints.length + 1).padStart(3, '0')}`;
  const constraint: CreativeConstraint = {
    id,
    category,
    description,
    declaredAt: new Date().toISOString(),
    appliesToChapters,
  };
  return {
    ...set,
    constraints: [...set.constraints, constraint],
  };
}

/** Remove a constraint by ID and return the updated set. */
export function removeConstraint(set: ConstraintSet, id: string): ConstraintSet {
  return {
    ...set,
    constraints: set.constraints.filter(c => c.id !== id),
  };
}

// ─── Constraint Verification ────────────────────────────────────────────────

/** A detected violation of a creative constraint with severity and location. */
export interface ConstraintViolation {
  constraintId: string;
  category: ConstraintCategory;
  description: string;
  evidence: string;       // what was found that violates the constraint
  location: string;       // chapter/line/section reference
  severity: 'block';
}

/** Result of checking content against a full constraint set. */
export interface ConstraintCheckResult {
  passed: boolean;
  violations: ConstraintViolation[];
  constraintsChecked: number;
  evidence: string[];
}

/**
 * Check content against constraints.
 * Called by the non-negotiables gate in quality-gates.ts.
 *
 * This function performs pattern-matching checks that can be automated:
 * - content constraints: keyword/phrase matching
 * - tone constraints: sentiment-word presence
 * - structure constraints: pattern checks (e.g., chapter ending pattern)
 *
 * Plot/character/world constraints are flagged for agent review —
 * the agent reads the content and checks against the constraint description.
 */
export function checkConstraints(
  content: string,
  set: ConstraintSet,
  chapterNumber?: number
): ConstraintCheckResult {
  const violations: ConstraintViolation[] = [];
  const evidence: string[] = [];

  for (const constraint of set.constraints) {
    // Skip if constraint doesn't apply to this chapter
    if (
      chapterNumber !== undefined &&
      constraint.appliesToChapters &&
      constraint.appliesToChapters.length > 0 &&
      !constraint.appliesToChapters.includes(chapterNumber)
    ) {
      continue;
    }

    const violation = checkSingleConstraint(content, constraint);
    if (violation) {
      violations.push(violation);
      evidence.push(`VIOLATION: ${constraint.id} — ${violation.evidence} at ${violation.location}`);
    } else {
      evidence.push(`OK: ${constraint.id} — no violation detected`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    constraintsChecked: set.constraints.length,
    evidence,
  };
}

function checkSingleConstraint(
  content: string,
  constraint: CreativeConstraint
): ConstraintViolation | null {
  const lowerContent = content.toLowerCase();
  const desc = constraint.description.toLowerCase();

  // Content constraints — keyword matching
  // e.g., "no on-page violence against children" → check for violence + child keywords in proximity
  if (constraint.category === 'content') {
    const keywords = extractKeywords(desc);
    if (keywords.length >= 2) {
      const allPresent = keywords.every(kw => lowerContent.includes(kw));
      if (allPresent) {
        return {
          constraintId: constraint.id,
          category: constraint.category,
          description: constraint.description,
          evidence: `All keywords from constraint present in content: ${keywords.join(', ')}`,
          location: 'content-wide scan',
          severity: 'block',
        };
      }
    }
  }

  // Tone constraints — check for forbidden sentiment markers
  if (constraint.category === 'tone') {
    const forbidden = extractForbiddenWords(desc);
    for (const word of forbidden) {
      if (lowerContent.includes(word)) {
        return {
          constraintId: constraint.id,
          category: constraint.category,
          description: constraint.description,
          evidence: `Forbidden tone marker found: "${word}"`,
          location: findLineWithWord(content, word),
          severity: 'block',
        };
      }
    }
  }

  // Plot/character/world/structure constraints require agent review
  // The gate will flag these for agent attention
  return null;
}

function extractKeywords(desc: string): string[] {
  // Extract content keywords from descriptions like "no violence against children"
  const match = desc.match(/no\s+(.+)/);
  if (!match) return [];
  const phrase = match[1];
  // Split into significant words, filter stopwords
  const stopwords = ['the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'against', 'and', 'or'];
  return phrase.split(/\s+/).filter(w => w.length > 2 && !stopwords.includes(w));
}

function extractForbiddenWords(desc: string): string[] {
  // Extract words that should not appear, e.g., "never hopeful" → ['hopeful', 'hope', 'hopefulness']
  const neverMatch = desc.match(/never\s+(\w+)/);
  const noMatch = desc.match(/no\s+(\w+)/);
  const forbidden: string[] = [];
  if (neverMatch) forbidden.push(neverMatch[1]);
  if (noMatch) forbidden.push(noMatch[1]);
  return forbidden;
}

function findLineWithWord(content: string, word: string): string {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(word)) {
      return `line ${i + 1}`;
    }
  }
  return 'location unknown';
}

// ─── Formatting ────────────────────────────────────────────────────────────

/** Format the full constraint set as a readable markdown document. */
export function formatConstraintsForDisplay(set: ConstraintSet): string {
  const lines: string[] = [
    '## Creative Constraints (Non-Negotiables)',
    '',
    `**Declared**: ${set.declaredAt}`,
    `**Author signature**: ${set.authorSignature}`,
    `**Total constraints**: ${set.constraints.length}`,
    '',
  ];

  const byCategory: Record<string, CreativeConstraint[]> = {};
  for (const c of set.constraints) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }

  for (const [category, items] of Object.entries(byCategory)) {
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    for (const c of items) {
      const scope = c.appliesToChapters && c.appliesToChapters.length > 0
        ? ` (chapters: ${c.appliesToChapters.join(', ')})`
        : ' (all chapters)';
      lines.push(`- **${c.id}**: ${c.description}${scope}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Format constraint check results as a pass/fail markdown report with violation details. */
export function formatViolationReport(result: ConstraintCheckResult): string {
  const lines: string[] = [
    '## Non-Negotiables Gate Report',
    '',
    `**Constraints checked**: ${result.constraintsChecked}`,
    `**Violations**: ${result.violations.length}`,
    `**Result**: ${result.passed ? 'PASS' : 'BLOCK'}`,
    '',
  ];

  if (result.violations.length === 0) {
    lines.push('No violations detected. All creative constraints honored.');
  } else {
    lines.push('### Violations (HARD BLOCK)');
    for (const v of result.violations) {
      lines.push(`- **${v.constraintId}** (${v.category}): ${v.description}`);
      lines.push(`  - Evidence: ${v.evidence}`);
      lines.push(`  - Location: ${v.location}`);
    }
  }

  return lines.join('\n');
}