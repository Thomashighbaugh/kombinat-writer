import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "revise",
  description: "Batch revision by default: revise all chapters with critique feedback or up to 6 at a time. Revision-verify gate hard-blocks on unaddressed Critical items. Cross-referenced revision log.",
  reminder: "Phase 9: Batch structured revisions with verification gate",
  phases: "9",
  detailedDescription: `# User Input: {userInput}

## Objective

Transform critique feedback into structured revisions, apply changes, and verify every Critical and Major item is addressed. **Batch mode is the default** — revise all chapters that have critique feedback, or up to 6 at a time.

## Batch vs Single Mode

| Mode | Trigger | Behaviour |
|------|---------|-----------|
| Batch (DEFAULT) | \`/kombinat revise\` or \`/kombinat revise 1\` | Revise all chapters with critique feedback from round N (up to 6) |
| Range | \`/kombinat revise 1 3-8\` | Revise chapters 3-8 from critique round 1 |
| Single | \`/kombinat revise Chapter 3\` | Revise one chapter only (explicit override) |

**Batch sizing:** When no range specified, read the latest critique round and collect all chapters that have critique items. Up to 6 per batch.

## Prerequisites

- At least one critique round must exist in \`./book/critique/round-N/\`
- Critique items must have unique IDs (e.g., C1-A-001)

## Execution Steps

### 1. Load Critique Round (once per batch)

Read the critique round directory ONCE:
- \`summary.md\` — consolidated priority matrix with all items across all chapters
- \`chapter-M.md\` — per-chapter critique
- \`rejected-items.md\` — items that failed specificity gate (skip these)

### 2. Categorise Feedback

Group feedback items into revision categories:

| Category | Definition | Typical Severity |
|----------|------------|-----------------|
| Structural | Scene order, chapter breaks, pacing, argument flow | Critical, Major |
| Substantive | Character arc, plot logic, evidence adequacy, thesis | Critical, Major |
| Clarity | Confusion points, ambiguous phrasing, unclear argument | Major, Minor |
| Consistency | Contradictions with constitution, specification, earlier content | Major, Minor |
| Enhancement | Opportunities to strengthen existing content | Minor, Observation |
| Correction | Factual errors, citation errors, timeline errors | Critical, Major |

### 3. Plan Revisions (Cross-Referenced, batch-wide)

For each critique item, decide a disposition:

| Disposition | Meaning | Action |
|-------------|---------|--------|
| Accept | Feedback is correct | Plan specific changes |
| Accept with Adaptation | Feedback has merit but needs custom solution | Design alternative fix |
| Discuss | Uncertainty about how to address | Flag for author decision |
| Defer | Valid but lower priority | Schedule for later round |
| Decline | Feedback conflicts with constitution or vision | Document rationale |

**Revision plan format:**

\`\`\`markdown
## Revision Plan: Round [N]

| Critique ID | Chapter | Category | Disposition | Planned Change |
|-------------|---------|----------|-------------|----------------|
| C1-A-001 | 3 | Structural | Accept | Add opposition force to scene 2 |
| C1-A-002 | 3 | Pacing | Accept with Adaptation | Compress transition paragraphs 5-7 |
| C1-B-001 | 3 | Engagement | Defer | Expand emotional beat in scene 4 (round 2) |
| C1-A-010 | 4 | Substantive | Accept | Reveal character motivation earlier |
\`\`\`

### 4. Apply Revisions (per chapter in batch)

**Multi-pass option:** \`/kombinat revise --depth full\` runs three sequential passes, each with a different lens. The output of pass 1 is the input of pass 2. Default (single pass) applies all revisions in one go.

**Pass 1: Structural & Character (when --depth full)**
Focus: Scene order, chapter breaks, character arc beats, plot logic, argument flow.
Apply all structural and substantive revisions first. Save intermediate version.

**Pass 2: Language & Craft (when --depth full)**
Focus: Clarity, consistency, enhancement, prose quality at the revision level.
Apply clarity and consistency revisions to the intermediate version. Save.

**Pass 3: Pacing & Tension (when --depth full)**
Focus: Pacing adjustments, tension calibration, emotional beat placement.
Apply pacing and enhancement revisions to the pass-2 output. Save final.

**Default (single pass):** Apply all revisions in one pass, organized by category priority.

**Anti-AI-Slop Mandate:** During revision, actively eliminate AI writing slop identified in the critique (AI-SLOP prefixed items). Additionally, the reviser must not introduce new slop patterns when rewriting. Common slop to eliminate and avoid:

- **Ozone smell/taste** without an electrical event (the signature AI slop tell — always remove, always avoid)
- Stock sensory clichés: "copper taste of blood," "air crackled with tension," "shiver ran down spine"
- "Eyes like [gemstone]" and "lips curled into a [animal] smile" formulas
- Structural tells: "Not [X]. Not [X] the way [Y] expected," repetitive anaphora, "It wasn't just [X]. It was [Y]" binary-escalation
- Adverbial dialogue tags ("said angrily") — replace with action beats
- Hollow emotional beats: "Something shifted in [their] expression," "The weight of [abstract noun] hung in the air," "They didn't say anything. They didn't have to."

**When rewriting any passage, ask: Does this sentence sound like AI default prose?** If yes, rewrite it with a specific, earned detail instead. The reviser should leave the prose more human, not less.

For each chapter in the batch:
1. Load the target chapter (and XML version from \`./book/drafts/\` if available)
2. Apply all accepted revisions for that chapter
3. Record in the revision log with cross-reference to critique ID:

\`\`\`markdown
## Revision [N]: Chapter [M]
- **Critique ID**: [e.g., C1-A-001]
- **Source**: Critique round [R], item [ID]
- **Change**: [What was changed — specific]
- **Rationale**: [Why this change addresses the feedback]
- **Status**: Applied / Pending / Declined
- **Verified**: [Yes/No — see Revision-Verify Gate]
\`\`\`

### 5. Revision-Verify Gate (HARD BLOCK — per batch)

After all revisions are applied across all chapters in the batch, run the revision-verify gate. This gate cross-references every critique item against the revision log.

**Gate checks:**

1. **Critical items addressed**: Every item with severity "Critical" must have a corresponding revision log entry with status "Applied". **If any Critical item is unaddressed: BLOCK. Report the item ID.**
2. **Major items addressed or deferred**: Every item with severity "Major" must be either Applied or Deferred (with rationale and target round). **If any Major item is neither: BLOCK.**
3. **Declined items have rationale**: Every "Decline" must have a rationale. **If missing: BLOCK.**
4. **Verification evidence**: For each "Applied" revision, verify the change actually exists in the chapter file. Compare pre-revision and post-revision text. **If logged as "Applied" but change not in file: BLOCK.**

**Gate output:**

\`\`\`markdown
## Revision-Verify Gate Report (Batch: Chapters [start]–[end])

| Critique ID | Severity | Chapter | Disposition | Applied | Verified |
|-------------|----------|---------|-------------|---------|----------|
| C1-A-001 | Critical | 3 | Accept | Yes | ✓ Confirmed |
| C1-A-010 | Major | 4 | Accept | Yes | ✓ Confirmed |
| C1-B-001 | Minor | 3 | Defer | N/A | N/A |

**Summary**: [N] Critical: [N] addressed. [M] Major: [M] addressed/deferred. [K] revisions verified.
**Gate Result**: PASS / FAIL
\`\`\`

**If gate fails: STOP. Report specific failures. Do not mark revisions complete.**

### 6. Update Tracking and Tasks

- Update \`./book/tracking/\` to reflect changes to character state, plot, timeline, or sources
- Update task status from \`[FR]\` or \`[CR]\` to \`[R]\` (Revised) for all affected chapters

### 7. Batch Report

\`\`\`markdown
## Batch Revision Report

**Scope**: Chapters [start]–[end] ([N] chapters)
**Critique items**: [N] total, [M] accepted, [K] deferred, [L] declined
**Revision-verify**: PASS

| Chapter | Critical Fixed | Major Fixed | Deferred | Declined |
|---------|----------------|-------------|----------|----------|
| 3 | 1 | 2 | 1 | 0 |
| 4 | 0 | 3 | 0 | 1 |
| 5 | 2 | 1 | 0 | 0 |
\`\`\`

### 8. Next Steps

"Revisions applied and verified. All Critical items addressed. Continue to line-level editing: \`/kombinat edit\`."

### 9. Human-in-the-Loop Features

The revise phase integrates these HITL features:

**Phase Preview** (\`src/lib/phase-preview.ts\`): Before revising, show the author what will happen — which chapters, how many critique items, estimated duration. Author confirms before execution.

**Authorial Intent** (\`src/lib/authorial-intent.ts\`): Capture the author's revision intent. Generic fallback available: "Revise to address all critique items while preserving the author's voice and the constitution's principles."

**Diff-Based Approval** (\`src/lib/diff-approval.ts\`): After revision, show the author a structured diff (before/after). The author approves line-by-line, rejects specific hunks, or accepts all. Rejected hunks preserve the original text. Saved to \`./book/revisions/approvals/\`.

**Non-Negotiables Gate** (\`src/lib/creative-constraints.ts\`): Revised content is checked against creative constraints. Violations block the revision.

**Provenance Tracking** (\`src/lib/provenance.ts\`): Revised lines are tagged as 'ai-revised' (approved as-is) or 'ai-modified' (author modified before acceptance). Updated provenance sidecar saved per chapter.

## Supplement Skills

None specific to this phase.

### HITL Libraries

| Library | File | Purpose |
|---------|------|---------|
| \`phase-preview\` | \`src/lib/phase-preview.ts\` | Pre-execution confirmation |
| \`authorial-intent\` | \`src/lib/authorial-intent.ts\` | Intent capture before revision |
| \`diff-approval\` | \`src/lib/diff-approval.ts\` | Diff-based approval gates |
| \`creative-constraints\` | \`src/lib/creative-constraints.ts\` | Non-negotiables gate |
| \`provenance\` | \`src/lib/provenance.ts\` | Change provenance tracking |`,
  tools: ["bash"],
  relatedSkills: ["consistency-checker", "forgotten-elements", "style-enforcer", "phase-preview", "authorial-intent", "diff-approval", "creative-constraints", "provenance"],
  examples: [
    { input: "/kombinat revise", approach: "Loads latest critique round, revises all affected chapters (up to 6), runs revision-verify gate" },
    { input: "/kombinat revise 1", approach: "Loads critique round 1, revises all chapters with items from round 1" },
    { input: "/kombinat revise 1 3-8", approach: "Revises chapters 3-8 from critique round 1" },
    { input: "/kombinat revise Chapter 3", approach: "Single-chapter override — revises only chapter 3" }
  ],
  warnings: ["Batch mode is the DEFAULT — single-chapter requires explicit chapter number", "Revision-verify gate is a HARD BLOCK — unaddressed Critical items or unverified applied revisions block completion", "Every revision log entry must cross-reference the critique item ID", "Declined items must have documented rationale", "Critique round is loaded ONCE for the entire batch"]
}

export default spec