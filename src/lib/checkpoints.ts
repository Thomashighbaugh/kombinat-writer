/**
 * Checkpoint System — JSON-based Context Persistence
 *
 * After each chapter, saves what was loaded, what changed, and what
 * needs to be loaded next time. On resume, loads only the delta —
 * not all 13 items from scratch.
 *
 * Checkpoints stored at ./book/checkpoints/chapter-N.json
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────

/** A tracked context file with metadata for change detection. */
export interface ContextItem {
  id: string;
  path: string;
  loaded: boolean;
  hash?: string;       // content hash for change detection
  size: number;        // bytes at checkpoint time
}

/** Snapshot of context state after a chapter was processed. */
export interface ChapterCheckpoint {
  chapterNumber: number;
  timestamp: string;
  track: string;
  contextItems: ContextItem[];
  trackingStateHash: string;
  voiceProfileHash?: string;
  chapterSaved: boolean;
  xmlSaved: boolean;
  wordCount: number;
  notes: string;
}

// ─── Hash Helper ──────────────────────────────────────────────────────────

function contentHash(content: string): string {
  // Simple hash — not cryptographic, just for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ─── Save Checkpoint ─────────────────────────────────────────────────────

const CHECKPOINT_DIR = path.join('book', 'checkpoints');

/** Persist a checkpoint to `book/checkpoints/chapter-N.json`. */
export function saveCheckpoint(
  projectRoot: string,
  checkpoint: ChapterCheckpoint
): void {
  const dir = path.join(projectRoot, CHECKPOINT_DIR);
  fs.ensureDirSync(dir);
  const filename = `chapter-${checkpoint.chapterNumber}.json`;
  fs.writeJsonSync(path.join(dir, filename), checkpoint, { spaces: 2 });
}

/** Construct a ChapterCheckpoint by hashing tracking state and voice profiles. */
export function buildCheckpoint(
  projectRoot: string,
  chapterNumber: number,
  track: string,
  contextItems: ContextItem[],
  options?: { chapterSaved?: boolean; xmlSaved?: boolean; wordCount?: number; notes?: string }
): ChapterCheckpoint {
  // Hash tracking state for change detection
  const trackingDir = path.join(projectRoot, 'book', 'tracking');
  let trackingStateHash = '';
  if (fs.existsSync(trackingDir)) {
    const trackingFiles = fs.readdirSync(trackingDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .map(f => fs.readFileSync(path.join(trackingDir, f), 'utf-8'))
      .join('');
    trackingStateHash = contentHash(trackingFiles);
  }

  // Hash voice profile if exists
  const voiceProfilePath = path.join(projectRoot, 'book', 'knowledge', 'voice-profiles.json');
  let voiceProfileHash: string | undefined;
  if (fs.existsSync(voiceProfilePath)) {
    voiceProfileHash = contentHash(fs.readFileSync(voiceProfilePath, 'utf-8'));
  }

  return {
    chapterNumber,
    timestamp: new Date().toISOString(),
    track,
    contextItems,
    trackingStateHash,
    voiceProfileHash,
    chapterSaved: options?.chapterSaved ?? false,
    xmlSaved: options?.xmlSaved ?? false,
    wordCount: options?.wordCount ?? 0,
    notes: options?.notes ?? '',
  };
}

// ─── Load Checkpoint ────────────────────────────────────────────────────

/** Load a checkpoint for a specific chapter, or null if it doesn't exist. */
export function loadCheckpoint(
  projectRoot: string,
  chapterNumber: number
): ChapterCheckpoint | null {
  const filename = `chapter-${chapterNumber}.json`;
  const fullPath = path.join(projectRoot, CHECKPOINT_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return fs.readJsonSync(fullPath);
  } catch {
    return null;
  }
}

/** Find and load the highest-numbered checkpoint, or null if none exist. */
export function getLatestCheckpoint(projectRoot: string): ChapterCheckpoint | null {
  const dir = path.join(projectRoot, CHECKPOINT_DIR);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
    .map(f => {
      const match = f.match(/chapter-(\d+)\.json/);
      return match ? { file: f, chapter: parseInt(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.chapter - a!.chapter);

  if (files.length === 0) return null;
  return loadCheckpoint(projectRoot, files[0]!.chapter);
}

// ─── Resume Diff ─────────────────────────────────────────────────────────

/** Delta between a checkpoint and current file state for efficient resumption. */
export interface ResumeDiff {
  checkpoint: ChapterCheckpoint;
  unchanged: ContextItem[];    // Files that haven't changed since checkpoint
  changed: ContextItem[];      // Files that have changed since checkpoint
  missing: ContextItem[];       // Files that no longer exist
  newItems: ContextItem[];     // Files that exist now but weren't in checkpoint
}

/**
 * Compare current file state against checkpoint to determine what needs reloading.
 * On resume, load only changed/new files — unchanged files can be assumed stable.
 */
export function computeResumeDiff(
  projectRoot: string,
  checkpoint: ChapterCheckpoint
): ResumeDiff {
  const unchanged: ContextItem[] = [];
  const changed: ContextItem[] = [];
  const missing: ContextItem[] = [];

  for (const item of checkpoint.contextItems) {
    const fullPath = path.join(projectRoot, item.path);
    if (!fs.existsSync(fullPath)) {
      missing.push(item);
      continue;
    }

    const currentContent = fs.readFileSync(fullPath, 'utf-8');
    const currentHash = contentHash(currentContent);
    const currentSize = Buffer.byteLength(currentContent);

    if (item.hash === currentHash && item.size === currentSize) {
      unchanged.push(item);
    } else {
      changed.push({ ...item, hash: currentHash, size: currentSize });
    }
  }

  // Detect new tracking files not in checkpoint
  const trackingDir = path.join(projectRoot, 'book', 'tracking');
  const newItems: ContextItem[] = [];
  if (fs.existsSync(trackingDir)) {
    const currentTrackingFiles = fs.readdirSync(trackingDir).filter(f => f.endsWith('.json'));
    const checkpointTrackingPaths = checkpoint.contextItems
      .filter(i => i.path.includes('tracking/'))
      .map(i => path.basename(i.path));

    for (const tf of currentTrackingFiles) {
      if (!checkpointTrackingPaths.includes(tf)) {
        const fullPath = path.join(trackingDir, tf);
        const content = fs.readFileSync(fullPath, 'utf-8');
        newItems.push({
          id: `tracking-${tf}`,
          path: path.join('book', 'tracking', tf),
          loaded: false,
          hash: contentHash(content),
          size: Buffer.byteLength(content),
        });
      }
    }
  }

  // Check if tracking state hash changed
  let trackingChanged = false;
  if (fs.existsSync(trackingDir)) {
    const currentTrackingContent = fs.readdirSync(trackingDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .map(f => fs.readFileSync(path.join(trackingDir, f), 'utf-8'))
      .join('');
    if (contentHash(currentTrackingContent) !== checkpoint.trackingStateHash) {
      trackingChanged = true;
    }
  }

  return {
    checkpoint,
    unchanged,
    changed,
    missing,
    newItems: trackingChanged ? [...newItems, ...changed.filter(c => c.path.includes('tracking/'))] : newItems,
  };
}

// ─── Resume Report ───────────────────────────────────────────────────────

/** Format a resume diff as a human-readable markdown report. */
export function formatResumeReport(diff: ResumeDiff): string {
  const lines: string[] = [];
  lines.push(`# Resume Report — Chapter ${diff.checkpoint.chapterNumber}`);
  lines.push(`Checkpoint timestamp: ${diff.checkpoint.timestamp}`);
  lines.push(`Track: ${diff.checkpoint.track}`);
  lines.push('');

  lines.push('## Context Loading Plan');
  lines.push('');

  if (diff.unchanged.length > 0) {
    lines.push('### Unchanged (skip loading — stable since checkpoint)');
    for (const item of diff.unchanged) {
      lines.push(`  ✓ ${item.id}: ${item.path}`);
    }
    lines.push('');
  }

  if (diff.changed.length > 0) {
    lines.push('### Changed (must reload)');
    for (const item of diff.changed) {
      lines.push(`  ↻ ${item.id}: ${item.path}`);
    }
    lines.push('');
  }

  if (diff.newItems.length > 0) {
    lines.push('### New (must load)');
    for (const item of diff.newItems) {
      lines.push(`  + ${item.id}: ${item.path}`);
    }
    lines.push('');
  }

  if (diff.missing.length > 0) {
    lines.push('### Missing (may have been deleted or renamed)');
    for (const item of diff.missing) {
      lines.push(`  ✗ ${item.id}: ${item.path}`);
    }
    lines.push('');
  }

  if (diff.checkpoint.notes) {
    lines.push('## Notes');
    lines.push(diff.checkpoint.notes);
    lines.push('');
  }

  return lines.join('\n');
}