/**
 * Phase Preview — Pre-Execution Confirmation
 *
 * Before running any phase, show the author what will happen:
 * scope, estimated time, what will change. The author confirms
 * before the phase executes.
 *
 * Low cost, high trust value — prevents "wait, I didn't mean to run all 6 chapters".
 */

// ─── Types ───────────────────────────────────────────────────────────────

export type PhaseType = 'draft' | 'critique' | 'revise' | 'edit' | 'review' | 'cycle' | 'publish';

export interface PhasePreview {
  phase: PhaseType;
  scope: PhaseScope;
  estimatedDuration: string;
  changesPreview: ChangePreview[];
  warnings: string[];
  requiresConfirmation: boolean;
}

export interface PhaseScope {
  chapters: number[];           // which chapters will be affected
  chapterCount: number;
  estimatedWords: number;       // for draft: expected output; for revise: words to process
  contextToLoad: string[];      // what context files will be loaded
  gatesToRun: string[];         // which quality gates will execute
  batchMode: boolean;
}

export interface ChangePreview {
  type: 'create' | 'modify' | 'review';
  target: string;               // file or section name
  description: string;
  reversible: boolean;
}

// ─── Phase Preview Builders ───────────────────────────────────────────────────

/**
 * Build a preview for a draft phase.
 */
export function buildDraftPreview(
  chapters: number[],
  outlineWordCounts: number[],
  batchMode: boolean
): PhasePreview {
  const estimatedWords = outlineWordCounts.reduce((a, b) => a + b, 0);
  const estimatedMinutes = Math.ceil(estimatedWords / 500); // ~500 words/min generation

  const changes: ChangePreview[] = chapters.map((ch, i) => ({
    type: 'create' as const,
    target: `book/content/chapter-${String(ch).padStart(5, '0')}.md`,
    description: `Draft chapter ${ch} (~${outlineWordCounts[i]} words from outline)`,
    reversible: true,
  }));

  changes.push({
    type: 'create',
    target: `book/drafts/chapter-*.xml`,
    description: 'Save XML-structured drafts with verification tags',
    reversible: true,
  });

  return {
    phase: 'draft',
    scope: {
      chapters,
      chapterCount: chapters.length,
      estimatedWords,
      contextToLoad: [
        'constitution.md',
        'specification.md',
        'outline/',
        'knowledge/',
        'tracking/',
        'style-sheet/',
        'previous chapter (per chapter)',
        'awareness map (per chapter)',
      ],
      gatesToRun: ['pre-draft', 'post-draft', 'prose-quality', 'echo-detection', 'beat-arc', 'non-negotiables'],
      batchMode,
    },
    estimatedDuration: `~${estimatedMinutes} minutes (${estimatedWords} words)`,
    changesPreview: changes,
    warnings: buildWarnings(chapters, batchMode, 'draft'),
    requiresConfirmation: true,
  };
}

/**
 * Build a preview for a revise phase.
 */
export function buildRevisePreview(
  chapters: number[],
  critiqueItemCount: number,
  batchMode: boolean,
  depth: 'standard' | 'full' = 'standard'
): PhasePreview {
  const passes = depth === 'full' ? 3 : 1;
  const estimatedMinutes = Math.ceil(chapters.length * passes * 3);

  const changes: ChangePreview[] = chapters.map(ch => ({
    type: 'modify' as const,
    target: `book/content/chapter-${String(ch).padStart(5, '0')}.md`,
    description: `Revise chapter ${ch} based on critique feedback${depth === 'full' ? ' (3-pass: structural → language → pacing)' : ''}`,
    reversible: true,
  }));

  return {
    phase: 'revise',
    scope: {
      chapters,
      chapterCount: chapters.length,
      estimatedWords: 0,
      contextToLoad: [
        'constitution.md',
        'critique/ (feedback items)',
        'revisions/ (revision log)',
        'knowledge/',
        'style-sheet/',
      ],
      gatesToRun: ['revision-verify', 'non-negotiables'],
      batchMode,
    },
    estimatedDuration: `~${estimatedMinutes} minutes (${chapters.length} chapters × ${passes} pass${passes > 1 ? 'es' : ''})`,
    changesPreview: changes,
    warnings: buildWarnings(chapters, batchMode, 'revise'),
    requiresConfirmation: true,
  };
}

/**
 * Build a preview for an edit phase.
 */
export function buildEditPreview(
  chapters: number[],
  batchMode: boolean
): PhasePreview {
  const estimatedMinutes = Math.ceil(chapters.length * 5);

  const changes: ChangePreview[] = chapters.map(ch => ({
    type: 'modify' as const,
    target: `book/content/chapter-${String(ch).padStart(5, '0')}.md`,
    description: `Three-pass edit: line-edit → copy-edit → proofread`,
    reversible: true,
  }));

  return {
    phase: 'edit',
    scope: {
      chapters,
      chapterCount: chapters.length,
      estimatedWords: 0,
      contextToLoad: [
        'constitution.md',
        'style-sheet/',
        'knowledge/ (names, terms)',
      ],
      gatesToRun: ['subtext', 'purple-prose', 'cliche', 'rhythm', 'non-negotiables'],
      batchMode,
    },
    estimatedDuration: `~${estimatedMinutes} minutes (${chapters.length} chapters × 3 passes)`,
    changesPreview: changes,
    warnings: buildWarnings(chapters, batchMode, 'edit'),
    requiresConfirmation: true,
  };
}

/**
 * Build a preview for a critique phase.
 */
export function buildCritiquePreview(
  chapters: number[],
  mode: string,
  batchMode: boolean
): PhasePreview {
  const estimatedMinutes = Math.ceil(chapters.length * 4);

  return {
    phase: 'critique',
    scope: {
      chapters,
      chapterCount: chapters.length,
      estimatedWords: 0,
      contextToLoad: [
        'constitution.md',
        'specification.md',
        'outline/',
        'knowledge/',
      ],
      gatesToRun: [],
      batchMode,
    },
    estimatedDuration: `~${estimatedMinutes} minutes (${chapters.length} chapters, ${mode} mode)`,
    changesPreview: chapters.map(ch => ({
      type: 'create' as const,
      target: `book/critique/chapter-${String(ch).padStart(5, '0')}-${mode}.md`,
      description: `Critique chapter ${ch} in ${mode} mode`,
      reversible: true,
    })),
    warnings: buildWarnings(chapters, batchMode, 'critique'),
    requiresConfirmation: true,
  };
}

// ─── Warnings ────────────────────────────────────────────────────────────────

function buildWarnings(chapters: number[], batchMode: boolean, phase: string): string[] {
  const warnings: string[] = [];

  if (batchMode && chapters.length > 3) {
    warnings.push(`Batch mode: ${chapters.length} chapters will be processed. Shared context loaded once.`);
  }

  if (chapters.length > 6) {
    warnings.push(`Large batch (${chapters.length} chapters). Consider splitting into smaller batches for better quality.`);
  }

  if (phase === 'draft' && chapters.length > 6) {
    warnings.push(`Drafting ${chapters.length} chapters in one batch may lead to quality drift. Recommended: 6 or fewer.`);
  }

  if (phase === 'revise' && chapters.length === 0) {
    warnings.push('No chapters specified. Will revise all chapters with critique feedback.');
  }

  return warnings;
}

// ─── Formatting ────────────────────────────────────────────────────────────

export function formatPreviewForDisplay(preview: PhasePreview): string {
  const lines: string[] = [
    `## Phase Preview: ${preview.phase.toUpperCase()}`,
    '',
    '### Scope',
    `- **Chapters**: ${preview.scope.chapters.join(', ') || 'all'} (${preview.scope.chapterCount} total)`,
    `- **Batch mode**: ${preview.scope.batchMode ? 'Yes' : 'No'}`,
    `- **Estimated duration**: ${preview.estimatedDuration}`,
    '',
    '### Context to Load',
    ...preview.scope.contextToLoad.map(c => `- ${c}`),
    '',
    '### Quality Gates to Run',
    ...(preview.scope.gatesToRun.length > 0
      ? preview.scope.gatesToRun.map(g => `- ${g}`)
      : ['- (none for this phase)']),
    '',
    '### Changes',
    ...preview.changesPreview.map(c => {
      const icon = c.type === 'create' ? '[+]' : c.type === 'modify' ? '[~]' : '[?]';
      const rev = c.reversible ? ' (reversible)' : ' (NOT reversible)';
      return `${icon} ${c.target}: ${c.description}${rev}`;
    }),
    '',
  ];

  if (preview.warnings.length > 0) {
    lines.push('### Warnings');
    for (const w of preview.warnings) {
      lines.push(`- ⚠ ${w}`);
    }
    lines.push('');
  }

  if (preview.requiresConfirmation) {
    lines.push('**Confirm to proceed.** Type "yes" to execute, "no" to cancel, or adjust the scope.');
  }

  return lines.join('\n');
}