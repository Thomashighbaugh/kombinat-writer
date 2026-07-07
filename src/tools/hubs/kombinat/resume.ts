import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "resume",
  description: "Resume an interrupted session: load JSON checkpoint, compute diff of changed files, report what's done and what's next, jump to the correct phase.",
  reminder: "Resume interrupted work from JSON checkpoint",
  phases: "all",
  detailedDescription: `# User Input: {userInput}

## Objective

Resume an interrupted writing session. Load the most recent checkpoint, compute a diff of what changed since the checkpoint, report what's done and what's next, and jump to the correct phase.

## Prerequisites

- At least one checkpoint must exist in \`./book/checkpoints/\`
- If no checkpoint exists, report: "No checkpoint found. This may be a new project or checkpoints were cleared. Use \`/kombinat status\` to see project state."

## Execution Steps

### 1. Find Latest Checkpoint

Scan \`./book/checkpoints/\` for the most recent checkpoint file. Checkpoints are JSON files named \`chapter-N.json\` or \`phase-N.json\` with timestamps.

**Checkpoint structure:**
\`\`\`json
{
  "timestamp": "2026-07-06T14:30:00Z",
  "phase": "draft",
  "chapter": 5,
  "track": "fiction",
  "contentHashes": {
    "book/content/chapter_00001.md": "sha256:abc123...",
    "book/content/chapter_00002.md": "sha256:def456...",
    "book/tracking/characters.json": "sha256:ghi789...",
    "book/outline.md": "sha256:jkl012...",
    "book/tasks.md": "sha256:mno345..."
  },
  "lastAction": "Drafting chapter 5, scene 3",
  "nextAction": "Complete scene 3 and run post-draft gate",
  "wordCount": 4200,
  "targetWords": 8000
}
\`\`\`

### 2. Compute Resume Diff

Compare current file hashes against checkpoint hashes:

\`\`\`json
{
  "changed": ["book/content/chapter_00002.md", "book/tracking/characters.json"],
  "new": ["book/content/chapter_00003.md"],
  "deleted": [],
  "unchanged": ["book/outline.md", "book/tasks.md", "book/content/chapter_00001.md"]
}
\`\`\`

**For each changed file:**
- Compute current hash
- Compare to checkpoint hash
- If different: mark as "changed"
- If file exists but not in checkpoint: mark as "new"
- If file in checkpoint but missing: mark as "deleted"

### 3. Load State

Read:
- \`./book/tasks.md\` — current task statuses
- \`./book/tracking/\` — current tracking state
- \`./book/meta.json\` — project metadata
- Changed files' current content

### 4. Generate Resume Report

\`\`\`markdown
## Resume Report

**Last checkpoint**: [timestamp]
**Phase**: [phase]
**Chapter**: [N]
**Last action**: [description from checkpoint]
**Next action**: [description from checkpoint]

### File Changes Since Checkpoint
| File | Status | Action Needed |
|------|--------|---------------|
| book/content/chapter_00002.md | changed | Review changes — may need to re-run gates |
| book/content/chapter_00003.md | new | Run post-draft gate if drafting was in progress |
| book/tracking/characters.json | changed | Verify tracking is consistent with content |

### Progress
- Word count: [current] / [target] ([%])
- Chapters drafted: [N] / [total]
- Tasks complete: [N] / [total]

### Recommended Next Step
[Based on the checkpoint's nextAction and the file diff, recommend the next command to run]

**Options:**
- If drafting was in progress: \`/kombinat draft Chapter [N]\` to continue
- If chapter was just drafted: \`/kombinat critique Chapter [N]\` to review
- If revisions were in progress: \`/kombinat revise\` to continue
- If editing was in progress: \`/kombinat edit Chapter [N]\` to continue
\`\`\`

### 5. Offer to Jump

Present the recommended next step and ask the user:
"Resume with \`/kombinat [phase] [args]\`? (yes/no)"

If yes, the router will dispatch to the correct phase with the chapter number pre-loaded.

### 6. Save New Checkpoint

After resuming (or if the user chooses a different action), save a new checkpoint to capture the current state.

## Checkpoint Format

Checkpoints are JSON, not markdown — they are programmatic state, not human-readable documentation. The resume command converts them to a readable report on demand.

**File location:** \`./book/checkpoints/checkpoint-[timestamp].json\`
**Also maintains:** \`./book/checkpoints/latest.json\` (symlink or copy of most recent)

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`checkpoints\` | \`src/lib/checkpoints.ts\` | Checkpoint save/load/resume engine |`,
  tools: ["bash"],
  relatedSkills: ["consistency-checker"],
  examples: [
    { input: "/kombinat resume", approach: "Loads latest checkpoint, computes diff, reports what's done and what's next" }
  ],
  warnings: ["If no checkpoint exists, reports 'no checkpoint found' and suggests /kombinat status", "Changed files may need gates re-run — the resume report flags this", "Checkpoints are JSON (programmatic), converted to readable report on demand"]
}

export default spec