import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "task-manager",
  description: "Break outline into dependency-tracked tasks with per-chapter sub-status lifecycle: draft → critique → revise → edit → done. Supports per-chapter editorial cycles.",
  reminder: "Phase 6: Convert outline into tracked writing tasks with per-chapter lifecycle",
  phases: "6",
  detailedDescription: `# User Input: {userInput}

## Objective

Convert the chapter or section outline into tracked writing tasks. Each chapter has its own sub-status lifecycle tracking progress through the editorial cycle: draft → critique → revise → edit → done.

## Prerequisites

- \`./book/outline.md\` or \`./book/outline/\` must exist

## Execution Steps

### 1. Load Outline

Read \`./book/outline.md\` (or \`./book/outline/_main.md\` and relevant shards).

### 2. Generate Tasks

For each chapter/section in the outline, create a task entry with per-chapter sub-status:

\`\`\`
[ ] [Priority] [Dep:N] [Phase] Chapter N: [Title]
    Draft: [ ] | Critique: [ ] | Revise: [ ] | Edit: [ ] | Done: [ ]
\`\`\`

- \`[ ]\` → main status placeholder
- \`[High]\`, \`[Medium]\`, \`[Low]\` → priority based on critical path
- \`[Dep:N]\` → depends on task number N
- \`[P]\` → parallelisable (no dependencies)
- Phase tag: \`Draft\`, \`Critique\`, \`Revise\`, \`Edit\`
- Per-chapter sub-status: tracks editorial cycle progress

**Example:**
\`\`\`
[ ] [High] [P] [Draft] Chapter 1: The Summons
    Draft: [ ] | Critique: [ ] | Revise: [ ] | Edit: [ ] | Done: [ ]
[ ] [High] [Dep:1] [Draft] Chapter 2: The Threshold
    Draft: [ ] | Critique: [ ] | Revise: [ ] | Edit: [ ] | Done: [ ]
[ ] [Medium] [P] [Draft] Interlude: The Advisor's Tale
    Draft: [ ] | Critique: [ ] | Revise: [ ] | Edit: [ ] | Done: [ ]
\`\`\`

### 3. Main Status Lifecycle

Each task moves through these main statuses:

\`\`\`
[ ] (Pending)
  → [/] (In Progress)
  → [FR] (For Review — draft complete, needs critique)
  → [CR] (In Critique)
  → [RV] (Revision Planned)
  → [R] (Revised — changes applied)
  → [ED] (Edited — line pass complete)
  → [X] (Done — approved)
\`\`\`

### 4. Per-Chapter Sub-Status Lifecycle

Each chapter has sub-status checkboxes that track editorial cycle progress:

\`\`\`
Draft: [ ] → [/] → [X]
Critique: [ ] → [/] → [X]
Revise: [ ] → [/] → [X]
Edit: [ ] → [/] → [X]
Done: [ ] → [X]
\`\`\`

**Sub-status transitions:**

| Sub-status | Marked [/] when | Marked [X] when |
|------------|-----------------|-----------------|
| Draft | Pre-draft gate passes, drafting begins | Post-draft gate passes, chapter saved |
| Critique | Critique mode selected | Specificity gate passes, critique saved |
| Revise | Revision plan created | Revision-verify gate passes |
| Edit | Style sheet check passes | Edit suggestions resolved |
| Done | All sub-statuses [X] | Continuity check passes |

**The \`/kombinat cycle\` command automates this lifecycle.** When using \`/kombinat cycle Chapter N\`, the cycle updates sub-status checkboxes as it progresses through each phase.

### 5. Group by Phase

Organise tasks into phase groups:

**Draft Tasks** — writing chapters/sections
**Critique Tasks** — reviewing written chapters
**Revision Tasks** — applying critique feedback
**Edit Tasks** — line-level pass

### 6. Editorial Cycle Log

At the bottom of \`tasks.md\`, include an Editorial Cycle Log for tracking \`/kombinat cycle\` runs:

\`\`\`markdown
## Editorial Cycle Log

| Date | Chapter | Phases Completed | Duration | Notes |
|------|---------|-------------------|----------|-------|
| 2026-07-06 | 5 | Draft→Edit | 45m | All gates passed |
\`\`\`

### 7. Save Task Dashboard

Save to \`./book/tasks.md\`. If exceeding ~500 tasks or lines, split to \`./book/tasks/_main.md\` with per-arc/per-section shards.

### 8. Next Steps (Auto-Handoff)

After saving the task dashboard, offer to automatically continue. Use the \`question\` tool:

Question: "Task dashboard created. Ready to start drafting?"
Options:
- **Yes — Draft** → Run \`/kombinat draft\` (call hubMenu route for \`draft\`)
- **Yes — Cycle (draft→critique→revise→edit)** → Run \`/kombinat cycle\` (call hubMenu route for \`cycle\`)
- **No — I'll continue later** → Stop

If the user selects, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately.

## Supplement Skills

None specific to this phase.`,
  tools: ["bash"],
  relatedSkills: ["consistency-checker"],
  examples: [
    { input: "/kombinat task-manager", approach: "Breaks outline into tracked tasks with per-chapter sub-status" },
    { input: "/kombinat cycle Chapter 5", approach: "Runs full editorial cycle — task sub-statuses update automatically" }
  ],
  warnings: ["Per-chapter sub-status is updated by the /kombinat cycle command as it progresses through phases", "Sub-status checkboxes use [ ] → [/] → [X] notation matching main task status"]
}

export default spec