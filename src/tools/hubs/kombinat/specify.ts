import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "specify",
  description: "Build a lean story specification across four detail levels (logline, premise, story promise, knowledge map) and initialise knowledge files",
  reminder: "Phase 2: Create the story blueprint and knowledge map",
  phases: "2",
  detailedDescription: `# User Input: {userInput}

## Objective

Transform the user's story idea into a structured specification with progressive detail levels. The specification is the authoritative reference for all subsequent creative decisions. Detailed canon lives in \`./book/knowledge/\`.

## Prerequisites

- \`./book/constitution.md\` should exist (Phase 1 completed)
- \`./book/track.json\` should confirm fiction or mixed track

## Execution Steps

### 1. Check Existing Documents

- Check \`./book/specification.md\` or \`./book/specification/\` exists. If so, read and offer update.
- Check \`./book/knowledge/\` for existing character profiles, locations, etc.

### 2. Read Constitution

Load \`./book/constitution.md\` to understand the creative principles that constrain the specification. Extract the thematic statement (if present) for premise evaluation.

### 3. Premise Stress-Test (HARD BLOCK)

Before committing to a full specification, stress-test the premise. A weak premise produces a structurally weak book — everything downstream depends on premise strength.

**Stress-test criteria:**

| Criterion | What it checks | Fail condition |
|-----------|----------------|----------------|
| Logline expressibility | Can the premise be expressed as: [Protagonist] + [Goal] + [Stakes] + [Obstacle] + [Choice]? | Vague premise with no clear protagonist, goal, or stakes |
| Conflict inherency | Is the conflict inherent to the premise, or bolted on? | Conflict could be removed without changing the premise |
| Stake escalation | Are the stakes specific and escalating? Can they worsen? | Stakes are generic ("the world will end") or static |
| Protagonist choice | Does the protagonist face a genuine choice with costs on both sides? | Protagonist has only one path, or choice has no cost |
| Sustain capacity | Can the premise generate enough material for the target word count? | Premise runs out of steam after 20,000 words |
| Theme alignment | Does the premise embody the constitution's thematic statement? | Premise and theme are disconnected |

**If the premise fails any criterion: STOP. Report the specific failure and ask the user to revise the premise before proceeding.** Do not build a specification on a weak premise.

**Premise stress-test output:**

\`\`\`markdown
## Premise Stress-Test

| Criterion | Status | Assessment |
|-----------|--------|------------|
| Logline expressibility | ✓ / ✗ | [Assessment] |
| Conflict inherency | ✓ / ✗ | [Assessment] |
| Stake escalation | ✓ / ✗ | [Assessment] |
| Protagonist choice | ✓ / ✗ | [Assessment] |
| Sustain capacity | ✓ / ✗ | [Assessment] |
| Theme alignment | ✓ / ✗ | [Assessment] |

**Logline:** [Generated logline if pass]

**Result:** [PASS — proceed to specification / FAIL — revise premise]
\`\`\`

### 4. Build Specification Levels

Interview the user to progressively build the specification. Use the \`question\` tool for all interview questions:

**Level 1: Logline** — A single sentence capturing the story's essence.
Format: \`[Protagonist] must [goal] or else [stakes] in a world where [setting].\`
(This was already validated in the premise stress-test — confirm and refine.)

**Level 2: Core Premise** — A paragraph covering:
- Protagonist (who, want, flaw)
- Goal (what do they need)
- Conflict (what stands in their way)
- Stakes (what happens if they fail)

**Level 3: Story Promise** — What the reader will experience:
- Core emotional purpose
- Central conflict type (person vs. person/nature/self/society)
- Primary and secondary themes
- Target audience
- Success criteria (what "working" looks like)

**Level 4: Knowledge Map** — Pointers to detailed canon:
- Character profiles (list primary, secondary, tertiary characters)
- Locations (key settings)
- World-setting (rules, magic/technology, culture)
- Glossary (terms, titles, factions)
- Strategic reversals (if applicable)

Use these markers:
- \`[Needs Clarification]\` — Vague points to resolve in Phase 3
- \`[Core Requirement]\` — Non-negotiable elements from the constitution
- \`[Optional Feature]\` — Nice-to-haves

### 5. Initialise Knowledge Files

Create or update files in \`./book/knowledge/\`:

| File | Content |
|------|---------|
| \`character-profiles.md\` | Profile per character: name, role, goal, flaw, arc, background, psychology |
| \`character-voices.md\` | Speech patterns, verbal tics, register per character |
| \`locations.md\` | Key settings: sensory details, spatial relationships, mood |
| \`world-setting.md\` | World rules, magic/technology systems, cultural norms |
| \`glossary.md\` | Terms, titles, faction names, item descriptions |
| \`strategic-reversals.md\` | Contest systems, strategy profiles, reversal ledger |

Use the templates from \`templates/fiction/knowledge/\` for structure. Keep each knowledge file focused and under ~500 lines.

### 6. Save Specification

Save the completed specification to \`./book/specification.md\`. If it exceeds ~500 lines, use split mode: \`./book/specification/_main.md\` as index, shards for each level.

### 7. Next Steps

"Your specification is saved. Continue to Phase 3: \`/kombinat clarify\` to resolve ambiguities, or if you have contextual research to gather, \`/kombinat research\` first."

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`scene-structure\` | \`skills/fiction/writing-techniques/scene-structure/SKILL.md\` | Scene framework reference |
| \`character-depth\` | \`skills/fiction/writing-techniques/character-depth/SKILL.md\` | Character profiling guidance |
| \`namecraft\` | \`skills/fiction/writing-techniques/namecraft/SKILL.md\` | Character and location naming |`,
  tools: ["loadSkill", "bash", "question"],
  relatedSkills: ["scene-structure", "character-depth", "namecraft"],
  examples: [
    { input: "/kombinat specify I want to write about a detective who solves crimes using memory palaces", approach: "Starts Phase 2. Reads constitution, then builds logline → premise → story promise → knowledge map through structured interview." },
    { input: "/kombinat specify", approach: "Checks for existing specification and knowledge files. Offers update if found, otherwise starts fresh build." }
  ],
  warnings: []
}

export default spec
