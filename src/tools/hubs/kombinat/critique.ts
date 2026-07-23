import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "critique",
  description: "Batch critique by default: critique all chapters with status [FR] or up to 6 at a time. Specificity gate rejects vague feedback. Single-chapter is explicit override. Modes: alpha, beta, peer, sensitivity, comprehensive.",
  reminder: "Phase 8: Batch structured external feedback with specificity verification",
  phases: "8",
  detailedDescription: `# User Input: {userInput}

## Objective

Simulate structured external feedback on chapters. **Batch mode is the default** — critique all chapters with status \`[FR]\` (For Review), or up to 6 at a time. Critique is distinct from self-editing — it evaluates the work as a reader or peer. Every critique item must pass a specificity gate: vague feedback is rejected.

## Batch vs Single Mode

| Mode | Trigger | Behaviour |
|------|---------|-----------|
| Batch (DEFAULT) | \`/kombinat critique\` or \`/kombinat critique alpha\` | Critique all [FR] chapters (up to 6) with selected mode |
| Range | \`/kombinat critique 3-8\` or \`/kombinat critique alpha 3-8\` | Critique chapters 3-8 |
| Single | \`/kombinat critique Chapter 3\` | Critique one chapter only (explicit override) |
| All | \`/kombinat critique comprehensive all\` | Critique all chapters regardless of batch limit |

**Batch sizing:** When no range specified, read \`./book/tasks.md\` and collect all tasks with status \`[FR]\` (For Review). Up to 6 per batch. If more than 6, critique the first 6 and report: "6 of [N] chapters critiqued. Run \`/kombinat critique\` again for the next batch."

## Critique Modes

| Mode | Perspective | Evaluates | Best For |
|------|-------------|-----------|----------|
| \`alpha\` | Structural reader | Pacing, plot logic, character arcs, scene necessity, argument flow | Early drafts, structural issues |
| \`beta\` | Experience reader | Engagement, confusion, investment, emotional response, clarity | Near-complete drafts |
| \`peer\` | Field peer | Domain accuracy, methodology, argument soundness, citation adequacy | Non-fiction, academic |
| \`sensitivity\` | Authenticity reader | Representation, stereotypes, authenticity, cultural accuracy | Works with marginalised perspectives |
| \`comprehensive\` | All perspectives | Combined alpha + beta + sensitivity + peer | Final pre-edit pass |
| \`cold-read\` | Zero-context reader | Simulates a reader encountering the text with NO prior context — flags passages that rely on information the reader doesn't have | Catching author-knowledge blind spots |
| \`adversarial\` | Two-agent dialectic | One agent argues for strengths, one argues against, third synthesizes — surfaces blind spots single-pass critique misses | Stress-testing before revision |
| \`personas\` | Multi-perspective beta |
| \`swarm\` | Multi-Agent Pipeline | Parallel dispatch of 4 subagents (Structure, Prose, Continuity, Hooks) for deep analysis | High-value chapters, major revisions | 3-5 reader personas (Genre Fan, Casual Reader, Literary Critic, Subject Expert, Skeptical Reviewer) react with focused responses | Diverse reader reception |

**Auto-selection** (when mode not specified):
- All chapters in batch are early drafts (< 3 chapters exist) → alpha
- Chapters 3-7 → beta
- Chapters > 7 or final → comprehensive
- Non-fiction track → peer
- If user doesn't specify, ask via question tool with auto-selection as recommended

**Cold-read mode is special:** It deliberately does NOT load the constitution, specification, knowledge files, or outline. The agent reads each chapter as a reader would — with zero context. This catches the most common AI-writing blind spot: passages that make sense to the author (who has full context) but confuse the reader (who doesn't).

## Prerequisites

- Drafted chapters must exist in \`./book/content/\`
- Tasks marked \`[FR]\` (For Review) or complete

## Execution Steps

### 1. Resolve Scope and Mode

Parse \`{userInput}\`:
- \`/kombinat critique\` → all [FR] chapters (up to 6), auto-select mode
- \`/kombinat critique alpha\` → all [FR] chapters (up to 6) with alpha mode
- \`/kombinat critique beta 3-8\` → chapters 3-8 with beta mode
- \`/kombinat critique Chapter 3\` → single chapter, auto-select mode
- \`/kombinat critique comprehensive all\` → all chapters with comprehensive mode

### 2. Load Context (once per batch)

Load the shared context ONCE for the entire batch:
- Constitution, specification/outline, knowledge, tracking
- All chapters in the batch (read all at once — context window can handle it)
- XML versions from \`./book/drafts/\` if available (metadata + tracking updates useful for critique)
- **Relevant lore context**: Run the lore query script to retrieve only the lore most relevant to the chapters being critiqued:
  \`\`\`bash
  bun .opencode/tools/lib/scripts/lore-query.mjs --query "Critique context: characters, world rules, and terminology for chapters [range] of [book title]" --top 5 --rerank
  \`\`\`
  The script uses local Ollama models (pedrohml/mxbai-embed-large + hans-tech/bge-reranker-v2-m3) to find the most relevant lore. If unavailable, read \`./series/lorebook/\` and \`./book/knowledge/\* manually.

### 3. Generate Critique (with Specificity Gate)

For each chapter in the batch, produce structured feedback. **Every critique item must pass the specificity gate.**

\`\`\`markdown
## Chapter [N]: [Title]

### [Category]: [Issue summary]
- **ID**: [Unique ID, e.g., C1-A-001] (C = critique round, A = alpha mode, 001 = sequential)
- **Severity**: Critical / Major / Minor / Observation
- **Location**: [Specific paragraph number, scene number, or quoted text — NOT "early in the chapter"]
- **Effect**: [What this does to the reader experience — concrete, not abstract]
- **Recommendation**: [Specific suggested change — actionable, not "this needs work"]
- **Evidence**: [Quote the exact text that triggered this critique item]
\`\`\`

**Specificity Gate (HARD BLOCK on vague items):**

| Criterion | Pass | Fail (reject item) |
|-----------|------|--------------------|
| Location | Paragraph number, scene number, or exact quote | "somewhere in the chapter", "early on", "the opening" |
| Effect | Concrete reader experience: "reader loses tension because X" | "feels off", "doesn't work", "weak" |
| Recommendation | Specific change: "Cut paragraph 4 and merge key detail into paragraph 3" | "needs improvement", "could be stronger", "tighten this up" |
| Evidence | Exact quote from the text | No quote provided |

**If an item fails the specificity gate, reject it and do not include it in the output.**

### 3b. Anti-AI-Slop Mandate (ALL MODES)

Every critique, regardless of mode, must check for common AI-generated writing slop. These are recurring patterns that signal lazy or formulaic prose — the LLM defaulting to stock sensory clichés, repetitive sentence architecture, and hollow emotional beats. The critic flags every instance found.

**Tier 1: Sensory clichés (HARD BLOCK — must-fix)**

The most emblematic indicator of AI slop is the **smell or taste of ozone**. This single trope — describing ozone when no electrical event justifies it — is the signature tell of AI-generated prose. Flag it every time. The same applies to:

| Pattern | Why it's slop | Fix |
||---------|--------------|-----|
| "smell/taste of ozone" | No electrical event present; LLM default for "tension" | Replace with a specific, earned sensory detail |
| "copper taste of blood" | Default blood-in-mouth descriptor; overused to the point of cliché | Use a fresh descriptor or cut if not needed |
| "the air crackled with tension" | Abstract tension made physical without earning it | Show tension through action, not atmospheric metaphor |
| "a shiver ran down [their] spine" | Stock physiological response; LLM default for fear/surprise | Find a body-specific or situation-specific reaction |
| "eyes like [gemstone]" | Generic eye-description formula (emeralds, sapphires, obsidian) | Describe what the eyes *do*, not what they resemble |
| "lips curled into a [creature] smile" (wolf, snake, etc.) | Animal-metaphor smile; LLM shorthand for "menacing" | Show the menace through action or dialogue |

**Tier 2: Structural tells (should-consider)**

| Pattern | Why it's slop | Fix |
|---------|--------------|-----|
| "Not [X]. Not [X] the way [Y] expected." | Fragment-emphasis pattern overused by LLMs for dramatic effect | Vary the emphasis technique; use sparingly if at all |
| Three consecutive sentences starting with the same word | Anaphora the LLM uses as a rhythm crutch | Vary sentence openings |
| "It wasn't just [X]. It was [Y]." | Binary-escalation construction the LLM defaults to for emphasis | Find a different emphasis structure |
| Every paragraph ends with a one-sentence punch line | LLM "periodic sentence" habit for faux-dramatic closers | Let some paragraphs end quietly |
| Dialogue tag + adverb ("said angrily", "whispered softly") | Adverbial dialogue tags are a beginner tell; LLMs overuse them | Use action beats or subtext instead |

**Tier 3: Hollow emotional beats (your-call)**

| Pattern | Why it's slop | Fix |
|---------|--------------|-----|
| "Something shifted in [their] expression" | Vague emotional change the LLM uses when it can't specify the emotion | Name the specific micro-expression or cut the beat |
| "The weight of [abstract noun] hung in the air" | Weight-of-abstract-noun is the LLM's default for atmosphere | Show the atmosphere through concrete detail |
| "[Character] didn't say anything. They didn't have to." | LLM shorthand for mutual understanding; profoundly overused | Show the understanding through action or cut the line |

**Reporting:** Anti-slop items use severity tiers — Tier 1 = must-fix, Tier 2 = should-consider, Tier 3 = your-call. They appear in the critique output with the \`AI-SLOP\` category prefix:

\`\`\`markdown
### AI-SLOP: Ozone smell without electrical event
- **ID**: C1-A-SLOP-001
- **Severity**: Critical (must-fix)
- **Location**: Paragraph 7, "The ozone tang of impending violence..."
- **Effect**: Signals AI-generated prose to any reader familiar with the pattern; breaks immersion
- **Recommendation**: Replace with a specific sensory detail earned by the scene context (e.g., the metallic taste of adrenaline, the dry-mouth feel of fear)
- **Evidence**: "The ozone tang of impending violence hung between them."
\`\`\`

### 4. Categories by Mode

| Mode | Categories |
|------|------------|
| Alpha | Structure, Pacing, Plot Logic, Character Arc, Scene Necessity, Argument Flow (non-fiction) |
| Beta | Engagement, Confusion, Investment, Emotional Response, Clarity, Pacing Experience |
| Peer | Accuracy, Methodology, Evidence Adequacy, Argument Soundness, Citation Correctness |
| Sensitivity | Representation, Stereotype Risk, Authenticity, Cultural Accuracy, Language |
| Cold-read | Confusion, Missing Context, Unexplained References, Assuming Knowledge, Lost Threads |
| Adversarial | Strengths (defender), Weaknesses (challenger), Synthesis — all categories covered from opposing perspectives |
| Personas | Genre Fan: trope handling, pacing, satisfaction. Casual Reader: engagement, confusion, boredom. Literary Critic: prose craft, theme, structure. Subject Expert: accuracy, authenticity. Skeptical Reviewer: plot holes, convenience, logic |

### 4b. Adversarial Mode Execution

When mode is \`adversarial\`, run a two-agent dialectic:

1. **Defender agent**: Argues for the strengths of each chapter. Identifies what works, why it works, and what should be preserved. No criticism allowed — only defense.
2. **Challenger agent**: Argues against the current approach. Identifies what fails, why it fails, and what should change. No praise allowed — only critique.
3. **Synthesis agent**: Reads both perspectives and produces a unified critique that reconciles disagreements. Explicitly calls out where defender and challenger agree (high confidence) vs. disagree (author must decide).

This surfaces blind spots that single-pass critique misses. The defender prevents over-cutting; the challenger prevents complacency.

### 4c. Personas Mode Execution

When mode is \`personas\`, simulate 3-5 reader personas reacting to each chapter:

| Persona | What they evaluate | Key question |
|---------|-------------------|--------------|
| **Genre Fan** | Trope handling, pacing, satisfaction, genre promises | "Does this deliver what I came for?" |
| **Casual Reader** | Engagement, confusion, boredom points, page-turner quality | "Do I want to keep reading?" |
| **Literary Critic** | Prose craft, theme, structure, subtext, language quality | "Is this well-crafted?" |
| **Subject Expert** | Accuracy, authenticity, worldbuilding consistency (fiction) / factual accuracy (non-fiction) | "Does this get the details right?" |
| **Skeptical Reviewer** | Plot holes, convenience, logic, character motivation, trust | "Why should I believe this?" |

Each persona produces focused feedback from their lens. The consolidated report shows where personas agree (likely real issues) vs. where they disagree (matter of taste).

### 4d. Swarm Mode Execution

When mode is \`swarm\`, execute the **Three-Phase Multi-Agent Swarm** pattern:
1. **Parallel Dispatch**: Use the \`task\` tool to launch four subagents concurrently:
   - \`@deep-thinker\` loaded with \`developmental-editor\` (Structural Analyst)
   - \`@code-reviewer\` loaded with \`line-editor\` (Prose Reviewer)
   - \`@refactoring\` loaded with \`continuity-auditor\` (Continuity Auditor)
   - \`@deep-thinker\` loaded with \`hook-and-transition-analyst\` (Momentum Analyst)
2. **Consolidation**: Reconcile their reports, removing duplicates and formatting into the master Priority Matrix.
3. **Verification**: Confirm no hallucinations or violations of project metadata before saving.

### 5. Build Priority Matrix (per chapter, then consolidated)

After all chapter critiques in the batch, produce a consolidated priority matrix:

| ID | Priority | Chapter | Category | Issue | Recommendation |
|----|----------|---------|----------|-------|----------------|
| C1-A-001 | Critical | 3 | Structure | Scene 2 has no conflict | Add opposition force to scene 2 |

### 6. Save Critique

Save to \`./book/critique/round-N/\` where N increments. Include:
- \`summary.md\` — consolidated priority matrix with all items across all chapters in batch
- \`chapter-M.md\` — per-chapter critique for each chapter in batch
- \`rejected-items.md\` — items that failed the specificity gate (for transparency)

### 7. Numeric Score (REQUIRED)

Every critique round produces a **numeric score** (0-100) per chapter and a batch-level score. The score is not a vibe — it is computed deterministically from the issues found and the rubric below.

#### Per-chapter score formula

Score formula: start at 100, subtract 8 per critical issue, 3 per major, 1 per minor, 0.2 per observation.

\`unsuppressed\` means the issue is still in the chapter. If the author has already fixed something, the score improves. The critique reports the score as found, before revision.

#### Batch score

\`\`\`
batch_score = arithmetic_mean(chapter_scores)
\`\`\`

#### Score tiers

| Score | Tier | Meaning |
|-------|------|---------|
| 95-100 | Excellent | Ready to revise (or publish) |
| 85-94 | Good | Revisable with focused work |
| 70-84 | Needs work | Significant revision required |
| < 70 | Blocked | Structural problems — reconsider the chapter |

**The revise phase will refuse to mark a batch complete if batch_score < 95.** This forces revision to actually fix the issues, not just acknowledge them.

### 7b. Score in Batch Report

The batch report must include the score:

\`\`\`markdown
## Batch Critique Report

**Mode**: [alpha/beta/peer/sensitivity/comprehensive]
**Scope**: Chapters [start]–[end] ([N] of [M] requested)
**Specificity gate**: [N] items generated, [M] passed, [K] rejected for vagueness

| Chapter | Critical | Major | Minor | Score | Tier |
|---------|----------|-------|-------|-------|------|
| 3 | 1 | 3 | 2 | 78 | Needs work |
| 4 | 0 | 2 | 4 | 87 | Good |
| 5 | 2 | 1 | 3 | 76 | Needs work |

**Batch score**: 80.3 / 100
**Verdict**: Below 95 — revise phase must run before user is informed.
\`\`\`

### 8. Next Steps (Auto-Handoff)

After saving the critique round, offer to automatically continue. Use the \`question\` tool:

Question: "Critique round [N] saved with [M] actionable items. Continue?"
Options:
- **Yes — Revise** → Run \`/kombinat revise\` (call hubMenu route for \`revise\`)
- **Yes — Critique next batch** → Run \`/kombinat critique\` again (call hubMenu route for \`critique\`)
- **No — I'll review the items first** → Stop

If the user selects, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately.

### 9. Human-in-the-Loop Features

The critique phase integrates these HITL features:

**Phase Preview** (\`src/lib/phase-preview.ts\`): Before critiquing, show the author which chapters, which mode, estimated duration. Author confirms.

**Suggestion Severity Tiers** (\`src/lib/severity-tiers.ts\`): All critique items are classified into tiers: must-fix (blocks — maps to Critical severity), should-consider (warning — maps to Major), your-call (preference — maps to Minor), FYI (observation — maps to Cosmetic). The author controls the filter level — only must-fix shown by default.

**Veto System** (\`src/lib/veto-system.ts\`): The author can veto any critique suggestion with \`|\`. Silent veto (\`|\`) or veto with reason (\`| This scene is intentionally slow\`). Vetoes with reasons feed into feedback memory. Vetoed suggestions are never re-suggested.

**Feedback Memory** (\`src/lib/feedback-memory.ts\`): When the author vetoes with a reason, the reason is logged as an avoidance pattern. The AI checks preferences before making future critique suggestions in subsequent rounds.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`alpha-reader\` | \`skills/critique/alpha-reader/SKILL.md\` | Structural critique methodology |
| \`beta-reader\` | \`skills/critique/beta-reader/SKILL.md\` | Experience critique methodology |
| \`peer-review\` | \`skills/critique/peer-review/SKILL.md\` | Peer review methodology (non-fiction) |
| \`sensitivity-reader\` | \`skills/critique/sensitivity-reader/SKILL.md\` | Sensitivity assessment methodology |
| \`phase-preview\` | \`src/lib/phase-preview.ts\` | Pre-execution confirmation |
| \`severity-tiers\` | \`src/lib/severity-tiers.ts\` | Suggestion severity tiers |
| \`veto-system\` | \`src/lib/veto-system.ts\` | Veto with \`|\` key |
| \`feedback-memory\` | \`src/lib/feedback-memory.ts\` | Rejection reason memory |`,
  tools: ["loadSkill", "bash", "task"],
  relatedSkills: ["alpha-reader", "beta-reader", "peer-review", "sensitivity-reader", "phase-preview", "severity-tiers", "veto-system", "feedback-memory"],
  examples: [
    { input: "/kombinat critique", approach: "Critiques all [FR] chapters (up to 6) with auto-selected mode" },
    { input: "/kombinat critique alpha 3-8", approach: "Critiques chapters 3-8 with alpha mode" },
    { input: "/kombinat critique Chapter 3", approach: "Single-chapter override — critiques only chapter 3" }
  ],
  warnings: ["Batch mode is the DEFAULT — single-chapter requires explicit chapter number", "Specificity gate is a HARD BLOCK — vague critique items are rejected", "Every item must include an ID for cross-referencing during revision verification", "Context is loaded ONCE for the entire batch — shared context is not re-loaded per chapter"]
}

export default spec