import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "meta",
  description: "Record bibliographic metadata: title, author, genres, tags, status, word count, license, ISBN. Used by publish pipeline.",
  reminder: "Utility: Record project metadata",
  phases: "utility",
  detailedDescription: `# User Input: {userInput}

## Objective

Maintain a single source of truth for the project's metadata, used by the publish pipeline for format generation and by external tooling for distribution.

## Execution Steps

### 1. Load or Create

Check \`./book/meta.json\`. If it does not exist, create it with fields left blank.

### 2. Actions

| Action | Description |
|--------|-------------|
| \`view\` | Display current metadata |
| \`set\` | Set one or more metadata fields |
| \`export\` | Export metadata in specific format (JSON, YAML, TOML, EPUB OPF) |

### 3. Metadata Fields

\`\`\`json
{
  "title": "",
  "subtitle": "",
  "author": "",
  "authorUrl": "",
  "description": "",
  "language": "en",
  "workType": "novel",
  "status": "draft",
  "genres": [],
  "tags": [],
  "series": "",
  "seriesPosition": 1,
  "targetAudience": "",
  "contentWarnings": [],
  "wordCount": 0,
  "chapterCount": 0,
  "startedDate": "",
  "completedDate": "",
  "publishedDate": "",
  "license": "All Rights Reserved",
  "isbn": "",
  "publisher": "",
  "coverImage": "",
  "citationStyle": "apa7",
  "version": "1.0.0"
}
\`\`\`

### 4. Next Steps

"Metadata saved. View with \`/kombinat meta view\`. Used by \`/kombinat publish\` for format generation."`,
  tools: ["bash"],
  relatedSkills: ["style-enforcer"],
  examples: [
    { input: "/kombinat meta set title=\"My Novel\" author=\"Author Name\"", approach: "Sets title and author metadata fields" },
    { input: "/kombinat meta view", approach: "Displays all current metadata" },
    { input: "/kombinat meta export json", approach: "Exports metadata as JSON" }
  ],
  warnings: []
}

export default spec
