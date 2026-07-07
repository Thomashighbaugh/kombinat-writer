import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "hook-review",
  description: "Check each chapter's opening and closing hooks: does the first sentence/paragraph grab attention? Does the ending compel the reader to continue? Flag weak openings and closings.",
  reminder: "Per-chapter editorial sub-phase: hook analysis",
  phases: "7-11",
  detailedDescription: `# User Input: {userInput}

## Objective

Analyze every chapter's opening hook (first 1-3 sentences) and closing hook (last 1-3 paragraphs). Strong openings grab attention; strong closings compel the reader to turn the page. Weak openings and closings are flagged for revision.

## Prerequisites

- At least 1 chapter must exist in \`./book/content/\`
- XML versions in \`./book/drafts/\` are useful but not required (metadata contains hooks from draft phase)

## Execution Steps

### 1. Parse Scope

- \`/kombinat hook-review\` → all chapters
- \`/kombinat hook-review 5\` → chapter 5 only
- \`/kombinat hook-review 3-7\` → chapters 3 through 7

### 2. Load Chapter Hooks

For each chapter:
- Read the first 3 paragraphs (opening hook)
- Read the last 3 paragraphs (closing hook)
- If XML version exists, read \`<hooks>\` block from \`<chapter-notes>\`:
  - \`<opening-hook>\` — description from drafting phase
  - \`<closing-hook>\` — description from drafting phase

### 3. Evaluate Opening Hooks

For each chapter's opening, evaluate against these criteria:

**Intrigue**: Does the opening raise a question the reader wants answered? (Not just "what happens next" but "why is this happening?" or "what does this mean?")

**Specificity**: Does the opening use concrete, specific details rather than abstractions? "The knife was cold against her palm" beats "She felt afraid."

**Action vs. exposition**: Does the opening drop the reader into a scene, or does it explain the situation? In medias res is generally stronger than exposition.

**Voice**: Does the opening establish a distinct narrative voice within the first paragraph?

**Grounding**: Does the opening ground the reader in who, where, and when within the first few paragraphs without info-dumping?

**Scoring:**

| Score | Meaning | Action |
|-------|---------|--------|
| Strong | Opening is compelling, specific, and voicey | No change needed |
| Adequate | Opening works but could be stronger | Consider revision |
| Weak | Opening is generic, abstract, or exposition-heavy | Revise — flag for /kombinat revise |
| Missing | No clear hook — chapter starts with no tension or question | Revise — must add hook |

### 4. Evaluate Closing Hooks

For each chapter's closing, evaluate:

**Cliffhanger tension**: Does the ending leave a question unanswered or a situation unresolved that compels the reader to continue?

**Emotional resonance**: Does the ending land on an emotional beat that lingers?

**Turn**: Does the ending introduce a new question, revelation, or complication? (The strongest closings change the reader's understanding of what came before.)

**Resolution vs. openness**: Does the chapter end with too much resolution (reader can stop) or too little (reader feels cheated)? Balance is key.

**Last-line quality**: Is the final sentence memorable, or is it a throwaway?

**Scoring:**

| Score | Meaning | Action |
|-------|---------|--------|
| Strong | Ending compels reader to continue, lands emotional beat | No change needed |
| Adequate | Ending works but doesn't pull the reader forward | Consider revision |
| Weak | Ending is a natural stopping point (reader can put book down) | Revise — add turn or question |
| Missing | Chapter just ends mid-scene or with a whimper | Revise — must add closing hook |

### 5. Book-Level Opening/Closing Strength Audit

In addition to per-chapter hooks, run the book-level opening/closing analysis (\`src/lib/opening-closing.ts\`):

- **Book opening** (first 500 words of chapter 1): First sentence hook score, hook type (in-action, dialogue, short punchy, conventional), paragraph escalation. Score <5 = weak.
- **Book closing** (last 500 words of final chapter): Last sentence resonance score, whether it lands on a resonant word, whether it's short and memorable. Score <5 = weak.
- **Per-chapter scores**: All chapters get opening and closing scores. Weak chapters (<4) flagged.

**Opening hook types:**
- In-action opening (8/10): starts mid-scene with action
- Dialogue opening (7/10): starts with character speech
- Short punchy (8/10): first sentence <20 words, creates curiosity
- Conventional (3/10): "The", "It was", "There was" — article/weather/setting

**If book opening score <5: WARNING.** The first sentence carries disproportionate weight — it's what readers see in previews, samples, and "look inside."

### 6. Hook Review Report

\`\`\`markdown
## Hook Review Report

**Scope**: Chapters [start]–[end] ([N] chapters)

### Opening Hooks

| Chapter | Score | First Line | Issue |
|---------|-------|------------|-------|
| 1 | Strong | "The knife was cold against her palm." | — |
| 2 | Weak | "It was morning in the village." | Generic time-of-day opening, no intrigue |
| 3 | Adequate | "She had been waiting for three days." | Intrigue present but abstract — ground with specific detail |

### Closing Hooks

| Chapter | Score | Last Line | Issue |
|---------|-------|-----------|-------|
| 1 | Strong | "And then the door opened, and she knew everything had changed." | Cliffhanger + revelation |
| 2 | Weak | "She went to sleep." | Natural stopping point — no turn, no question |
| 3 | Missing | "...and they continued walking." | Whimper ending — no hook at all |

### Recommendations

1. **Chapter 2 opening**: Rewrite first paragraph to start in scene — open with the knife, not the time of day. See \`/kombinat revise\`.
2. **Chapter 2 closing**: Add a turn — introduce a new question or complication in the last paragraph. See \`/kombinat revise\`.
3. **Chapter 3 closing**: Needs a complete rewrite of the last paragraph — currently no hook at all.

## Verdict

[Pass: all hooks strong / Conditional: [N] hooks need revision / Fail: [N] hooks missing entirely — mandatory revision]
\`\`\`

### 7. Next Steps

- Pass: "Hooks are strong. Continue with \`/kombinat read-through\` or \`/kombinat pacing-audit\`."
- Conditional: "[N] hooks need work. Address with \`/kombinat revise\` — focus on opening and closing paragraphs."
- Fail: "Multiple chapters missing hooks entirely. Mandatory \`/kombinat revise\` before proceeding."

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`scene-structure\` | \`skills/fiction/writing-techniques/scene-structure/SKILL.md\` | Scene structure for hook placement |
| \`dialogue-techniques\` | \`skills/fiction/writing-techniques/dialogue-techniques/SKILL.md\` | Dialogue as hook |
| \`opening-closing\` | \`src/lib/opening-closing.ts\` | Book-level opening/closing strength audit |`,
  tools: ["bash"],
  relatedSkills: ["scene-structure", "dialogue-techniques", "opening-closing"],
  examples: [
    { input: "/kombinat hook-review", approach: "Reviews opening and closing hooks for all chapters" },
    { input: "/kombinat hook-review 5", approach: "Reviews hooks for chapter 5 only" }
  ],
  warnings: ["Hook review is for fiction — non-fiction chapters use different hook patterns (claim-driven openings, synthesis closings)", "Strong hooks do not mean melodramatic cliffhangers — subtle turns can be just as compelling"]
}

export default spec