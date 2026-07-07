import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "timeline",
  description: "Manage story or project timeline: view, add events, verify chronological consistency, detect gaps and contradictions",
  reminder: "Utility: Chronological consistency verification",
  phases: "utility",
  detailedDescription: `# User Input: {userInput}

## Objective

Maintain an accurate chronology of events. For fiction, this means the in-world story timeline. For non-fiction, this means the composition and source-gathering timeline.

## Execution Steps

### 1. Load Timeline Data

Read \`./book/tracking/timeline.json\`. If it does not exist, suggest \`/kombinat track\` to initialise.

### 2. Actions

| Action | Description |
|--------|-------------|
| \`view\` | Display the full timeline sorted chronologically |
| \`add\` | Add a new event to the timeline |
| \`verify\` | Check for gaps, overlaps, contradictions across written chapters |
| \`gap\` | Identify missing time periods or unresolved date ranges |

### 3. Timeline Entry Format (Fiction)

\`\`\`json
{
  "id": "evt-001",
  "date": "Year 1247, Spring",
  "chapter": 3,
  "event": "Protagonist arrives at the capital",
  "characters": ["Eira", "Torvin"],
  "verified": true
}
\`\`\`

### 4. Verification

Cross-reference timeline entries against all written chapters. Flag:
- Events referenced in chapters but missing from timeline
- Timeline events not yet written
- Chronological contradictions (event B occurs before event A despite timeline showing A before B)
- Impossible elapsed times between events

### 5. Next Steps

"Timeline verified. No contradictions found." or "Timeline has [N] gaps. Recommended: \`/kombinat specify\` to clarify dates, or add missing events with \`/kombinat timeline add\`."`,
  tools: ["bash"],
  relatedSkills: ["consistency-checker"],
  examples: [
    { input: "/kombinat timeline view", approach: "Displays the full project timeline sorted chronologically" },
    { input: "/kombinat timeline add date=\"Year 1247, Spring\" event=\"Arrival\"", approach: "Adds a new event to the timeline" },
    { input: "/kombinat timeline verify", approach: "Checks for gaps, overlaps, and contradictions across chapters" }
  ],
  warnings: []
}

export default spec
