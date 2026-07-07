import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "cycle",
  description: "Batch editorial cycle by default: run full draft→critique→revise→edit→continuity pipeline for all pending chapters or up to 6 at a time. Single-chapter is explicit override.",
  reminder: "Batch per-chapter editorial cycle — full pipeline for multiple chapters",
  phases: "7-11",
  detailedDescription: `# User Input: {userInput}

## Objective

Run complete editorial cycles. **Batch mode is the default** — cycle all pending chapters through the full pipeline (draft → critique → revise → edit → continuity → done), or up to 6 at a time. This automates the entire editorial pipeline for maximum efficiency.

## Batch vs Single Mode

| Mode | Trigger | Behaviour |
|------|---------|-----------|
| Batch (DEFAULT) | \`/kombinat cycle\` | Cycle all pending chapters (up to 6) through full pipeline |
| Range | \`/kombinat cycle 3-8\` | Cycle chapters 3-8 through full pipeline |
| Single | \`/kombinat cycle Chapter 5\` | Cycle one chapter only (explicit override) |
| All | \`/kombinat cycle all\` | All pending chapters regardless of batch limit |

**Batch sizing:** When no range specified, read \`./book/tasks.md\` and collect all tasks with status \`[ ]\` (Pending). Up to 6 per batch.

## Prerequisites

- \`./book/outline.md\` must exist (chapters must be in the outline)
- \`./book/tasks.md\` must exist (chapters must have task entries)
- For chapters > 3: voice profiles should exist

## Execution Steps

### 1. Resolve Scope

Parse \`{userInput}\` and collect target chapters. Sort by chapter number. Take up to 6.

### 2. Check Current Sub-Status

For each chapter, read \`./book/tasks.md\` and determine current sub-status:

| Status | Cycle Resumes At |
|--------|------------------|
| \`[ ]\` Pending | Step 3 (Draft) |
| \`[/]\` In Progress | Step 3 (Draft — continue) |
| \`[FR]\` For Review | Step 4 (Critique) |
| \`[CR]\` In Critique | Step 4 (Critique — continue) |
| \`[RV]\` Revision Planned | Step 5 (Revise) |
| \`[R]\` Revised | Step 6 (Edit) |
| \`[ED]\` Edited | Step 7 (Continuity) |
| \`[X]\` Done | Skip — nothing to do |

### 3. Batch Draft Phase

Run the \`/kombinat draft\` batch workflow for all chapters needing drafting:
- Pre-draft gate (shared context loaded ONCE)
- XML-structured drafting (per chapter)
- Post-draft gate (per chapter)
- Style sheet check (per chapter)
- Save clean prose + XML version (per chapter)
- Update tracking between chapters for continuity

**Gates stop the entire batch.** If any chapter fails a gate, fix it before continuing.

Update task status to \`[FR]\` for all drafted chapters.

### 4. Batch Critique Phase

Run the \`/kombinat critique\` batch workflow for all chapters that just completed drafting:
- Auto-select mode based on chapter position
- Specificity gate (reject vague items)
- Save critique with unique IDs

**Gate: If no specific items generated, report: "Critique produced no actionable items. Chapters may be ready for edit." Proceed to Step 6.**

Update task status to \`[CR]\` then \`[RV]\`.

### 5. Batch Revise Phase

Run the \`/kombinat revise\` batch workflow for all chapters with critique feedback:
- Load critique items (ONCE for batch)
- Categorise and plan revisions
- Apply revisions (per chapter)
- Revision-verify gate (batch-wide — every Critical item across all chapters must be addressed)

**Gate: If revision-verify gate fails, STOP. Report unaddressed items.**

Update task status to \`[R]\`.

### 6. Batch Edit Phase

Run the \`/kombinat edit\` batch workflow for all revised chapters:
- Style sheet enforcement (hard block, loaded ONCE)
- Generate line-level edit suggestions (per chapter)
- Auto-approve Clarity and Error suggestions (objective improvements)
- Hold Polish, Voice, Style suggestions for user review

**Gate: Style sheet violations auto-fixed, then re-checked. If still violations, STOP.**

**Note:** Unlike interactive edit, the cycle auto-applies Clarity and Error fixes but does NOT auto-apply subjective suggestions. These are flagged for later review.

Update task status to \`[ED]\`.

### 7. Continuity Check (batch-wide)

Run \`/kombinat verify continuity\` across all chapters in the batch AND adjacent chapters:
- Check character state continuity between all chapters in batch
- Check timeline continuity
- Check plot thread tracking
- Check voice drift

**Gate: If contradictions found, STOP. Report contradictions.**

### 8. Mark Done

If all gates passed for all chapters:
- Update task status to \`[X]\` (Done) for all chapters in batch
- Save checkpoint
- Report batch cycle completion

### 9. Batch Cycle Report

\`\`\`markdown
## Batch Editorial Cycle Report

**Scope**: Chapters [start]–[end] ([N] chapters)
**Pipeline**: Draft → Critique → Revise → Edit → Continuity → Done

| Chapter | Draft | Critique | Revise | Edit | Continuity | Status |
|---------|-------|----------|--------|------|------------|--------|
| 3 | ✓ | ✓ 3 items | ✓ 2 fixed | ✓ 8 applied | ✓ | [X] Done |
| 4 | ✓ | ✓ 5 items | ✓ 4 fixed | ✓ 6 applied | ✓ | [X] Done |
| 5 | ✓ | ✓ 2 items | ✓ 2 fixed | ✓ 10 applied | ✗ Voice drift | [ED] Blocked |

**Gates**: All passed (or: Chapter 5 continuity failed — voice drift detected)
**Word counts**: [total before] → [total after]
**Critique items**: [N] generated, [M] specific, [K] applied
**Edit suggestions**: [N] auto-applied, [M] flagged for review

**Remaining**: [K] pending chapters. Run \`/kombinat cycle\` for the next batch.
\`\`\`

### 10. Next Steps

- All passed: "Batch cycle complete. [N] chapters done. Next: \`/kombinat cycle\` for the next batch, or \`/kombinat review final\` when all chapters are done."
- Partial: "Batch stopped at chapter [N] due to [gate failure]. Fix and re-run \`/kombinat cycle [N]\` to continue."

## Supplement Skills

Uses skills from draft, critique, revise, edit, and verify phases.`,
  tools: ["loadSkill", "bash"],
  relatedSkills: ["alpha-reader", "beta-reader", "peer-review", "sensitivity-reader", "pre-draft-checklist", "consistency-checker", "forgotten-elements", "style-enforcer"],
  examples: [
    { input: "/kombinat cycle", approach: "Runs full editorial cycle for all pending chapters (up to 6): draft→critique→revise→edit→continuity→done" },
    { input: "/kombinat cycle 3-8", approach: "Cycles chapters 3 through 8 through full pipeline" },
    { input: "/kombinat cycle Chapter 5", approach: "Single-chapter override — cycles only chapter 5" },
    { input: "/kombinat cycle all", approach: "Cycles ALL pending chapters regardless of batch limit" }
  ],
  warnings: ["Batch mode is the DEFAULT — single-chapter requires explicit chapter number", "Gates between each step are HARD BLOCKS — failures stop the entire batch", "Cycle auto-applies Clarity and Error edit suggestions but NOT subjective suggestions", "Shared context (constitution, style sheet, tracking) is loaded ONCE per phase, not per chapter", "Batch stops on first gate failure — fix the failed chapter before continuing the batch"]
}

export default spec