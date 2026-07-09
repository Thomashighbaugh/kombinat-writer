import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "cite",
  description: "Citation management: add sources, format in APA/Chicago/MLA/IEEE, validate cross-references, generate bibliographies",
  reminder: "Utility: Manage citations and bibliography",
  phases: "utility",
  detailedDescription: `# User Input: {userInput}

## Objective

Manage the full citation lifecycle: source ingestion, citation formatting, validation, and bibliography generation. For non-fiction tracks, this is a core phase. For fiction and mixed tracks, it is available as a utility for any referenced material.

## Actions

| Action | Description | Example |
|--------|-------------|---------|
| \`add\` | Ingest a new source | \`/kombinat cite add "Author (2024) Title. Publisher."\` |
| \`format\` | Reformat a citation in selected style | \`/kombinat cite format Chapter 5\` |
| \`validate\` | Check all citations for consistency | \`/kombinat cite validate\` |
| \`bibliography\` | Generate or update the bibliography | \`/kombinat cite bibliography\` |
| \`style\` | Set or change the citation style | \`/kombinat cite style apa7\` |

## Supported Citation Styles

| Style | Code | Discipline |
|-------|------|------------|
| APA 7th Edition | \`apa7\` | Social sciences, psychology, education |
| Chicago 17th (Notes) | \`chicago17-notes\` | History, humanities |
| Chicago 17th (Author-Date) | \`chicago17-ad\` | Sciences, social sciences |
| MLA 9th Edition | \`mla9\` | Literature, arts, humanities |
| IEEE | \`ieee\` | Engineering, computer science |
| Bluebook 21st | \`bluebook21\` | Law |
| Vancouver | \`vancouver\` | Medicine, biomedicine |
| Custom | \`custom\` | Specify your own format |

## Execution Steps

### 1. Add Source

When the user provides source information:

1. Extract or request full bibliographic metadata
2. Format in the project's selected citation style
3. Add to \`./book/research/sources/source-[key].md\` with full citation and annotation
4. Add to \`./book/research/bibliography/bibliography.md\`
5. Assign a source key (e.g., \`[source: author2024]\`)

### 2. Format Citations in Chapters

Scan one or more chapters for:
- \`[Source: key]\` markers → replace with formatted inline citation
- \`[CitationNeeded]\` markers → flag as unresolved

### 3. Validate Citations

Check:
- Every \`[Source: key]\` references an existing source note
- All source notes have complete bibliographic metadata
- Citation format is consistent with the selected style
- No dangling \`[CitationNeeded]\` markers remain in final-draft chapters

### 4. Generate Bibliography

Compile all cited sources into \`./book/research/bibliography/bibliography.md\` formatted in the project's selected style, alphabetised by author.

### 5. Next Steps (Auto-Handoff)

Context-dependent handoff using the \`question\` tool:

- During research phase: Offer to run \`/kombinat outline\`
- During review phase: "Citations validated. All \`[Source: key]\` markers resolved." — offer to run \`/kombinat publish\`
- Pre-publish: "Bibliography generated." — offer to run \`/kombinat publish\`

If the user selects a phase, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`citation-styles\` | \`skills/non-fiction/citation-styles/SKILL.md\` | Citation format reference for all styles |
| \`source-evaluation\` | \`skills/non-fiction/source-evaluation/SKILL.md\` | Source credibility assessment |`,
  tools: ["loadSkill", "bash"],
  relatedSkills: ["citation-styles", "source-evaluation"],
  examples: [
    { input: "/kombinat cite add \"Author (2024) Title. Publisher.\"", approach: "Ingests a new source and adds it to the source database" },
    { input: "/kombinat cite validate", approach: "Checks all citations for consistency and completeness" },
    { input: "/kombinat cite bibliography", approach: "Generates or updates the project bibliography" }
  ],
  warnings: []
}

export default spec
