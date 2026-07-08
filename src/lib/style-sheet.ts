/**
 * Style Sheet System — Modular Living Document
 *
 * Every phase that makes a style, terminology, formatting, or timeline
 * decision appends to the appropriate style sheet module. The edit phase
 * checks against it. The review phase validates it.
 *
 * Modular structure (not a monolith):
 *   ./book/style-sheet/
 *   ├── terminology.md      — spelling, word choices, capitalization
 *   ├── character-voices.md  — per-character speech decisions
 *   ├── formatting.md        — punctuation, dialogue format, scene breaks
 *   ├── timeline.md          — date decisions, chronological ordering
 *   └── emotional-register.md — tone, atmosphere, emotional range decisions
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Module Definitions ──────────────────────────────────────────────────

/** A named module within the style sheet system. */
export type StyleSheetModule =
  | 'terminology'
  | 'character-voices'
  | 'formatting'
  | 'timeline'
  | 'emotional-register';

/** A single style decision recorded in a style sheet module. */
export interface StyleEntry {
  module: StyleSheetModule;
  decision: string;
  rationale: string;
  phase: string;        // which phase made this decision
  chapter?: number;     // chapter where decision was made
  date: string;
}

const MODULE_PATHS: Record<StyleSheetModule, string> = {
  'terminology': path.join('book', 'style-sheet', 'terminology.md'),
  'character-voices': path.join('book', 'style-sheet', 'character-voices.md'),
  'formatting': path.join('book', 'style-sheet', 'formatting.md'),
  'timeline': path.join('book', 'style-sheet', 'timeline.md'),
  'emotional-register': path.join('book', 'style-sheet', 'emotional-register.md'),
};

const MODULE_TITLES: Record<StyleSheetModule, string> = {
  'terminology': 'Terminology Decisions',
  'character-voices': 'Character Voice Decisions',
  'formatting': 'Formatting Decisions',
  'timeline': 'Timeline Decisions',
  'emotional-register': 'Emotional Register & Tone Decisions',
};

// ─── Initialization ──────────────────────────────────────────────────────

/** Create the style-sheet directory and all module files if they don't exist. */
export function initializeStyleSheet(projectRoot: string): void {
  const dir = path.join(projectRoot, 'book', 'style-sheet');
  fs.ensureDirSync(dir);

  for (const [module, relPath] of Object.entries(MODULE_PATHS)) {
    const fullPath = path.join(projectRoot, relPath);
    if (!fs.existsSync(fullPath)) {
      const title = MODULE_TITLES[module as StyleSheetModule];
      fs.writeFileSync(
        fullPath,
        `# ${title}\n\n*Living document — updated by every phase that makes ${module} decisions.*\n\n`,
        'utf-8'
      );
    }
  }
}

// ─── Append Decision ──────────────────────────────────────────────────────

/** Append a formatted style decision entry to the appropriate module file. */
export function appendDecision(
  projectRoot: string,
  entry: StyleEntry
): void {
  const fullPath = path.join(projectRoot, MODULE_PATHS[entry.module]);
  if (!fs.existsSync(fullPath)) {
    initializeStyleSheet(projectRoot);
  }

  const block = formatEntry(entry);
  fs.appendFileSync(fullPath, block, 'utf-8');
}

function formatEntry(entry: StyleEntry): string {
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

/** Read the full content of a single style sheet module. */
export function readModule(
  projectRoot: string,
  module: StyleSheetModule
): string {
  const fullPath = path.join(projectRoot, MODULE_PATHS[module]);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf-8');
}

/** Read all style sheet modules into a record keyed by module name. */
export function readAllModules(
  projectRoot: string
): Record<StyleSheetModule, string> {
  const result: Partial<Record<StyleSheetModule, string>> = {};
  for (const module of Object.keys(MODULE_PATHS) as StyleSheetModule[]) {
    result[module] = readModule(projectRoot, module);
  }
  return result as Record<StyleSheetModule, string>;
}

// ─── Check Against Style Sheet ──────────────────────────────────────────

/** A detected deviation from a style sheet rule. */
export interface StyleViolation {
  module: StyleSheetModule;
  decision: string;
  violation: string;
  location?: string;
}

/**
 * Scan text for violations against the style sheet.
 * This is a simple pattern-based check — the agent should also do a
 * semantic review when running the edit phase.
 */
export function checkViolations(
  projectRoot: string,
  text: string
): StyleViolation[] {
  const violations: StyleViolation[] = [];
  const modules = readAllModules(projectRoot);

  // Parse decisions from each module
  for (const [module, content] of Object.entries(modules)) {
    if (!content) continue;

    const decisionBlocks = content.split('---').filter(b => b.trim().length > 0);
    for (const block of decisionBlocks) {
      const decisionMatch = block.match(/\*\*Decision\*\*:\s*(.+)/);
      if (!decisionMatch) continue;
      const decision = decisionMatch[1].trim();

      // Extract the specific rule from the decision text
      // Format: "Use 'grey' not 'gray'" → check if "gray" appears in text
      const ruleMatch = decision.match(/(?:use|prefer|always|never)\s+['"]([^'"]+)['"](?:\s+(?:not|instead of|over)\s+['"]([^'"]+)['"])?/i);

      if (ruleMatch) {
        const preferred = ruleMatch[1];
        const forbidden = ruleMatch[2];

        if (forbidden) {
          // Check if forbidden term appears in text
          const regex = new RegExp(`\\b${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          if (regex.test(text)) {
            violations.push({
              module: module as StyleSheetModule,
              decision,
              violation: `Found "${forbidden}" — should use "${preferred}" instead`,
            });
          }
        }

        // Check if preferred term is used at all (for "always use X" rules)
        if (decision.toLowerCase().includes('always use') || decision.toLowerCase().includes('prefer')) {
          if (!text.toLowerCase().includes(preferred.toLowerCase())) {
            // Only flag if the text is long enough that the term should appear
            if (text.split(/\s+/).length > 500) {
              violations.push({
                module: module as StyleSheetModule,
                decision,
                violation: `"${preferred}" not found in text — style sheet says to always use it`,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}

// ─── Style Sheet Status ──────────────────────────────────────────────────

/** Check whether the style-sheet directory exists with at least one file. */
export function styleSheetExists(projectRoot: string): boolean {
  const dir = path.join(projectRoot, 'book', 'style-sheet');
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

/** Count the number of decisions in each style sheet module. */
export function getModuleStats(projectRoot: string): Record<StyleSheetModule, number> {
  const stats: Partial<Record<StyleSheetModule, number>> = {};
  for (const module of Object.keys(MODULE_PATHS) as StyleSheetModule[]) {
    const content = readModule(projectRoot, module);
    stats[module] = content ? (content.match(/^---$/gm) || []).length : 0;
  }
  return stats as Record<StyleSheetModule, number>;
}