import fs from 'fs-extra';
import path from 'path';

// ─── Module Definitions ──────────────────────────────────────────────────

/** A named module within the project metadata system. */
export type MetadataModule =
  | 'formatting'
  | 'tone'
  | 'emotional-register'
  | 'character-voices'
  | 'terminology'
  | 'relationships'
  | 'timeline'
  | 'validation-rules'
  | 'plot-tracker';

/** A single style/metadata decision recorded in a module. */
export interface MetadataEntry {
  module: MetadataModule;
  decision: string;
  rationale: string;
  phase: string;        // which phase made this decision
  chapter?: number;     // chapter where decision was made
  date: string;
}

/** 
 * Dynamically resolves the path for a metadata module based on track and series status.
 */
export function resolveModulePath(projectRoot: string, module: MetadataModule): string {
    const trackPath = path.join(projectRoot, 'book', 'track.json');
    let track = 'fiction';
    let seriesId = null;
    if (fs.existsSync(trackPath)) {
        try {
            const trackData = fs.readJsonSync(trackPath);
            track = trackData.track || 'fiction';
            seriesId = trackData.seriesId || null;
        } catch {}
    }

    switch (module) {
        case 'formatting':
        case 'tone':
            return path.join('book', 'metadata', `${module}.md`);
        case 'emotional-register':
        case 'character-voices':
        case 'relationships':
        case 'timeline':
        case 'validation-rules':
        case 'plot-tracker':
            return track === 'fiction' ? path.join('book', 'metadata', `${module}.md`) : '';
        case 'terminology':
            if (track === 'non-fiction') return path.join('book', 'research', 'terminology.md');
            if (seriesId) return path.join('..', 'series', 'lorebook', 'terminology.md'); // relative to book root inside a series
            return path.join('book', 'lorebook', 'terminology.md');
        default:
            return '';
    }
}

const MODULE_TITLES: Record<MetadataModule, string> = {
  'formatting': 'Formatting Decisions',
  'tone': 'Tone Decisions',
  'emotional-register': 'Emotional Register',
  'character-voices': 'Character Voice Decisions',
  'terminology': 'Terminology',
  'relationships': 'Character Relationships',
  'timeline': 'Timeline',
  'validation-rules': 'Validation Rules',
  'plot-tracker': 'Plot Tracker'
};

// ─── Initialization ──────────────────────────────────────────────────────

/** Create the metadata directories and all module files if they don't exist. */
export function initializeMetadata(projectRoot: string): void {
  const metadataDir = path.join(projectRoot, 'book', 'metadata');
  fs.ensureDirSync(metadataDir);

  const modules: MetadataModule[] = [
      'formatting', 'tone', 'emotional-register', 'character-voices', 
      'terminology', 'relationships', 'timeline', 'validation-rules', 'plot-tracker'
  ];

  for (const module of modules) {
    const relPath = resolveModulePath(projectRoot, module);
    if (!relPath) continue;
    
    const fullPath = path.join(projectRoot, relPath);
    if (!fs.existsSync(fullPath)) {
      fs.ensureDirSync(path.dirname(fullPath));
      const title = MODULE_TITLES[module];
      fs.writeFileSync(
        fullPath,
        `# ${title}\n\n*Living document — updated by every phase that makes ${module} decisions.*\n\n`,
        'utf-8'
      );
    }
  }
}

// ─── Append Decision ──────────────────────────────────────────────────────

/** Append a formatted decision entry to the appropriate module file. */
export function appendDecision(
  projectRoot: string,
  entry: MetadataEntry
): void {
  const relPath = resolveModulePath(projectRoot, entry.module);
  if (!relPath) return;
  
  const fullPath = path.join(projectRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    initializeMetadata(projectRoot);
  }

  const block = formatEntry(entry);
  fs.appendFileSync(fullPath, block, 'utf-8');
}

function formatEntry(entry: MetadataEntry): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push('');
  lines.push(`**Decision**: ${entry.decision}`);
  lines.push(`**Rationale**: ${entry.rationale}`);
  lines.push(`**Phase**: ${entry.phase}${entry.chapter ? ` (Chapter ${entry.chapter})` : ''}`);
  lines.push(`**Date**: ${entry.date}`);
  lines.push('');
  return lines.join('\n') + '\n';
}

// ─── Read Module ──────────────────────────────────────────────────────────

/** Read the full content of a single metadata module. */
export function readModule(
  projectRoot: string,
  module: MetadataModule
): string {
  const relPath = resolveModulePath(projectRoot, module);
  if (!relPath) return '';
  const fullPath = path.join(projectRoot, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf-8');
}

/** Read all metadata modules into a record keyed by module name. */
export function readAllModules(
  projectRoot: string
): Record<MetadataModule, string> {
  const result: Partial<Record<MetadataModule, string>> = {};
  const modules: MetadataModule[] = [
      'formatting', 'tone', 'emotional-register', 'character-voices', 
      'terminology', 'relationships', 'timeline', 'validation-rules', 'plot-tracker'
  ];
  for (const module of modules) {
    result[module] = readModule(projectRoot, module);
  }
  return result as Record<MetadataModule, string>;
}

// ─── Metadata Status ──────────────────────────────────────────────────

/** Check whether the metadata directory exists with at least one file. */
export function metadataExists(projectRoot: string): boolean {
  const dir = path.join(projectRoot, 'book', 'metadata');
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}