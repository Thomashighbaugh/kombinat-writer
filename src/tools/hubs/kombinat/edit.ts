import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "edit",
  description: "Three-pass editing: line-edit (sentence craft), copy-edit (mechanics), proofread (typos). Includes subtext, purple-prose, cliché, and sentence rhythm analysis. Batch by default.",
  reminder: "Phase 10: Batch line-level prose editing with style sheet enforcement",
  phases: "10",
  detailedDescription: `# User Input: {userInput}

## Objective

Improve prose quality at the line level through three distinct passes, each with a different focus. **Batch mode is the default** — edit all chapters with status \`[R]\` (Revised), or up to 6 at a time. The editor enforces the modular style sheet and runs linguistic quality analyses (subtext, purple prose, clichés, sentence rhythm) as hard-block gates.

## Batch vs Single Mode

| Mode | Trigger | Behaviour |
|------|---------|-----------|
| Batch (DEFAULT) | \`/kombinat edit\` | Edit all [R] chapters (up to 6) |
| Range | \`/kombinat edit 3-8\` | Edit chapters 3-8 |
| Single | \`/kombinat edit Chapter 3\` | Edit one chapter only (explicit override) |

**Batch sizing:** When no range specified, read \`./book/tasks.md\` and collect all tasks with status \`[R]\` (Revised). Up to 6 per batch.

## Prerequisites

- Target chapters must be revised (task status \`[R]\` or beyond)
- Style sheet modules should exist in \`./book/style-sheet/\`

## Execution Steps

### 1. Resolve Scope

Parse \`{userInput}\`:
- \`/kombinat edit\` → all [R] chapters (up to 6)
- \`/kombinat edit 3-8\` → chapters 3 through 8
- \`/kombinat edit Chapter 3\` → single chapter
- \`/kombinat edit all\` → all [R] chapters regardless of batch limit

### 2. Load Shared Context (once per batch)

Read ONCE for the entire batch:
- The constitution (style principles)
- Knowledge files (character voices for fiction)
- Revision log entries affecting chapters in batch
- **All style sheet modules** from \`./book/style-sheet/\`:
  - \`terminology.md\` — spelling, word choices, capitalization
  - \`character-voices.md\` — per-character speech decisions
  - \`formatting.md\` — punctuation, dialogue format, scene breaks
  - \`timeline.md\` — date decisions, chronological ordering
  - \`emotional-register.md\` — tone, atmosphere, emotional range

### 3. Per-Chapter Processing

For each chapter in the batch, run three distinct editing passes:

#### Pass 1: Line Edit (sentence craft)

Focus ONLY on sentence-level craft: word choice, rhythm, clarity, concision, figurative language effectiveness, sentence variety. This pass does NOT fix grammar — it improves artistry.

**Linguistic quality analyses (HARD BLOCK):**

Run the following analyses before generating line-edit suggestions:

1. **Subtext loading assessment** — flag on-the-nose dialogue where characters state exactly what they mean. >40% on-the-nose = warning.
2. **Purple prose detection** — flag excessive modifiers (>15%), metaphor density (>3 per 500 words), elevated vocabulary. Warning level.
3. **Cliché detection** — scan for known clichéd phrases (>5 per chapter = block) and genre-trope overuse (>3 same trope = warn).
4. **Sentence rhythm analysis** — track sentence length distribution. >60% in same range = warning. 5+ consecutive similar-length sentences = warning.
5. **AI-slop detection (HARD BLOCK)** — scan for signature AI writing patterns. Any instance of "smell/taste of ozone" without an electrical event = immediate block. Also flag: "copper taste of blood," "air crackled with tension," "shiver ran down spine," "eyes like [gemstone]," "[animal] smile," "Not [X]. Not the way [Y] expected," "It wasn't just [X]. It was [Y]," "Something shifted in [their] expression," "The weight of [abstract] hung in the air," "They didn't say anything. They didn't have to," adverbial dialogue tags ("said angrily"). >3 slop patterns per chapter = block.

**If any blocking analysis fails: STOP.** Report the specific issue. Do not proceed to suggestions until corrected.

After analyses pass, generate line-edit suggestions:

\`\`\`
## Line Edit Suggestion [N] — Chapter [M]

**Current**: [Exact text as it appears]
**Suggest**: [Exact replacement text]
**Reason**: [Why this change improves the prose]
**Category**: [Clarity | Rhythm | Word Choice | Register | Filtering | Showing | Subtext | Purple Prose | Cliché | AI-SLOP]
**Status**: [Pending]
\`\`\`

**What to check (priority order):**
1. Clarity — comprehension issues
2. Rhythm — sentence length variation
3. Word choice — precision, weak verbs, clichés
4. Register — constitution style principles and character voices
5. Punctuation — effect and rhythm
6. Filtering — unnecessary perceptual filters
7. Telling vs. showing — observation only (restructuring is for revise phase)
8. Subtext — on-the-nose dialogue flagged for subtextual rewrite
9. Non-fiction — citation support, source format

#### Pass 2: Copy Edit (mechanics)

Focus ONLY on grammar, punctuation, hyphenation, capitalization consistency, number style, abbreviation usage, dialogue punctuation correctness. A mechanical pass with no creative judgment.

**Check:**
1. Grammar — subject-verb agreement, tense consistency, pronoun-antecedent agreement
2. Punctuation — comma splices, semicolon usage, em-dash vs en-dash, ellipsis usage
3. Dialogue punctuation — tag placement, quotation mark consistency, interior monologue formatting
4. Capitalization — proper nouns, titles, sections, headings
5. Hyphenation — compound modifiers, prefixes, suffixes
6. Numbers — spelled out vs numeric per style sheet
7. Abbreviations — consistency, period usage
8. Non-fiction — citation format per style sheet (APA, Chicago, MLA, IEEE)

**Copy edit suggestions use the same format but category is always [Mechanics].**

#### Pass 3: Proofread (typos)

Focus ONLY on typo detection, orphan words, consistent spacing, formatting glitches. The last line of defense.

**Check:**
1. Typos — misspelled words, transposed letters, autocorrect errors
2. Orphan/widow lines — single words on their own line
3. Spacing — double spaces, missing spaces, inconsistent paragraph breaks
4. Formatting — scene break markers consistent, chapter numbering correct
5. Consistency — names, places, terms spelled consistently across the chapter

**Proofread findings use the same format but category is always [Typo/Format].**

#### c) Present to User (batch summary)

For batch mode, present a consolidated summary of all suggestions across all chapters:

\`\`\`markdown
## Edit Suggestions: Batch Chapters [start]–[end]

### Chapter 3: [N] suggestions
- [Clarity] #1: "..." → "..." — Approve / Skip / Discuss
- [Polish] #2: "..." → "..." — Approve / Skip / Discuss
...

### Chapter 4: [M] suggestions
- [Voice] #1: "..." → "..." — Approve / Skip / Discuss
...
\`\`\`

The user can approve all, skip all, or go chapter by chapter. For efficiency, offer:
- "Approve all Clarity and Error suggestions across all chapters" (these are objective improvements)
- "Review each suggestion individually" (slower but more control)

#### d) Apply Approved Edits

Apply all approved edits to chapter files. Update task status to \`[ED]\` (Edited).

### 4. Batch Report

\`\`\`markdown
## Batch Edit Report

**Scope**: Chapters [start]–[end] ([N] chapters)
**Style sheet**: All chapters passed enforcement (or: [N] violations auto-fixed)

| Chapter | Suggestions | Approved | Skipped | Applied |
|---------|-------------|----------|---------|---------|
| 3 | 12 | 8 | 4 | 8 |
| 4 | 9 | 6 | 3 | 6 |
| 5 | 15 | 10 | 5 | 10 |

**Remaining**: [K] chapters with status [R]. Run \`/kombinat edit\` again for the next batch.
\`\`\`

### 5. Next Steps

"Batch edit complete. [N] chapters edited. Continue to broad review: \`/kombinat review\`, or \`/kombinat edit\` for the next batch."

### 6. Human-in-the-Loop Features

The edit phase integrates these HITL features:

**Phase Preview** (\`src/lib/phase-preview.ts\`): Before editing, show the author which chapters, which gates will run (subtext, purple-prose, cliché, rhythm), estimated duration. Author confirms.

**Authorial Intent** (\`src/lib/authorial-intent.ts\`): Capture the author's editing intent. Generic fallback: "Apply three-pass editing (line-edit, copy-edit, proofread) consistent with the constitution and style sheet."

**Diff-Based Approval** (\`src/lib/diff-approval.ts\`): After each pass (line-edit, copy-edit, proofread), show the author a structured diff. The author approves line-by-line or accepts all. Especially important for line-edit where creative changes are made.

**Suggestion Severity Tiers** (\`src/lib/severity-tiers.ts\`): Edit suggestions are tiered: must-fix (gate failure), should-consider (warning), your-call (preference), FYI (observation). Author controls the filter level.

**Veto System** (\`src/lib/veto-system.ts\`): The author can veto any edit suggestion with \`|\. Silent veto (just \`|\`) or veto with reason (\`| I'm keeping this rhythm for effect\`). Vetoes with reasons feed into feedback memory to prevent re-suggestion.

**Feedback Memory** (\`src/lib/feedback-memory.ts\`): Rejection reasons are logged as avoidance patterns. The AI checks preferences before making future suggestions.

**Non-Negotiables Gate** (\`src/lib/creative-constraints.ts\`): Edited content is checked against creative constraints.

**Provenance Tracking** (\`src/lib/provenance.ts\`): Edited lines tagged as 'ai-edited' (approved as-is) or 'ai-modified' (author changed before acceptance).

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`punctuation-emotional-effect\` | \`skills/fiction/writing-techniques/punctuation-emotional-effect/SKILL.md\` | Punctuation for rhythm and emphasis |
| \`style-enforcer\` | \`skills/quality-assurance/style-enforcer/SKILL.md\` | Style consistency checking |
| \`consistency-checker\` | \`skills/quality-assurance/consistency-checker/SKILL.md\` | Cross-reference consistency |
| \`academic-writing\` | \`skills/non-fiction/academic-writing/SKILL.md\` | Academic register (non-fiction) |
| \`subtext-analysis\` | \`src/lib/subtext-analysis.ts\` | On-the-nose dialogue detection |
| \`purple-prose\` | \`src/lib/purple-prose.ts\` | Overwriting detection |
| \`cliche-detection\` | \`src/lib/cliche-detection.ts\` | Cliché and trope overuse |
| \`sentence-rhythm\` | \`src/lib/sentence-rhythm.ts\` | Sentence length variety |
| \`phase-preview\` | \`src/lib/phase-preview.ts\` | Pre-execution confirmation |
| \`authorial-intent\` | \`src/lib/authorial-intent.ts\` | Intent capture before editing |
| \`diff-approval\` | \`src/lib/diff-approval.ts\` | Diff-based approval gates |
| \`severity-tiers\` | \`src/lib/severity-tiers.ts\` | Suggestion severity tiers |
| \`veto-system\` | \`src/lib/veto-system.ts\` | Veto with \`|\` key |
| \`feedback-memory\` | \`src/lib/feedback-memory.ts\` | Rejection reason memory |
| \`creative-constraints\` | \`src/lib/creative-constraints.ts\` | Non-negotiables gate |
| \`provenance\` | \`src/lib/provenance.ts\` | Change provenance tracking |`,
  tools: ["loadSkill", "bash"],
  relatedSkills: ["punctuation-emotional-effect", "style-enforcer", "consistency-checker", "academic-writing", "phase-preview", "authorial-intent", "diff-approval", "severity-tiers", "veto-system", "feedback-memory", "creative-constraints", "provenance"],
  examples: [
    { input: "/kombinat edit", approach: "Edits all [R] chapters (up to 6) with style sheet enforcement" },
    { input: "/kombinat edit 3-8", approach: "Edits chapters 3 through 8" },
    { input: "/kombinat edit Chapter 3", approach: "Single-chapter override — edits only chapter 3" }
  ],
  warnings: ["Batch mode is the DEFAULT — single-chapter requires explicit chapter number", "Three-pass editing: line-edit (craft) → copy-edit (mechanics) → proofread (typos)", "Style sheet enforcement is a HARD BLOCK — violations must be corrected before editing proceeds", "Linguistic analyses (subtext, purple prose, cliché, rhythm) run as hard-block gates before line-edit suggestions", "Style sheet and shared context are loaded ONCE for the entire batch"]
}

export default spec