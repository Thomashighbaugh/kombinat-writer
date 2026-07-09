import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "clarify",
  description: "Review specification for ambiguities, identify unresolved points, ask targeted questions, and remove resolved markers",
  reminder: "Phase 3: Resolve ambiguities in the specification",
  phases: "3",
  detailedDescription: `# User Input: {userInput}

## Objective

Identify unresolved or ambiguous elements in the story specification and resolve them through targeted questioning. A clarified specification prevents costly structural rewrites during the drafting phase.

## Prerequisites

- \`./book/specification.md\` or \`./book/specification/\` must exist

## Execution Steps

### 1. Load Specification

Read \`./book/specification.md\` (or \`./book/specification/_main.md\` and relevant shards). Identify all markers:
- \`[Needs Clarification]\` — prioritise these
- \`[Core Requirement]\` — verify these are sufficiently specific
- \`[Optional Feature]\` — note these but do not block on them

### 2. Load Knowledge and Constitution

Read \`./book/constitution.md\` and \`./book/knowledge/\` files for additional context that may reveal gaps.

### 3. Identify Ambiguities

Scan for:
- Vague or contradictory statements
- Missing character motivations or backstory gaps
- Underdefined settings or world rules
- Unclear plot mechanics or causal chains
- Tension between stated goals and established constraints

Select up to five items to clarify in this session. Prioritise items that block structural decisions (character arcs, central conflict, world rules) over cosmetic details.

### 4. Ask Targeted Questions

For each ambiguity, present (using the \`question\` tool):
- **Location**: Where in the specification it appears
- **Issue**: What is ambiguous or missing
- **Question**: A single, specific question to resolve it
- **Effect**: What becomes possible once resolved

Allow the user to answer each question before moving to the next. Use the \`question\` tool for each question.

### 5. Update Specification

After each resolution:
- Remove the \`[Needs Clarification]\` marker
- Replace vague language with the user's concrete answer
- If the resolution introduces new constraints, add them with \`[Core Requirement]\` markers

### 6. Next Steps (Auto-Handoff)

After clarifying, offer to automatically continue. Use the \`question\` tool:

Question: "Specification clarified. Continue to the next phase?"
Options:
- **Yes — Research** → Run \`/kombinat research\` (call hubMenu route)
- **Yes — Outline** → Run \`/kombinat outline\` (call hubMenu route)
- **No — I'll continue later** → Stop

If the user selects a phase, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`consistency-checker\` | \`skills/quality-assurance/consistency-checker/SKILL.md\` | Detect internal contradictions |
| \`forgotten-elements\` | \`skills/quality-assurance/forgotten-elements/SKILL.md\` | Catch missing or underdeveloped elements |`,
  tools: ["loadSkill", "bash", "question"],
  relatedSkills: ["consistency-checker", "forgotten-elements"],
  examples: [
    { input: "/kombinat clarify", approach: "Loads specification, scans for [Needs Clarification] markers, and asks up to 5 targeted questions to resolve each." },
    { input: "/kombinat clarify character motivations", approach: "Narrows ambiguity scanning to character motivation sections of the specification." }
  ],
  warnings: []
}

export default spec
