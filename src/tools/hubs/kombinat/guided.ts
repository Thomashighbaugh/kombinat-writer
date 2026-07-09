import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "guided",
  description: "Assess project state and guide you to the next appropriate phase",
  reminder: "Detects current phase and recommends next step",
  phases: "utility",
  detailedDescription: `# User Input: {userInput}

## Objective

Determine the user's current project state and route them to the correct phase in the Kombinat Writer workflow. If a subcommand was provided as the first argument, dispatch directly. If not, run state detection and present a contextualised roadmap.

## Subcommand Dispatch

If \`{userInput}\` begins with a recognised subcommand or alias, dispatch immediately:

| Subcommand | Aliases | Route to |
|-----------|---------|----------|
| \`constitute\` | \`const\` | \`/kombinat constitute\` |
| \`specify\` | \`spec\` | \`/kombinat specify\` |
| \`clarify\` | \`clar\` | \`/kombinat clarify\` |
| \`research\` | \`rsrc\`, \`ingest\` | \`/kombinat research\` |
| \`outline\` | \`plan\`, \`structure\` | \`/kombinat outline\` |
| \`task-manager\` | \`tasks\`, \`task\` | \`/kombinat task-manager\` |
| \`draft\` | \`write\`, \`chapter\` | \`/kombinat draft\` |
| \`critique\` | \`alpha\`, \`beta\` | \`/kombinat critique\` |
| \`revise\` | \`revision\` | \`/kombinat revise\` |
| \`edit\` | \`editor\`, \`line\` | \`/kombinat edit\` |
| \`review\` | \`qa\`, \`audit\` | \`/kombinat review\` |
| \`cite\` | \`citation\`, \`bibliography\` | \`/kombinat cite\` |
| \`publish\` | \`pub\`, \`export\`, \`submit\` | \`/kombinat publish\` |
| \`track\` | — | \`/kombinat track\` |
| \`timeline\` | — | \`/kombinat timeline\` |
| \`meta\` | — | \`/kombinat meta\` |
| \`drafter\` | — | \`/kombinat drafter\` |

If the subcommand is not recognised, proceed to state detection and treat the full \`{userInput}\` as context.

## Execution Steps

### 1. Detect Track

Check \`./book/track.json\`:
- If it exists, read the \`track\` field: \`fiction\`, \`non-fiction\`, or \`mixed\`.
- If it does not exist, ask the user (using the \`question\` tool): "Which track is this project? (fiction / non-fiction / mixed)"
- If uncertain, ask diagnostic questions about the nature of the work using the \`question\` tool.

### 2. Detect Phase

Check for the presence and status of phase output documents. The detection follows the track-specific phase order.

**Fiction track detection order:**
1. \`./book/constitution.md\` exists? → Past Phase 1
2. \`./book/specification.md\` or \`./book/specification/\` exists? → Past Phase 2
3. \`./book/specification/\` has \`[Needs Clarification]\` markers? → Phase 3 needed
4. \`./book/research/\` has source files or \`research-plan.md\`? → Past Phase 4 (or skipped)
5. \`./book/outline.md\` or \`./book/outline/\` exists? → Past Phase 5
6. \`./book/tasks.md\` or \`./book/tasks/\` exists? → Past Phase 6
7. Any files in \`./book/content/\`? → Phase 7 in progress
8. Any files in \`./book/critique/\`? → Phase 8 in progress
9. Any files in \`./book/revisions/\`? → Phase 9 in progress
10. Any chapters with \`[Done]\` in task tracking? → Phases 10-11 reached

**Non-fiction track detection order:**
1. \`./book/constitution.md\` exists? → Past Phase 1
2. \`./book/research/\` has sources or research plan? → Past Phase 2
3. Sources annotated and bibliography started? → Past Phase 3
4. \`./book/outline.md\` exists? → Past Phase 4
5. Chapters in \`./book/content/\`? → Phase 5 in progress
6. Citations present in chapters? → Phase 5+6 handled
7. Any files in \`./book/critique/\`? → Phase 7+8 in progress

**Mixed track:** Check fiction order first, then non-fiction detection for citation support.

### 3. Determine State Category

| State | Meaning | Recommended Next |
|-------|---------|-----------------|
| \`not-started\` | No phase documents exist | Phase 1: \`/kombinat constitute\` |
| \`in-progress\` | Some phases complete, current phase identified | Current phase subcommand |
| \`active-writing\` | Drafting phase, chapters exist | Phase 7: \`/kombinat draft\` or \`/kombinat critique\` |
| \`revision-cycle\` | Critique or revision artifacts exist | Phase 8-9: \`/kombinat critique\` or \`/kombinat revise\` |
| \`editing\` | Chapters have been revised, ready for line edit | Phase 10: \`/kombinat edit\` |
| \`review\` | Editing complete or nearing completion | Phase 11: \`/kombinat review\` |
| \`publishing\` | All content approved, ready to export | Phase 12: \`/kombinat publish\` |
| \`complete\` | Everything finalised | Celebrate the achievement |

**IMPORTANT — Do not belabor the obvious.** When the state is \`not-started\`, simply state "New project — starting from Phase 1" and recommend \`/kombinat constitute\`. Do NOT repeatedly mention that the project is blank, empty, or has no documents — the user knows, they just created it. Be concise. One sentence of context, then the recommendation.

**Also check for imported files.** Before reporting state, check for:
- \`./imported-lorebook.json\` — if present, mention "Lorebook import detected — run \`/kombinat constitute\` to convert it into series lorebook and pre-fill your constitution."
- \`./premise.md\` — if present, mention "Premise document detected — run \`/kombinat constitute\` to use it as a starting point."

### 4. Build Contextualised Roadmap

Present a roadmap that:

- Shows the overall phase sequence for the detected track
- Highlights completed phases with \`[DONE]\`
- Marks the current recommended phase with \`[NEXT]\`
- Shows upcoming phases with \`[PENDING]\`
- Provides a one-line summary of what the recommended phase produces

**Example output structure (fiction, specification done):**

\`\`\`
Track: Fiction  |  State: Planning

Phase Workflow:
  [DONE]   1. Constitute   — Creative principles established
  [DONE]   2. Specify      — Story specification created
  [NEXT]   3. Clarify      — Resolve ambiguities in the specification
  [PENDING] 4. Research     — Gather contextual reference material
  [PENDING] 5. Outline      — Chapter structure and arc design
  [PENDING] 6. Tasks        — Break outline into tracked tasks
  [PENDING] 7. Draft        — Write chapters with pre-draft checklist
  [PENDING] 8. Critique     — Structured feedback simulation
  [PENDING] 9. Revise       — Plan and apply revisions
  [PENDING] 10. Edit        — Line-level editing pass
  [PENDING] 11. Review       — Broad project QA
  [PENDING] 12. Publish      — Format export and submission

To continue, type: /kombinat clarify
\`\`\`

### 5. Manual Drafting Guidance

If the user asks how to write drafts manually:

Draft files go in \`./book/drafts/\` (relative to project root). The \`/kombinat draft\` command scans this folder before writing and uses drafts as structural guidance. Accepted naming: \`chapter_00001.md\`, \`0001.md\`, \`chapter-1.md\`.

**Draft tags** that \`/kombinat draft\` processes:
- \`@#@ FILL @#@ [description] @#@ END FILL @#@\` — Replaced with fully written prose
- \`@#@ DESCRIBE @#@ [description] @#@ END DESCRIBE @#@\` — Sensory expansion
- \`@#@ FLASHBACK @#@ [description] @#@ END FLASHBACK @#@\` — Full flashback sequence

### 6. Track-Specific Guidance

**Fiction**: Emphasise the constitution → specification → outline → draft pipeline. The critical path is consistent character and plot tracking.

**Non-fiction**: Emphasise the research → outline → draft-with-citations pipeline. The critical path is source integrity and citation accuracy.

**Mixed**: Support both tracks simultaneously. Characters may need research backing; non-fiction sections may need narrative structure.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`workflow-guide\` | \`skills/quality-assurance/workflow-guide/SKILL.md\` | Reference phase methodology |
| \`getting-started\` | \`skills/quality-assurance/getting-started/SKILL.md\` | Help user if stuck |
| \`citation-styles\` | \`skills/non-fiction/citation-styles/SKILL.md\` | Citation format reference (non-fiction) |

If any skill file is not found, note it but continue.`,
  tools: ["loadSkill", "bash", "question"],
  relatedSkills: ["workflow-guide", "getting-started"],
  examples: [
    { input: "/kombinat guided", approach: "Runs state detection, detects current phase, and presents a contextualised roadmap." },
    { input: "/kombinat guided specify", approach: "Dispatches directly to the specify phase without state detection." }
  ],
  warnings: []
}

export default spec
