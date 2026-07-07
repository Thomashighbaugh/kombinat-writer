import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "outline",
  description: "Build a fine-grained chapter outline with scene beats, setup/payoff chains, and continuity anchors. Quality gate + revision cycle blocks until the outline is dense enough to prevent drafting continuity errors.",
  reminder: "Phase 5: Fine-grained chapter structure with quality gate and revision cycle",
  phases: "5",
  detailedDescription: `# User Input: {userInput}

## Objective

Produce a **fine-grained** outline that gives the drafting phase enough scaffolding to maintain continuity without holding the entire book in active memory. Each chapter entry specifies scene-level beats, what it carries forward from earlier chapters, what it sets up for later chapters, and continuity anchors (characters present, timeline position, open threads).

A gate checks the outline is dense enough. If it fails, the outline is revised and re-gated, up to 3 cycles. The draft phase will not proceed until the outline gate passes.

## Why Fine-Grained?

A coarse outline ("Chapter 5: They argue and reconcile") forces the LLM to improvise details during drafting — and those improvisations contradict other chapters. A fine-grained outline pre-declares the moving parts so the drafting LLM only needs to load the relevant slice (this chapter's entry plus its setup/payoff references), not the whole book.

## Track Adaptations

| Aspect | Fiction | Non-fiction | Mixed |
|--------|---------|-------------|-------|
| Structural unit | Chapter, scene, saga, arc | Section, chapter, part | Both, with cross-reference markers |
| Core drivers | Plot, character arc, pacing | Argument, evidence, thesis progression | Narrative + argument |
| Pacing elements | Tension, foreshadowing, release | Complexity, scaffolding, synthesis | Both balanced |
| Scene beats | Scene goal + conflict per scene | Section claim + evidence per section | Both |
| Setup/payoff | Foreshadowing → payoff chains | Prerequisite → synthesis chains | Both |
| Tracking init | Character state, plot, timeline | Source index, argument status | Both |
| Output | \`outline.md\` with per-chapter scene beats and anchor map | \`outline.md\` with per-section claim/evidence beats | \`outline.md\` with dual hierarchy |

## Prerequisites

- Fiction: \`./book/specification.md\` must exist
- Non-fiction: \`./book/research/\` should have source notes
- \`./book/constitution.md\` must exist (for pacing strategy reference)

## Execution Steps

### 1. Load Source Documents

Read the constitution, specification (fiction) or research notes (non-fiction), and any existing knowledge files. Note the constitution's pacing strategy — the outline's pacing distribution will be checked against it.

### 2. Determine Structure

Interview the user to establish the high-level structure:

**Fiction:**
- Number of major arcs or sagas
- Estimated chapter count per arc
- Pacing strategy (from constitution)
- Key plot turns, midpoint, climax positioning
- Character arc milestones per act

**Non-fiction:**
- Number of parts or sections
- Estimated chapter count per section
- Thesis progression: what each chapter proves or establishes
- Evidence density per chapter
- Synthesis and conclusion placement

**Mixed:**
- Narrative arc with embedded expository chapters
- Where citations appear and at what density
- How narrative and argument support each other

### 3. Build Fine-Grained Chapter Map

For each chapter/section, produce an entry with ALL of the following fields. This is the required format — the quality gate checks for each field.

#### Required Per-Chapter Format

\`\`\`markdown
## Chapter N: [Working Title]

**Pacing:** [Action | Rising | Calm | Climax | Resolution]
**Timeline:** [Date/elapsed time in story]
**Characters Present:** [List of characters in this chapter]
**Open Threads:** [Plot threads carried into this chapter — e.g. "Treason investigation", "Elena's missing sister"]

### Scene Beats

- **Scene 1:** [One-line goal]. Conflict: [One-line conflict].
- **Scene 2:** [One-line goal]. Conflict: [One-line conflict].
- **Scene 3:** [One-line goal]. Conflict: [One-line conflict].

### Setup / Payoff

**Sets up:** [What this chapter sets up for later — e.g. "Ch7: reveal traitor", "Ch10: battle at the bridge"]
**Payoff from:** [What earlier setup this chapter pays off — e.g. "Ch2: planted dagger", "Ch4: overheard conversation"]

### Continuity Anchors

**Key objects:** [Objects that matter for continuity — e.g. "The sealed letter", "Vey's broken sword"]
**State changes:** [What changes in this chapter — e.g. "Kira discovers the map", "Jin is wounded"]
**Carry-forward:** [What must be remembered when drafting later chapters — e.g. "Kira now knows Jin is wounded — she will act protective in Ch6"]
\`\`\`

**Minimum 2 scenes per chapter.** Each scene must have a goal (what the scene accomplishes) and a conflict (what opposes it). Vague one-liners without goal/conflict fail the gate.

**Setup/payoff chains:** Every chapter except the first must declare at least one \`payoff-from\` reference pointing back to a chapter that set it up. Every chapter except the last must declare at least one \`sets-up\` reference pointing forward to a chapter that pays it off. The first chapter may have an empty payoff-from; the last may have an empty sets-up.

**Bidirectional check:** If Chapter 3 says "sets-up: Ch7: reveal traitor", then Chapter 7 must say "payoff-from: Ch3: reveal traitor". Mismatched pairs are a hard block — they indicate a broken setup chain.

**Continuity anchors** are what the draft phase loads as the "awareness map" for each chapter. They let the LLM know what came before and what comes after without rereading the whole book.

### 4. Pacing Distribution

Verify the pacing tag distribution matches the constitution's pacing strategy. For example, a Balanced (2:1) pacing should have roughly twice as many Rising/Action chapters as Calm/Resolution chapters.

A lopsided distribution (all Rising, no Calm; or all Calm, no Rising) is a hard block for books with 4+ chapters.

### 5. Outline Quality Gate (HARD BLOCK)

Run the outline gate. The gate checks:

| Check | Requirement | Block Level |
|-------|-------------|-------------|
| Scene beats | Min 2 scenes per chapter, each with goal + conflict | Hard |
| Setup declarations | Every non-final chapter has ≥1 \`sets-up\` | Hard |
| Payoff declarations | Every non-first chapter has ≥1 \`payoff-from\` | Hard |
| Setup/payoff bidirectional | Every sets-up has a matching payoff-from | Hard |
| Characters present | Declared per chapter | Hard |
| Timeline position | Declared per chapter | Hard |
| Pacing tag | Declared per chapter | Hard |
| Pacing distribution | Not lopsided (4+ chapters) | Hard |
| Open threads | Declared for middle chapters | Warning |

**If the gate fails, STOP. Report each blocking issue with the specific chapter and field. Do not proceed to task-manager.**

### 6. Revision Cycle (if gate fails)

If the gate fails:

1. **Report all blocking issues** — list each failed check with the chapter number and field
2. **Revise the outline** — address every blocking issue:
   - Add missing scene beats with goals and conflicts
   - Add missing setup/payoff declarations
   - Fix broken setup/payoff chains (ensure bidirectional references)
   - Add missing continuity anchors (characters, timeline, open threads)
   - Add missing pacing tags
   - Fix pacing distribution if lopsided
3. **Re-run the gate**
4. **Repeat up to 3 cycles.** If the gate still fails after 3 revision cycles, stop and report: "Outline gate failed after 3 revision cycles. Manual review needed — the outline has persistent structural gaps."

Do not proceed to Phase 6 until the outline gate passes.

### 7. Initialise Tracking

After the gate passes, create \`./book/tracking/\` files from templates:

- Fiction: \`character-state.json\`, \`plot-tracker.json\`, \`timeline.json\`, \`relationships.json\`, \`validation-rules.json\`
- Non-fiction: \`source-tracker.json\`, \`argument-progression.json\`
- Mixed: Both sets

### 8. Save Outline

Save to \`./book/outline.md\`. If exceeding ~500 lines, split to \`./book/outline/_main.md\` with per-arc/per-section shards. Each shard must contain complete chapter entries (not fragments) — the gate parses each shard independently.

### 9. Next Steps

"Outline saved and gate passed. Continue to Phase 6: \`/kombinat task-manager\`."

## Gate Evidence

The gate produces evidence, not just pass/fail. Each check reports what it found:

\`\`\`
✓ Chapter 1: 3 scenes with goals and conflicts
✓ Chapter 1: Sets up 2 future payoff(s)
✓ Chapter 1: Characters present declared
✗ Chapter 3: 1 scene beat(s) — minimum 2 required
✗ Chapter 5: No "sets-up" declarations — must set up at least one future payoff
✗ Chapter 5 ← Chapter 2: Payoff declared, but Chapter 2 does not declare "sets-up: Chapter 5". Broken payoff chain.
\`\`\`

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`scene-structure\` | \`skills/fiction/writing-techniques/scene-structure/SKILL.md\` | Scene framework per chapter (fiction) |
| \`pacing-rhythm\` | \`skills/fiction/writing-techniques/pacing-rhythm/SKILL.md\` | Pacing archetype enforcement |
| \`argument-structure\` | \`skills/non-fiction/argument-structure/SKILL.md\` | Argument flow and evidence placement |
| \`strategic-reversal\` | \`skills/fiction/writing-techniques/strategic-reversal/SKILL.md\` | Reversal setup planning (fiction) |`,
  tools: ["loadSkill", "bash"],
  relatedSkills: ["scene-structure", "pacing-rhythm", "argument-structure", "strategic-reversal"],
  examples: [
    { input: "/kombinat outline 3 acts, 12 chapters each", approach: "Builds a 36-chapter outline with scene beats, setup/payoff chains, and continuity anchors per chapter. Gate runs — if it fails, revises up to 3 cycles." },
    { input: "/kombinat outline", approach: "Interviews for structure (arcs, chapters, pacing), then builds fine-grained chapter map. Gate enforces scene beats, setup/payoff bidirectionality, and continuity anchors before proceeding." },
    { input: "/kombinat outline 8 chapters", approach: "Builds 8-chapter outline with scene beats and continuity anchors. Gate checks pacing distribution is not lopsided." }
  ],
  warnings: [
    "Outline gate is a HARD BLOCK — task-manager phase will not proceed until the gate passes",
    "Revision cycle runs up to 3 times — persistent failures require manual review",
    "Each chapter must declare scene beats, setup/payoff chains, and continuity anchors — coarse summaries fail the gate",
    "Setup/payoff chains must be bidirectional — Chapter A 'sets-up: ChB' requires Chapter B 'payoff-from: ChA'"
  ]
}

export default spec