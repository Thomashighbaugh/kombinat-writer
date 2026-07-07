import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "pacing-audit",
  description: "Analyze pacing distribution across all chapters: scene density, dialogue-to-prose ratio, action-to-reflection ratio, word count distribution. Identify saggy or rushed sections.",
  reminder: "Per-chapter editorial sub-phase: pacing analysis",
  phases: "7-11",
  detailedDescription: `# User Input: {userInput}

## Objective

Analyze the pacing of the entire manuscript (or a chapter range) and identify sections that are saggy (too slow), rushed (too fast), or unevenly balanced. Pacing audit looks at structural rhythm, not prose quality.

## Prerequisites

- At least 3 chapters must exist in \`./book/content/\`
- \`./book/outline.md\` should exist (for pacing tag comparison)

## Execution Steps

### 1. Parse Scope

- \`/kombinat pacing-audit\` → all chapters
- \`/kombinat pacing-audit 5-10\` → chapters 5 through 10
- \`/kombinat pacing-audit all\` → all chapters

### 2. Load Chapters and XML Versions

For each chapter in scope:
- Read \`./book/content/chapter_NNNNN.md\` (clean prose)
- Read \`./book/drafts/chapter_NNNNN.xml\` (if available — for scene-level analysis)
- Read outline pacing tags for each chapter

### 3. Compute Pacing Metrics

For each chapter, compute:

**Word count**: Total words.

**Scene count**: Number of scenes (from XML \`<scene>\` tags, or estimated from scene breaks in markdown).

**Average scene length**: Word count / scene count.

**Dialogue-to-prose ratio**: Percentage of text that is dialogue (from \`<dialogue>\` tags, or estimated from quoted text in markdown).

**Action-to-reflection ratio**: Action beats (\`<action>\` tags) vs. interiority (\`<interiority>\` tags) or narrative reflection. High action = fast pacing; high reflection = slow pacing.

**Sentence length distribution**: Average sentence length, variation (standard deviation). High variation = dynamic pacing; low variation = monotonous.

**Scene type distribution**: From XML \`<scene type="...">\` attributes:
- \`action\` / \`dialogue\` → fast
- \`transition\` / \`revelation\` → medium
- \`resolution\` → slow

**Pacing tag match**: Does the chapter's actual pacing match the outline's assigned pacing tag? (e.g., outline says "fast" but chapter has 70% reflection)

### 4. Cross-Chapter Analysis

Compute across all chapters:

**Word count distribution**: Are chapters consistently sized, or are there outliers (very short or very long chapters)?

**Pacing rhythm**: Plot the pacing score per chapter. A good manuscript has variation — fast chapters followed by slower ones for breathing room. Identify:
- **Saggy streaks**: 3+ consecutive slow chapters
- **Rushed streaks**: 3+ consecutive fast chapters with no breathing room
- **Plateaus**: 5+ chapters with identical pacing scores
- **Jarring transitions**: Chapter N is very slow, chapter N+1 is very fast (or vice versa) with no narrative bridge

**Scene balance**: Does the manuscript have too many dialogue scenes with no action, or too much action with no reflection?

### 5. Pacing Report

\`\`\`markdown
## Pacing Audit Report

**Scope**: Chapters [start]–[end] ([N] chapters)
**Total word count**: [N] words
**Average chapter length**: [N] words

### Per-Chapter Pacing

| Chapter | Words | Scenes | Avg Scene | Dialogue% | Action% | Reflection% | Pacing Tag | Match |
|---------|-------|--------|-----------|-----------|---------|-------------|------------|-------|
| 1 | 3200 | 4 | 800 | 40% | 30% | 30% | fast | ✓ |
| 2 | 2800 | 3 | 933 | 35% | 20% | 45% | medium | ✓ |
| 3 | 4500 | 6 | 750 | 55% | 10% | 35% | slow | ✗ TOO FAST |

### Cross-Chapter Issues

#### Saggy Streaks
- **Chapters 7-9**: All slow pacing (reflection > 50%). Consider adding action beats or compressing reflection.

#### Rushed Streaks
- **Chapters 12-14**: All fast pacing (action > 60%, dialogue > 50%). Reader fatigue risk — add a breathing chapter.

#### Pacing Tag Mismatches
- **Chapter 3**: Outline says "slow" but chapter has 55% dialogue. Revise to add reflection or update outline tag.

#### Plateaus
- **Chapters 5-9**: All medium pacing with identical scene counts. Vary the rhythm.

### Recommendations

1. [Specific recommendation based on findings]
2. [Specific recommendation]

## Verdict

[Pass: pacing is well-distributed / Conditional: [N] issues to address / Fail: serious pacing problems — consider restructuring]
\`\`\`

### 6. Next Steps

- Pass: "Pacing is well-distributed. Continue with \`/kombinat hook-review\` or \`/kombinat read-through\`."
- Conditional: "Pacing has [N] issues. Address with \`/kombinat revise\` (structural changes) or \`/kombinat edit\` (rhythm adjustments)."
- Fail: "Serious pacing problems detected. Recommend \`/kombinat outline\` to restructure chapter pacing tags before revising."

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`scene-structure\` | \`skills/fiction/writing-techniques/scene-structure/SKILL.md\` | Scene framework for pacing analysis |`,
  tools: ["bash"],
  relatedSkills: ["scene-structure"],
  examples: [
    { input: "/kombinat pacing-audit", approach: "Analyzes pacing across all chapters" },
    { input: "/kombinat pacing-audit 5-10", approach: "Analyzes pacing for chapters 5 through 10" }
  ],
  warnings: ["Pacing audit requires at least 3 chapters to compute meaningful cross-chapter patterns", "XML versions in ./book/drafts/ provide more accurate scene-level analysis — without them, scene counts are estimated from markdown"]
}

export default spec