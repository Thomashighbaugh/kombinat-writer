import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "constitute",
  description: "Define creative or intellectual principles — core values, quality baseline, style, content norms, reader contract, revision procedures",
  reminder: "Phase 1: Establish governing principles for the entire work",
  phases: "1",
  detailedDescription: `# User Input: {userInput}

## Objective

Establish the governing principles for the entire work. The constitution is the reference document against which every creative or intellectual decision is evaluated. Without it, the project lacks a decision-making framework for consistency.

## Track Adaptation

This command adapts its output based on the detected track:

| Section | Fiction | Non-fiction | Mixed |
|---------|---------|-------------|-------|
| Core Values | Theme, message, emotional intent | Thesis, purpose, argument | Both + integration principles |
| Quality Baseline | Prose standards, pacing preference | Rigour, evidence requirements, citation density | Both reconciled |
| Style Principles | Language register, atmosphere | Tone, accessibility, disciplinary conventions | Register map |
| Content Principles | Character, plot, worldbuilding | Structure, argument flow, evidence | Genre + evidence balance |
| Reader Contract | Genre expectations, content warnings | Audience level, assumed knowledge | Audience segments |
| Revision Procedures | How creative revisions are decided | How factual corrections are handled | Dual-track revision policy |

## Execution Steps

### 0. Premise / Lorebook Import (FIRST QUESTION)

Before anything else, ask the user whether they have a premise document or an external lorebook to import. Use the \`question\` tool:

Question 1: "Do you have a premise, outline, or world-building document you'd like to import?"
Options:
- **Yes — Lorebook** (SillyTavern, JanitorAI, CharacterAI export) — "I have a world info / character card JSON from an AI roleplay platform"
- **Yes — Premise document** (Markdown, text, or other) — "I have a written premise, synopsis, or outline document"
- **No** — "Start from scratch"

#### If "Yes — Lorebook":
1. Ask the user for the file path (use the \`question\` tool with a text prompt).
2. Call \`src/lib/lorebook-import.ts\` → \`importLorebook(projectRoot, 'auto', inputPath)\` to convert the lorebook into \`./series/lorebook/\` (characters.md, world.md, glossary.md, timeline.json, threads.md).
3. Report the import result: "[N] characters, [M] world entries, [K] glossary terms, [L] timeline entries, [P] plot threads imported."
4. These become the pre-existing world context. Mark the constitution sections that can inherit from the lorebook and continue to the interview, pre-filling where the lorebook answers the question.
5. Also create \`./series/meta.json\` if it doesn't exist, marking this as a series project with \`seriesId\` generated from the book title or a user-provided series name.

#### If "Yes — Premise document":
1. Ask the user for the file path (use the \`question\` tool with a text prompt).
2. Read the document and extract: themes, character information, world-building details, style hints, and any stated quality preferences.
3. Use these as pre-filled answers in the interview below, marked \`[From premise document — review and adapt]\`.
4. Continue to the interview, skipping questions where the premise document already provides a clear answer.

#### If "No":
Continue directly to step 1.

### 1. Check Existing Documents

- Check \`./book/constitution.md\`. If it exists, read it and present a diff-based update option.
- Check \`./book/track.json\` for track selection.
- Check \`./book/track.json\` for \`seriesId\` and \`bookNumber\` fields. If present, this book is part of a series.
- Check \`./series/meta.json\` — if it exists, this is a series project.
- Check \`./series/lorebook/\` — if it exists (from step 0 import), load the lorebook files for context.
- Check \`./imported-lorebook.json\` AND \`./imported-lorebook-*.json\` — if any exist, these were copied during install. Auto-select the "Yes — Lorebook" option from step 0 and process them immediately (don't ask, just do it). Import ALL matching files.
- Check \`./premise.md\` AND \`./premise-*.md\` — if any exist, these were copied during install. Auto-select the "Yes — Premise document" option from step 0 and process them immediately (don't ask, just do it). Read ALL matching files.

### 1a. Series Lorebook Inheritance (Book 2+)

If this book is part of a series (seriesId exists in track.json) AND bookNumber > 1:

1. Load \`./series/lorebook/characters.md\` — cross-book character profiles
2. Load \`./series/lorebook/world.md\` — world-setting, geography, history
3. Load \`./series/lorebook/glossary.md\` — series glossary
4. Load \`./series/lorebook/timeline.json\` — series-level timeline
5. Load \`./series/lorebook/threads.md\` — cross-book plot threads
6. Load \`./series/meta.json\` — series metadata (title, author, book list)

Present the series context and ask:
"This is book [bookNumber] in the '[series title]' series. The series lorebook contains:
- [N] character profiles
- [M] world sections
- [K] glossary terms
- [L] timeline entries
- [P] plot threads ([Q] active)

Would you like to:
A. **Inherit from series lorebook** (Recommended) — Pre-populate the constitution with series-level principles, character voice decisions, world rules, and style continuity from the series lorebook. You'll review and adapt.
B. **Start fresh** — Begin with a blank constitution. The series lorebook will still be available as reference during drafting, but the constitution won't inherit any decisions."

If the user chooses A (inherit):
- Pre-fill Core Values with the series' thematic throughline (from series meta)
- Pre-fill Style Principles with the style sheet decisions from the previous book (\`./book/style-sheet/\` if it exists, or extracted from the series lorebook)
- Pre-fill Content Principles with character depth and worldbuilding decisions from the series lorebook
- Pre-fill Reader Contract with genre expectations from the series
- Mark all pre-filled sections with \`[Inherited from series lorebook — review and adapt]\`
- Continue to the interview, but skip questions where the answer is already inherited

### 2. Gather Principles

Interview the user to fill each constitution section. Use the \`question\` tool for all interview questions — this renders interactive prompts in the TUI. Ask questions one at a time or in small batches. Targeted questions:

**Core Values:**
- Fiction: "What central theme or emotional experience do you want the reader to carry away?"
- Non-fiction: "What is the central thesis or argument? What gap does this work fill?"
- Mixed: "How do the creative and expository dimensions relate to each other?"

**Thematic Statement (REQUIRED — HARD BLOCK):**
- Fiction: A single sentence expressing the book's thematic argument (not just a topic). E.g., "Justice requires mercy, but mercy enables injustice." This is testable — every scene can be evaluated against it.
- Non-fiction: The thesis stated as a debatable proposition. E.g., "Decentralised systems outperform centralised ones at scale, but only when trust costs are low."
- The thematic statement is NOT "this book is about X" — it's "this book argues X."
- If the user gives a topic ("redemption") rather than a statement, ask: "What does the book SAY about redemption? Is redemption always possible? Always desirable? At what cost?"
- **If no thematic statement can be crystallized, block with: "A thematic statement is required — the outline and critique phases reference it. What does the book ARGUE?"**

**Quality Baseline:**
- Fiction: "What are your non-negotiables for prose quality? Pacing preference? (Relentless Action / Balanced / Literary Slow-Burn / Rollercoaster / Custom)"
- Non-fiction: "What rigour standards apply? What citation density is appropriate for your field?"

**Style Principles:**
- Ask about language register (conversational, formal, lyrical, technical, etc.)
- Ask about sentence-level preferences (short declarative, complex periodic, varied)
- Fiction only: ask about atmospheric qualities (grim, hopeful, clinical, lush)

**Content Principles:**
- Fiction: character depth approach (Surface / Standard / Deep), worldbuilding kombinate, plot complexity
- Non-fiction: argument structure (deductive, inductive, dialectic), chapter typology, evidence presentation

**Reader Contract:**
- Who is the intended reader? What do they already know? What do they expect?
- Fiction: content warnings, genre promises (HEA, fair-play mystery, etc.)
- Non-fiction: prerequisite knowledge, disciplinary background assumed

**Revision Procedures:**
- How are revision decisions made? Authorial discretion vs. structured critique response?
- Non-fiction: how are factual errors handled post-publication?

### 3. Load Supplement Skills

If available, load the following skills for guided questions:
- \`pacing-rhythm\` — pacing archetype selection
- \`character-depth\` — character psychology depth
- \`academic-writing\` — thesis and argument structure (non-fiction)
- \`citation-styles\` — citation convention (non-fiction)

### 3a. Creative Constraints (Non-Negotiables)

Ask the author to declare any elements that must not be changed by any AI pass. These become hard constraints checked by the non-negotiables gate.

**Prompt**: "Are there any creative elements that are non-negotiable — things the AI must never change? These are your red lines. Examples:
- Plot: 'Mira must die in chapter 12', 'The antagonist is never named'
- Character: 'Theron never lies', 'Mira never uses contractions'
- Tone: 'Always melancholic, never hopeful', 'No humor after chapter 8'
- Content: 'No on-page violence against children', 'No explicit sexual content'
- Structure: 'Each chapter must end on a turn', 'No flashbacks after chapter 10'
- World: 'Magic always has a cost', 'No deus ex machina'

List as many as you want. You can add or remove these later via \`/kombinat constitute\` (update mode). Leave blank if you have no non-negotiables."

**Save constraints to** \`./book/creative-constraints.json\` using \`src/lib/creative-constraints.ts\`:
- Each constraint: id, category, description, appliesToChapters (optional), declaredAt
- Categories: plot, character, tone, content, structure, world
- The constraints become a hard gate checked during draft, revise, and edit phases

### 4. Output and Save

Populate the constitution template with the user's answers. Save to \`./book/constitution.md\`.

**Template structure:**

\`\`\`markdown
# [Creative/Intellectual] Constitution

## Core Values
[Central thesis, theme, or purpose]

## Thematic Statement
[Single sentence expressing the book's thematic argument — testable, debatable, not just a topic]

## Quality Baseline
[Non-negotiable standards, pacing preference, evidence requirements]

## Style Principles
[Register, tone, sentence-level preferences, atmosphere]

## Content Principles
[Character/structure depth, worldbuilding/argument kombinate, complexity]

## Reader Contract
[Intended audience, expectations, content notes]

## Revision Procedures
[How revision decisions are made and applied]
\`\`\`

### 5. Next Steps (Auto-Handoff)

After saving the constitution, offer to automatically continue to the next phase. Use the \`question\` tool:

Question: "Constitution saved. Continue to the next phase?"
Options:
- **Yes — Specify** (Fiction/Mixed) → Run \`/kombinat specify\` (call hubMenu route for \`specify\`)
- **Yes — Research** (Non-Fiction/Mixed) → Run \`/kombinat research\` (call hubMenu route for \`research\`)
- **No — I'll continue later** → Stop

If the user selects a phase, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately. Do NOT just tell them to type it — run it.

For Mixed track, offer both options in the question.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`pacing-rhythm\` | \`skills/fiction/writing-techniques/pacing-rhythm/SKILL.md\` | Pacing archetype selection (fiction) |
| \`character-depth\` | \`skills/fiction/writing-techniques/character-depth/SKILL.md\` | Character depth approach (fiction) |
| \`academic-writing\` | \`skills/non-fiction/academic-writing/SKILL.md\` | Thesis and argument structure (non-fiction) |
| \`citation-styles\` | \`skills/non-fiction/citation-styles/SKILL.md\` | Citation conventions (non-fiction) |
| \`creative-constraints\` | \`src/lib/creative-constraints.ts\` | Non-negotiables declaration and gate check |
| \`lorebook-import\` | \`src/lib/lorebook-import.ts\` | Import SillyTavern/JanitorAI/CharacterAI lorebooks into series lorebook format |

If skill files are not found, continue without them.`,
  tools: ["loadSkill", "bash", "question"],
  relatedSkills: ["pacing-rhythm", "character-depth", "academic-writing", "citation-styles", "creative-constraints", "lorebook-import"],
  examples: [
    { input: "/kombinat constitute I want to write a literary fantasy novel with deep character work", approach: "Asks about premise/lorebook import, then interviews the user via question tool to fill each constitution section, saves to ./book/constitution.md." },
    { input: "/kombinat constitute", approach: "Asks about premise/lorebook import, checks for existing constitution (offers diff-based update if found), otherwise starts fresh interview." }
  ],
  warnings: []
}

export default spec
