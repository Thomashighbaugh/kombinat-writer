/**
 * Diff-Based Approval Gates
 *
 * After any revision or edit pass, generates a structured diff between
 * the original and modified content. The author approves line-by-line,
 * rejects specific hunks, or accepts all. Rejected hunks are logged.
 *
 * Stored at ./book/revisions/approvals/
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────

export interface DiffHunk {
  hunkId: string;
  startLine: number;
  endLine: number;
  oldLines: string[];
  newLines: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
}

export interface DiffApprovalResult {
  phase: string;
  chapter: number;
  timestamp: string;
  hunks: DiffHunk[];
  approved: number;
  rejected: number;
  pending: number;
  fullyApproved: boolean;
}

// ─── Diff Generation ──────────────────────────────────────────────────────

/**
 * Generate a structured diff between original and modified content.
 * Uses a simple line-based diff algorithm (LCS approximation).
 */
export function generateDiff(
  original: string,
  modified: string,
  phase: string,
  chapter: number
): DiffApprovalResult {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');
  const hunks: DiffHunk[] = [];
  let i = 0;
  let hunkId = 1;

  while (i < Math.max(oldLines.length, newLines.length)) {
    if (i < oldLines.length && i < newLines.length && oldLines[i] === newLines[i]) {
      i++;
      continue;
    }

    // Found a change — collect consecutive different lines
    const startLine = i + 1;
    const oldBlock: string[] = [];
    const newBlock: string[] = [];

    while (
      i < oldLines.length &&
      i < newLines.length &&
      oldLines[i] !== newLines[i]
    ) {
      oldBlock.push(oldLines[i]);
      newBlock.push(newLines[i]);
      i++;
    }

    // Handle additions (new content beyond original)
    while (i < newLines.length && i >= oldLines.length) {
      newBlock.push(newLines[i]);
      i++;
    }

    // Handle deletions (original content beyond new)
    while (i < oldLines.length && i >= newLines.length) {
      oldBlock.push(oldLines[i]);
      i++;
    }

    hunks.push({
      hunkId: `hunk-${String(hunkId++).padStart(3, '0')}`,
      startLine,
      endLine: i,
      oldLines: oldBlock,
      newLines: newBlock,
      status: 'pending',
    });
  }

  return {
    phase,
    chapter,
    timestamp: new Date().toISOString(),
    hunks,
    approved: 0,
    rejected: 0,
    pending: hunks.length,
    fullyApproved: false,
  };
}

// ─── Approval Actions ──────────────────────────────────────────────────────

export function approveHunk(
  result: DiffApprovalResult,
  hunkId: string
): DiffApprovalResult {
  const hunks = result.hunks.map(h =>
    h.hunkId === hunkId ? { ...h, status: 'approved' as const } : h
  );
  return recalculateResult({ ...result, hunks });
}

export function rejectHunk(
  result: DiffApprovalResult,
  hunkId: string,
  reason?: string
): DiffApprovalResult {
  const hunks = result.hunks.map(h =>
    h.hunkId === hunkId
      ? { ...h, status: 'rejected' as const, rejectReason: reason }
      : h
  );
  return recalculateResult({ ...result, hunks });
}

export function approveAll(result: DiffApprovalResult): DiffApprovalResult {
  const hunks = result.hunks.map(h => ({ ...h, status: 'approved' as const }));
  return recalculateResult({ ...result, hunks });
}

// ─── Apply Approved Changes ────────────────────────────────────────────────

/**
 * Apply only approved hunks to the original content.
 * Rejected and pending hunks are skipped — the original lines are kept.
 */
export function applyApprovedChanges(
  original: string,
  result: DiffApprovalResult
): string {
  const lines = original.split('\n');

  for (const hunk of result.hunks) {
    if (hunk.status !== 'approved') continue;

    const startIdx = hunk.startLine - 1;
    const endIdx = hunk.endLine;
    lines.splice(startIdx, endIdx - startIdx, ...hunk.newLines);
  }

  return lines.join('\n');
}

// ─── Formatting ────────────────────────────────────────────────────────────

export function formatDiffForDisplay(result: DiffApprovalResult): string {
  const lines: string[] = [
    `## Diff Approval: ${result.phase} — Chapter ${result.chapter}`,
    `**Timestamp**: ${result.timestamp}`,
    `**Hunks**: ${result.hunks.length} total — ${result.approved} approved, ${result.rejected} rejected, ${result.pending} pending`,
    '',
  ];

  for (const hunk of result.hunks) {
    const statusIcon =
      hunk.status === 'approved' ? '[+]' :
      hunk.status === 'rejected' ? '[-]' :
      '[?]';

    lines.push(`### ${statusIcon} ${hunk.hunkId} (lines ${hunk.startLine}-${hunk.endLine})`);

    if (hunk.oldLines.length > 0) {
      lines.push('**Before:**');
      for (const line of hunk.oldLines) {
        lines.push(`  - ${line}`);
      }
    }

    if (hunk.newLines.length > 0) {
      lines.push('**After:**');
      for (const line of hunk.newLines) {
        lines.push(`  + ${line}`);
      }
    }

    if (hunk.rejectReason) {
      lines.push(`**Rejection reason**: ${hunk.rejectReason}`);
    }

    lines.push('');
  }

  if (result.fullyApproved) {
    lines.push('**All hunks approved.** Changes will be applied.');
  } else if (result.rejected > 0) {
    lines.push(`**${result.rejected} hunks rejected.** Rejected changes will not be applied. Original text preserved for those sections.`);
  } else {
    lines.push(`**${result.pending} hunks pending review.** Use approveHunk/rejectHunk or approveAll.`);
  }

  return lines.join('\n');
}

// ─── Persistence ───────────────────────────────────────────────────────────

export function saveApprovalResult(
  projectRoot: string,
  result: DiffApprovalResult
): void {
  const dir = path.join(projectRoot, 'book', 'revisions', 'approvals');
  fs.ensureDirSync(dir);
  const filename = `${result.phase}-ch${result.chapter}-${result.timestamp.replace(/[:.]/g, '-')}.json`;
  fs.writeJsonSync(path.join(dir, filename), result, { spaces: 2 });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function recalculateResult(result: DiffApprovalResult): DiffApprovalResult {
  const approved = result.hunks.filter(h => h.status === 'approved').length;
  const rejected = result.hunks.filter(h => h.status === 'rejected').length;
  const pending = result.hunks.filter(h => h.status === 'pending').length;
  return {
    ...result,
    approved,
    rejected,
    pending,
    fullyApproved: pending === 0 && rejected === 0 && approved > 0,
  };
}