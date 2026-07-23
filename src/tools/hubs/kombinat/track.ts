import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "track",
  description: "Unified tracking: update or query character state, plot progress, timeline events, relationship dynamics, source status, argument progression",
  reminder: "Utility: Update or query project tracking state",
  phases: "utility",
  detailedDescription: `# User Input: {userInput}

## Objective

Maintain the project's structured tracking data. Tracking files live in \`./book/tracking/\` and are read before every chapter draft to ensure consistency.

## Track Adaptations

| Tracking File | Fiction | Non-fiction | Mixed |
|---------------|---------|-------------|-------|
| \`character-state.json\` | Character emotional arcs and physical state | N/A | Character state |
| \`plot-tracker.json\` | Plot threads and resolution status | N/A | Plot tracker |
| \`timeline.json\` | Chronological story events | Chapter completion timeline | Both |
| \`relationships.json\` | Character relationship dynamics | Source cross-references | Character relationships + source refs |
| \`validation-rules.json\` | Custom rules from manifest | Custom rules from manifest | Both |
| \`source-tracker.json\` | N/A | Source ingestion and verification status | Source tracker |
| \`argument-progression.json\` | N/A | Argument/thesis progression per chapter | Argument progression |

## Execution Steps

### 1. Determine Track and Entity

Read \`./book/track.json\` to determine which tracking files are relevant.

### 2. Update Tracking

For \`update\` actions:
- Read the relevant tracking JSON file
- Apply the update (new state, new plot event, new timeline entry, new relationship shift)
- Validate against validation rules
- Save with timestamp

### 3. Query Tracking

For \`query\` actions:
- Read the relevant tracking file
- Present the requested information
- For timeline queries, verify chronological consistency

### 4. Validate

For \`validate\` actions:
- Check all tracking files for internal consistency
- Verify character states track across all chapters
- Confirm timeline events are in chronological order
- Check plot threads have resolution or \`[Active]\` status
- Verify all sources are cited in chapters (non-fiction)

### 5. Next Steps

"Tracking [entity] updated/queried/validated."

## Supplement Skills

None specific to this utility.`,
  tools: ["bash"],
  relatedSkills: ["consistency-checker", "forgotten-elements"],
  examples: [
    { input: "/kombinat track character update Eira state=anxious", approach: "Updates character Eira's emotional state in the tracking file" },
    { input: "/kombinat track plot query", approach: "Queries current plot thread statuses" },
    { input: "/kombinat track validate", approach: "Validates all tracking files for internal consistency" }
  ],
  warnings: []
}

export default spec
