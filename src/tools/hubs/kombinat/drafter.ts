import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "drafter",
  description: "Create, extend, redo, or lightly revise loose draft material from raw ideas. Drafts are non-canonical and feed into the draft phase.",
  reminder: "Utility: Create and manage loose draft material",
  phases: "utility",
  detailedDescription: `# User Input: {userInput}

## Objective

Capture raw creative or expository ideas as loose draft material without the pressure of producing finished prose. Drafts are editable, replaceable, and explicitly non-canonical.

## Actions

| Action | Description |
|--------|-------------|
| \`new\` (default) | Create a new draft from the user's idea |
| \`extend\` | Add to an existing draft |
| \`redo\` | Replace an existing draft entirely |
| \`revise\` | Suggest specific line changes to an existing draft |

## Execution Steps

### 1. Determine Action

If \`{userInput}\` starts with one of the action keywords, use it. Otherwise default to \`new\`.

### 2. Load Context

For \`extend\`, \`redo\`, and \`revise\`: load the existing draft file and any related knowledge or chapter files for context.

### 3. Create/Update Draft

- Create a loose, idea-dump formatted file in \`./book/drafts/\`
- Use only related draft, knowledge, and chapter context — do not treat the draft as canon
- For \`revise\`: suggest changes as Current → Suggest → Reason items (user chooses whether to apply)

### 4. Save

Save to \`./book/drafts/chapter_[NNNNN].md\` or \`./book/drafts/[topic].md\`. Inform the user the draft is ready for \`/kombinat draft\` which will detected and expand it.

### 5. Next Steps

"Draft saved to ./book/drafts/. When you are ready for full prose, run \`/kombinat draft Chapter [N]\` — it will detect and expand this draft."`,
  tools: ["bash"],
  relatedSkills: ["scene-structure", "dialogue-techniques"],
  examples: [
    { input: "/kombinat drafter new A haunted lighthouse keeper discovers a message in a bottle", approach: "Creates a new loose draft from the raw idea" },
    { input: "/kombinat drafter extend chapter_00001", approach: "Adds material to an existing draft" },
    { input: "/kombinat drafter redo chapter_00001", approach: "Replaces an existing draft entirely with fresh material" }
  ],
  warnings: []
}

export default spec
