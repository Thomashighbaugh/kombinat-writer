import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "research",
  description: "Active research: define questions, search sources, extract annotations, evaluate credibility, synthesise findings",
  reminder: "Phase 4: Gather and organise contextual knowledge",
  phases: "4",
  detailedDescription: `# User Input: {userInput}

## Objective

Gather and organise the contextual knowledge required to write with authority. For fiction, this means authenticating world-building details, historical periods, technical fields, or cultural settings. For non-fiction, this means building a rigorous source base with evaluated evidence and clear attribution trails.

## Research Output Structure

All research artifacts go into \`./book/research/\`:

\`\`\`
research/
├── research-plan.md          # Questions, methodology, search strategy
├── sources/                  # Per-source notes
│   ├── source-author-title.md
│   └── ...
├── interviews/               # Interview transcripts and field notes
│   └── ...
├── bibliography/             # Formatted bibliography (non-fiction)
│   ├── bibliography.md
│   └── ...
└── literature-review.md      # Synthesis of multiple sources (optional)
\`\`\`

## Execution Steps

### 1. Establish Research Plan

Interview the user to define. Use the \`question\` tool for all interview questions:
- **Research questions**: What specific questions need answers?
- **Kombinate**: What is in and out of kombinate for this research phase?
- **Depth**: Quick survey vs. deep academic review vs. authenticity check
- **Sources**: Preferred source types (primary, secondary, academic, experiential, field)
- **Fiction-specific**: Authenticity targets (historical accuracy, technical plausibility, cultural authenticity)

### 2. Search and Ingestion

For each research question, conduct searches appropriate to the kombinate:

- **Quick checks**: Use web search for factual verification, date ranges, terminology
- **Source extraction**: For substantive sources, extract key claims, quotations, and attributions into a structured source note
- **Annotation**: Each source note should record:
  - Full citation information (author, title, date, publisher, URL, accessed date)
  - Key claims extracted with page/paragraph references
  - Your commentary: how this source informs the work
  - Credibility assessment (CRAAP criteria where applicable)
  - Cross-references to other sources

**Source note template:**

\`\`\`markdown
# Source: [Author] — [Title]

## Citation
[Full bibliographic entry]

## Key Claims
1. [Claim] (p. XX)
   - Relevance: [How this informs the work]
2. [Claim] (p. XX)
   - Relevance: [How this informs the work]

## Commentary
[Your analysis, critique, or application notes]

## Credibility
- Currency: [High/Medium/Low — date of publication]
- Relevance: [High/Medium/Low — relevance to research questions]
- Authority: [High/Medium/Low — author credentials]
- Accuracy: [High/Medium/Low — evidence quality]
- Purpose: [Informational/Persuasive/Commercial]

## Cross-References
- [Source A]: [Points of agreement or contradiction]
\`\`\`

### 3. Synthesis (Optional)

If multiple sources address the same question, produce a synthesis note:
- Points of consensus across sources
- Points of disagreement or debate
- Your assessment of where the weight of evidence lies
- Gaps that remain unfilled

### 4. Bibliography (Non-Fiction)

If the track is non-fiction or mixed, maintain a running bibliography. Each new source is added to \`./book/research/bibliography/bibliography.md\` in the selected citation style (APA 7th, Chicago 17th, MLA 9th, IEEE — set during Phase 1).

### 5. Next Steps (Auto-Handoff)

After saving research notes, offer to automatically continue. Use the \`question\` tool:

Question: "Research notes saved. Continue to outlining?"
Options:
- **Yes — Outline** → Run \`/kombinat outline\` (call hubMenu route for \`outline\`)
- **No — I'll continue later** → Stop

If the user selects, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: "outline"\` and execute it immediately.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`web-research\` | \`skills/research/web-research/SKILL.md\` | Search strategies, credibility assessment |
| \`source-annotation\` | \`skills/research/source-annotation/SKILL.md\` | Active reading and extraction methods |
| \`citation-styles\` | \`skills/non-fiction/citation-styles/SKILL.md\` | Citation formatting reference |
| \`source-evaluation\` | \`skills/non-fiction/source-evaluation/SKILL.md\` | CRAAP test, bias detection |
| \`interview-methods\` | \`skills/research/interview-methods/SKILL.md\` | Interview design and transcription |
| \`field-notes\` | \`skills/research/field-notes/SKILL.md\` | Observation recording standards |`,
  tools: ["loadSkill", "bash", "websearch", "question"],
  relatedSkills: ["web-research", "source-annotation", "citation-styles", "source-evaluation", "interview-methods", "field-notes"],
  examples: [
    { input: "/kombinat research 19th century maritime medicine", approach: "Starts Phase 4. Defines research questions, searches sources, extracts annotations, evaluates credibility, and saves structured notes." },
    { input: "/kombinat research", approach: "Establishes a research plan first, then proceeds through search, annotation, and synthesis." }
  ],
  warnings: []
}

export default spec
