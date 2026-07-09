import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "read-through",
  description: "Full read-through as a reader (not editor): flag confusion, engagement drops, emotional impact, and page-turner quality. Simulates the reader experience from start to finish.",
  reminder: "Per-chapter editorial sub-phase: reader experience simulation",
  phases: "7-11",
  detailedDescription: `# User Input: {userInput}

## Objective

Read the manuscript as a reader, not an editor. The goal is to experience the book the way a reader will: looking for confusion, engagement drops, emotional impact, and the "just one more chapter" feeling. This is NOT a line-edit or structural critique — it's an experience simulation.

## Prerequisites

- At least 3 chapters must exist in \`./book/content/\`
- Ideally the manuscript is past first draft (tasks marked \`[FR]\` or beyond)

## Execution Steps

### 1. Parse Scope

- \`/kombinat read-through\` → all chapters
- \`/kombinat read-through 1-5\` → chapters 1 through 5
- \`/kombinat read-through all\` → all chapters

### 2. Enter Reader Mode

**Critical mindset shift:** For this phase, you are a reader, not an editor. You are NOT looking for:
- Grammar or spelling errors
- Style improvements
- Structural issues
- Line-level polish

You ARE looking for:
- Confusion: "Wait, who is this character?" "Where are we?" "When did that happen?"
- Engagement drops: "I'm losing interest here." "This section is dragging." "My mind wandered."
- Emotional impact: "That scene hit hard." "I felt nothing here." "That revelation was shocking."
- Page-turner quality: "I need to know what happens next." "I can stop here." "Just one more chapter."
- Belief: "I don't buy this." "That character wouldn't do that." "This feels contrived."

### 3. Sequential Read-Through

Read all chapters in sequence, **in order, without skipping**. This simulates the actual reading experience. The reader does not have the outline or specification — they only know what the text tells them.

After each chapter, record:

\`\`\`markdown
## Chapter [N]: [Title]

### Reader Experience Log

**Engagement**: [1-5 scale, where 1 = "wanted to stop reading" and 5 = "couldn't put it down"]

**Confusion points**:
- [If any: specific moment + what was confusing]
- None

**Engagement drops**:
- [If any: specific section where interest waned + why]
- None

**Emotional highlights**:
- [Specific moment that landed emotionally + what emotion it evoked]

**Page-turner pull**: [1-5 scale, where 1 = "I can stop here" and 5 = "I MUST read the next chapter immediately"]

**Belief breaks**:
- [If any: specific moment where the reader stops believing + why]
- None

**Reader's current understanding**:
- Plot: [What the reader thinks is happening]
- Characters: [Who the reader thinks the main characters are and what they want]
- Stakes: [What the reader thinks is at stake]
- Questions: [What questions the reader is carrying forward]
\`\`\`

### 4. Cross-Chapter Experience Analysis

After reading all chapters, analyze the reading experience across the whole manuscript:

**Engagement curve**: Plot the engagement score per chapter. A good book maintains 3+ throughout, with peaks at key moments. Identify:
- **Valleys**: Chapters scoring 1-2 (reader is bored)
- **Peaks**: Chapters scoring 5 (reader is riveted)
- **Sustained drops**: 2+ consecutive chapters at 2 or below

**Confusion clusters**: Are there chapters where multiple confusion points appear? This often indicates:
- A character introduced without enough grounding
- A setting that isn't established
- A plot development that wasn't set up
- A timeline jump that isn't clear

**Page-turner rhythm**: Does the book have a rhythm of pull → release → pull? Or is the pull constant (which leads to fatigue) or absent (which leads to dropping the book)?

**Belief breaks**: These are critical — a belief break is where the reader stops trusting the story. Cluster of belief breaks indicate the author is losing the reader's buy-in.

**Carried questions**: What questions is the reader carrying forward? Are they being answered at a satisfying rate? A book that introduces questions but never answers them creates frustration. A book that answers everything immediately creates no tension.

### 4b. Immersion Break Audit (HARD BLOCK)

Run the immersion break audit (\`src/lib/immersion-audit.ts\`) across all chapters. Scans for:
- **Anachronisms**: Modern terms in pre-modern settings (e.g., "okay" in medieval fantasy)
- **Authorial intrusion**: Phrases like "little did they know", "as fate would have it" — show, don't tell the reader what to think
- **Meta-references**: References to "the story" or "the reader" that break the fourth wall
- **Logic breaks**: Characters knowing things without justification ("somehow knew", "instinctively knew")

**If blocking immersion breaks found: STOP.** Report the specific passage and why it breaks immersion.

### 4c. Trust Accounting (HARD BLOCK)

Run the trust audit (\`src/lib/trust-audit.ts\`) across all chapters. Scans for:
- **Coincidences**: "happened to be", "by coincidence", "as luck would have it" — events resolving by luck
- **Deus ex machina**: "suddenly appeared", "arrived just in time", "a mysterious stranger" — solutions not set up earlier (HARD BLOCK)
- **Stupid-for-plot**: Characters acting against their intelligence to serve the plot
- **Plot armor**: "barely escaped", "narrowly avoided", "miraculously survived" — escapes without cost

**If deus ex machina patterns found: BLOCK.** Solutions must be set up earlier, not introduced at the moment of need.

### 5. Read-Through Report

\`\`\`markdown
## Reader Experience Report

**Scope**: Chapters [start]–[end] ([N] chapters)
**Read mode**: Sequential, no skipping

### Engagement Curve

| Chapter | Engagement | Page-Turner | Confusion | Belief | Emotional Highlights |
|---------|------------|-------------|-----------|--------|----------------------|
| 1 | 4 | 3 | — | — | "The summons scene — dread built well" |
| 2 | 2 | 1 | "Who is Theron?" | — | — |
| 3 | 5 | 5 | — | — | "The betrayal revelation was shocking" |
| 4 | 3 | 4 | "Why did they go north?" | "Mira wouldn't abandon them" | — |

### Engagement Valleys
- **Chapter 2**: Engagement dropped to 2. Cause: Long exposition section with no scene. Fix: Convert exposition to scene (see \`/kombinat revise\`).

### Confusion Clusters
- **Chapters 2-3**: Multiple confusion points about character "Theron" — introduced in chapter 2 but not grounded until chapter 4. Fix: Add grounding details in chapter 2.

### Belief Breaks
- **Chapter 4**: "Mira wouldn't abandon them" — character action contradicts established personality. Fix: Add motivation for Mira's change (see \`/kombinat revise\`).

### Page-Turner Rhythm
- Chapters 1-3: Good pull → release → pull rhythm
- Chapters 4-6: Sustained high pull — risk of reader fatigue. Consider adding a breathing chapter.

### Carried Questions
- "Who sent the summons?" — introduced chapter 1, answered chapter 3 ✓
- "What is the Trial?" — introduced chapter 1, NOT YET ANSWERED as of chapter 6 ⚠
- "Why did Mira betray them?" — introduced chapter 3, NOT YET ANSWERED ⚠

## Recommendations

1. **Chapter 2**: Convert exposition to scene — engagement drop is due to telling, not showing.
2. **Chapters 2-3**: Add grounding for Theron — reader is confused for too long.
3. **Chapter 4**: Add motivation for Mira's betrayal — current action breaks belief.
4. **Chapters 4-6**: Add a breathing chapter or slow section to prevent reader fatigue.

## Verdict

[Pass: reader experience is strong / Conditional: [N] experience issues to address / Fail: reader experience is broken — major revision needed]
\`\`\`

### 6. Next Steps (Auto-Handoff)

Based on the read-through result, offer to automatically continue. Use the \`question\` tool:
- **Pass**: "Reader experience is strong. The manuscript is ready for final review and publication." — Offer \`/kombinat review\` then \`/kombinat publish\`
- **Conditional**: Offer \`/kombinat revise\` (structural) or \`/kombinat hook-review\` (engagement)
- **Fail**: Offer \`/kombinat revise\` (major revision needed)

If the user selects, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`alpha-reader\` | \`skills/critique/alpha-reader/SKILL.md\` | Structural reader perspective |
| \`beta-reader\` | \`skills/critique/beta-reader/SKILL.md\` | Experience reader perspective |`,
  tools: ["bash"],
  relatedSkills: ["alpha-reader", "beta-reader"],
  examples: [
    { input: "/kombinat read-through", approach: "Sequential read-through of all chapters as a reader" },
    { input: "/kombinat read-through 1-5", approach: "Read-through of chapters 1 through 5" }
  ],
  warnings: ["Read-through is sequential — do not skip chapters, even if you've read them before", "This is reader mode, not editor mode — do NOT flag grammar, style, or line-level issues", "Belief breaks are the most critical finding — a reader who stops believing in the story will put it down"]
}

export default spec