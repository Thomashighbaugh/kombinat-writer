/**
 * Revision Merger Tool
 *
 * Manages the revision lifecycle: planning revisions from critique
 * feedback, applying targeted edits to chapter content, and
 * maintaining a revision history log.
 */

import fs from 'fs-extra';
import path from 'path';

/** Decision on how to handle a critique item. */
export type RevisionDisposition = 'accept' | 'accept-with-adaptation' | 'discuss' | 'defer' | 'decline';
/** Category of the revision change. */
export type RevisionCategory = 'structural' | 'substantive' | 'clarity' | 'consistency' | 'enhancement' | 'correction';
/** Current lifecycle status of a revision. */
export type RevisionStatus = 'pending' | 'applied' | 'declined' | 'deferred';

/** A single planned revision derived from a critique item. */
export interface Revision {
  id: number;
  chapter: number;
  sourceRound: number;
  sourceItem: string;
  category: RevisionCategory;
  disposition: RevisionDisposition;
  change: string;
  rationale: string;
  status: RevisionStatus;
}

/** A single critique item from a review round. */
export interface CritiqueInput {
  id: string;
  chapter: number;
  severity: string;
  summary: string;
  recommendation: string;
}

// ─── planRevisions ──────────────────────────────────────────────────────

/**
 * Take critique items and produce a revision plan.
 *
 * - Critical/Major items → accepted
 * - Minor items → accepted-with-adaptation
 * - Observations → discussed or deferred
 */
export function planRevisions(critiqueItems: CritiqueInput[]): Revision[] {
  const revisions: Revision[] = [];
  let id = 1;

  for (const item of critiqueItems) {
    const severity = item.severity.toLowerCase();

    let disposition: RevisionDisposition;
    let category: RevisionCategory;

    switch (severity) {
      case 'critical':
        disposition = 'accept';
        category = 'structural';
        break;
      case 'major':
        disposition = 'accept';
        category = 'substantive';
        break;
      case 'minor':
        disposition = 'accept-with-adaptation';
        category = 'clarity';
        break;
      case 'observation':
        disposition = 'discuss';
        category = 'enhancement';
        break;
      default:
        disposition = 'defer';
        category = 'enhancement';
    }

    revisions.push({
      id: id++,
      chapter: item.chapter,
      sourceRound: 1,
      sourceItem: item.id,
      category,
      disposition,
      change: item.recommendation,
      rationale: `Addresses ${severity} issue: ${item.summary}`,
      status: disposition === 'accept' || disposition === 'accept-with-adaptation' ? 'pending' : 'deferred',
    });
  }

  return revisions;
}

// ─── applyRevision ─────────────────────────────────────────────────────

/**
 * Apply a revision change to chapter content using find-and-replace
 * or targeted edit patterns.
 *
 * Supports three strategies:
 * 1. Direct find/replace: "FIND: ... REPLACE: ..."
 * 2. Insert before: "INSERT BEFORE: ... CONTENT: ..."
 * 3. Insert after: "INSERT AFTER: ... CONTENT: ..."
 *
 * Falls back to appending the change as a note if no pattern is detected.
 */
export function applyRevision(chapterContent: string, revision: Revision): string {
  const change = revision.change.trim();

  // — Strategy 1: Direct find/replace
  const findReplaceMatch = change.match(/^FIND:\s*([\s\S]*?)\nREPLACE:\s*([\s\S]*)$/);
  if (findReplaceMatch) {
    const find = findReplaceMatch[1].trim();
    const replace = findReplaceMatch[2].trim();
    if (chapterContent.includes(find)) {
      return chapterContent.replace(find, replace);
    }
    // Try fuzzy match (first/last 20 chars)
    const findShort = find.slice(0, 20);
    const idx = chapterContent.indexOf(findShort);
    if (idx !== -1) {
      const before = chapterContent.slice(0, idx);
      const after = chapterContent.slice(idx + find.length);
      return before + replace + after;
    }
  }

  // — Strategy 2: Insert before
  const insertBeforeMatch = change.match(/^INSERT BEFORE:\s*([\s\S]*?)\nCONTENT:\s*([\s\S]*)$/);
  if (insertBeforeMatch) {
    const anchor = insertBeforeMatch[1].trim();
    const content = insertBeforeMatch[2].trim();
    if (chapterContent.includes(anchor)) {
      return chapterContent.replace(anchor, `${content}\n\n${anchor}`);
    }
  }

  // — Strategy 3: Insert after
  const insertAfterMatch = change.match(/^INSERT AFTER:\s*([\s\S]*?)\nCONTENT:\s*([\s\S]*)$/);
  if (insertAfterMatch) {
    const anchor = insertAfterMatch[1].trim();
    const content = insertAfterMatch[2].trim();
    if (chapterContent.includes(anchor)) {
      return chapterContent.replace(anchor, `${anchor}\n\n${content}`);
    }
  }

  // — Fallback: append as a revision note at the end
  return `${chapterContent}\n\n<!-- REVISION NOTE (${revision.id}): ${change} -->\n`;
}

// ─── revisionHistory ───────────────────────────────────────────────────

/**
 * Append a formatted revision entry to the revision log string.
 */
export function revisionHistory(log: string, revision: Revision): string {
  const entry = `\n## Revision ${revision.id}: Chapter ${revision.chapter}
- **Source**: Critique round ${revision.sourceRound}, item ${revision.sourceItem}
- **Category**: ${revision.category}
- **Disposition**: ${revision.disposition}
- **Change**: ${revision.change}
- **Rationale**: ${revision.rationale}
- **Status**: ${revision.status}
`;
  return log + entry;
}

// ─── loadRevisionLog ───────────────────────────────────────────────────

/**
 * Load and parse the revision log from a file.
 * Returns an empty string if the file does not exist.
 */
export function loadRevisionLog(revisionsDir: string): string {
  const logPath = path.join(revisionsDir, 'revision-log.md');
  if (!fs.existsSync(logPath)) return '';
  return fs.readFileSync(logPath, 'utf-8');
}

// ─── saveRevisionLog ───────────────────────────────────────────────────

/**
 * Save the revision log to a file.
 * Ensures the revisions directory exists.
 */
export function saveRevisionLog(revisionsDir: string, log: string): void {
  fs.ensureDirSync(revisionsDir);
  const logPath = path.join(revisionsDir, 'revision-log.md');
  fs.writeFileSync(logPath, log.trimStart() + '\n', 'utf-8');
}
