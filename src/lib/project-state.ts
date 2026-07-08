/**
 * Project State Detection Tool
 *
 * Scans the project directory to determine:
 * - Track (fiction / non-fiction / mixed)
 * - Current phase in the workflow
 * - Which phase documents exist and their status
 * - Recommended next phase
 *
 * Used by /kombinat for state-aware navigation.
 */

import fs from 'fs-extra';
import path from 'path';

/** Book track type — determines phase ordering. */
export type Track = 'fiction' | 'non-fiction' | 'mixed';
/** Workflow phase in the book-writing pipeline. */
export type Phase =
  | 'not-started'
  | 'constitute'
  | 'specify'
  | 'clarify'
  | 'research'
  | 'outline'
  | 'task-manager'
  | 'draft'
  | 'critique'
  | 'revise'
  | 'edit'
  | 'review'
  | 'publish'
  | 'complete';

/** High-level project state category for navigation. */
export type State =
  | 'not-started'
  | 'in-progress'
  | 'active-writing'
  | 'revision-cycle'
  | 'editing'
  | 'review'
  | 'publishing'
  | 'complete';

/** Complete snapshot of a project's detected state phase and readiness. */
export interface ProjectState {
  track: Track;
  phase: Phase;
  state: State;
  constitution: boolean;
  specification: boolean;
  clarificationNeeded: boolean;
  research: boolean;
  outline: boolean;
  tasks: boolean;
  chapters: number;
  critiqueRounds: number;
  revisions: number;
  edited: number;
  reviewed: boolean;
  metadata: boolean;
  nextRecommended: string;
  seriesId?: string;
  bookNumber?: number;
  isSeriesBook: boolean;
  seriesInitialized: boolean;
}

const BOOK_DIR = 'book';

/** Read `track.json` to determine fiction/non-fiction/mixed track. */
export function detectTrack(projectRoot: string): Track {
  const trackFile = path.join(projectRoot, BOOK_DIR, 'track.json');
  if (fs.existsSync(trackFile)) {
    const data = fs.readJsonSync(trackFile);
    if (data.track && ['fiction', 'non-fiction', 'mixed'].includes(data.track)) {
      return data.track as Track;
    }
  }
  return 'fiction'; // default
}

/** Return the ordered list of phases appropriate for the given track. */
export function getPhaseOrder(track: Track): Phase[] {
  const fiction: Phase[] = [
    'constitute', 'specify', 'clarify', 'research', 'outline',
    'task-manager', 'draft', 'critique', 'revise', 'edit', 'review', 'publish',
  ];
  const nonfiction: Phase[] = [
    'constitute', 'research', 'outline', 'task-manager',
    'draft', 'critique', 'revise', 'edit', 'review', 'publish',
  ];
  const mixed: Phase[] = [
    'constitute', 'specify', 'clarify', 'research', 'outline',
    'task-manager', 'draft', 'critique', 'revise', 'edit', 'review', 'publish',
  ];

  switch (track) {
    case 'fiction': return fiction;
    case 'non-fiction': return nonfiction;
    case 'mixed': return mixed;
  }
}

/** Scan the project directory to determine current phase state and next recommended step. */
export function detectState(projectRoot: string): ProjectState {
  const track = detectTrack(projectRoot);
  const bookDir = path.join(projectRoot, BOOK_DIR);
  const contentDir = path.join(bookDir, 'content');
  const critiqueDir = path.join(bookDir, 'critique');
  const revisionsDir = path.join(bookDir, 'revisions');

  const constitution = fs.existsSync(path.join(bookDir, 'constitution.md'));
  const specification = fs.existsSync(path.join(bookDir, 'specification.md')) ||
    fs.existsSync(path.join(bookDir, 'specification'));
  const outline = fs.existsSync(path.join(bookDir, 'outline.md')) ||
    fs.existsSync(path.join(bookDir, 'outline'));
  const tasks = fs.existsSync(path.join(bookDir, 'tasks.md')) ||
    fs.existsSync(path.join(bookDir, 'tasks'));
  const research = fs.existsSync(path.join(bookDir, 'research', 'research-plan.md')) ||
    fs.existsSync(path.join(bookDir, 'research', 'sources'));

  // Count chapters
  let chapters = 0;
  if (fs.existsSync(contentDir)) {
    chapters = fs.readdirSync(contentDir).filter(f => f.startsWith('chapter_')).length;
  }

  // Count critique rounds
  let critiqueRounds = 0;
  if (fs.existsSync(critiqueDir)) {
    critiqueRounds = fs.readdirSync(critiqueDir).filter(f => f.startsWith('round-')).length;
  }

  // Count revisions
  let revisions = 0;
  const revisionLog = path.join(revisionsDir, 'revision-log.md');
  if (fs.existsSync(revisionLog)) {
    const content = fs.readFileSync(revisionLog, 'utf-8');
    revisions = (content.match(/^## Revision \d+/gm) || []).length;
  }

  const metadata = fs.existsSync(path.join(bookDir, 'meta.json'));
  const reviewed = false; // would require parsing review reports

  // ─── Series detection ───
  const trackInfo = fs.existsSync(path.join(bookDir, 'track.json'))
    ? fs.readJsonSync(path.join(bookDir, 'track.json'))
    : {};
  const seriesId = trackInfo.seriesId as string | undefined;
  const bookNumber = trackInfo.bookNumber as number | undefined;
  const isSeriesBook = !!seriesId && !!bookNumber;
  const seriesInitialized = fs.existsSync(path.join(projectRoot, 'series', 'meta.json'));

  // Determine current phase
  const phases = getPhaseOrder(track);
  let currentPhaseIdx = 0;

  const phaseExists: Record<string, boolean> = {
    constitution, specification, outline, tasks, research,
  };

  for (let i = phases.length - 1; i >= 0; i--) {
    const p = phases[i];
    if (p === 'constitute' && constitution) { currentPhaseIdx = i; break; }
    if (p === 'specify' && specification) { currentPhaseIdx = i; break; }
    if (p === 'outline' && outline) { currentPhaseIdx = i; break; }
    if (p === 'task-manager' && tasks) { currentPhaseIdx = i; break; }
    if (p === 'research' && research) { currentPhaseIdx = i; break; }
    if (p === 'draft' && chapters > 0) { currentPhaseIdx = i; break; }
    if (p === 'critique' && critiqueRounds > 0) { currentPhaseIdx = i; break; }
    if (p === 'revise' && revisions > 0) { currentPhaseIdx = i; break; }
  }

  // If in a later phase but earlier phases are missing, report the first missing
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (p === 'constitute' && !constitution) { currentPhaseIdx = i; break; }
    if ((p === 'specify' || p === 'clarify') && !specification) { currentPhaseIdx = i; break; }
    if (p === 'outline' && !outline && specification) { currentPhaseIdx = i; break; }
    if (p === 'task-manager' && !tasks && outline) { currentPhaseIdx = i; break; }
  }

  const phase = phases[currentPhaseIdx];

  // Determine state category
  let state: State = 'not-started';
  if (constitution || specification) state = 'in-progress';
  if (chapters > 0 && critiqueRounds === 0) state = 'active-writing';
  if (critiqueRounds > 0) state = 'revision-cycle';
  if (revisions > 0 && chapters > 0) state = 'editing';
  if (phase === 'review') state = 'review';
  if (phase === 'publish') state = 'publishing';
  if (phase === 'complete') state = 'complete';

  const nextPhase = phases[Math.min(currentPhaseIdx + 1, phases.length - 1)];

  return {
    track,
    phase,
    state,
    constitution,
    specification,
    clarificationNeeded: false,
    research,
    outline,
    tasks,
    chapters,
    critiqueRounds,
    revisions,
    edited: 0,
    reviewed,
    metadata,
    nextRecommended: nextPhase,
    seriesId,
    bookNumber,
    isSeriesBook,
    seriesInitialized,
  };
}
