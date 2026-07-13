import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "review",
  description: "Broad project QA with automated continuity scan across all chapters. Modes: framework, content, final, factual. Continuity gate hard-blocks on contradictions.",
  reminder: "Phase 11: Quality gate before publication with continuity scan",
  phases: "11",
  detailedDescription: `# User Input: {userInput}

## Objective

Assess the project's overall health before marking chapters complete or proceeding to publication. Review is the final quality gate before the publish phase. **Includes an automated continuity scan across all chapters that hard-blocks on contradictions.**

## Step 0 (REQUIRED) — Generate Visualizations First

Before running any review mode, the visualization dataset must be regenerated and current. The pacing curve, thread matrix, cognitive load, and escalation data inform the review's findings.

1. Import the \`buildVizDataset\` function from \`./lib/viz-aggregator.ts\`
2. Call it with the project root: \`buildVizDataset(projectRoot)\`
3. Save to \`./book/visualizations/dataset.json\`
4. Verify the dataset is fresh (within 5 minutes) and non-empty
5. Report: "Visualization dataset regenerated: [N] chapters, [M] threads, [K] cognitive load points."

**Do not proceed with framework, content, final, or factual analysis until the viz dataset is current.** The pacing curve reveals sagging chapters the prose-level review would miss; the thread matrix reveals dropped/orphaned threads; the cognitive load chart reveals overloaded chapters.

## Review Modes

| Mode | When to Use | Scope |
|------|-------------|-------|
| Framework | Before writing begins | Validates constitution, specification, outline, tracking structure |
| Content | During/after drafting | Validates written chapters against all reference documents |
| Final | Before publish | Full project audit: all content, tracking, citations, metadata |
| Factual (non-fiction) | Before publish | Validates all factual claims against sources |

## Execution Steps

### 0. Visualization Pre-Generation (HARD BLOCK)

Run step 0 above. Abort with clear error if \`buildVizDataset\` throws or the dataset is stale.

### 0a. Load Relevant Lore Context

Before running any review mode, retrieve the most relevant lore context for this review:

\`\`\`bash
bun .opencode/tools/lib/scripts/lore-query.mjs \
  --query "Review context for [book title] — continuity scan across all chapters, checking character profiles, world rules, timeline, glossary, and plot threads for consistency" \
  --top 5 --rerank
\`\`\`

This retrieves the lore most relevant to continuity checking. If unavailable, read \`./series/lorebook/\` and \`./book/knowledge/\* manually.

### 1. Framework Analysis

If no chapters are written yet, run **Framework Analysis**:

- Constitution completeness and internal consistency
- Specification clarity (no unresolved \`[Needs Clarification]\` markers)
- Outline coherence (pacing distribution, arc completeness)
- Knowledge file quality (character profiles, world-setting, source notes)
- Tracking structure initialised correctly
- Voice profiles exist (if chapter > 3, \`./book/knowledge/voice-profiles.json\` should exist)
- Style sheet modules exist (\`./book/style-sheet/\`)

### 2. Content Analysis

If chapters exist, run **Content Analysis**:

For each written chapter, check against:
- **Constitution**: Does the chapter respect the quality baseline and style principles?
- **Specification**: Does the chapter follow the blueprint? Are established character voices, world rules, and plot constraints respected?
- **Outline**: Does the chapter match its assigned pacing tag and purpose?
- **Knowledge**: Are characters consistent with their profiles? Are locations accurate?
- **Tracking**: Are character states, plot progress, timeline events, and relationships updated correctly?
- **Style sheet**: Are all style sheet decisions respected? (terminology, formatting, character voices, timeline, emotional register)
- **Non-fiction**: Are all claims sourced? Are citations correctly formatted? Is the argument progression sound?

### 3. Automated Continuity Scan (HARD BLOCK)

Run the continuity check gate across all chapters. This is an automated cross-chapter scan that hard-blocks on contradictions.

**What the scan checks:**

1. **Character state continuity**: A character's state in chapter N+1 must be consistent with their state at the end of chapter N. Example: if character X is "injured" at end of chapter 3, they can't be "running" at start of chapter 4 without explanation.

2. **Timeline continuity**: Events must occur in chronological order. If chapter 3 is "Spring 1247" and chapter 4 is "Winter 1246", that's a contradiction unless it's an explicit flashback.

3. **Plot thread tracking**: Every plot thread introduced must be either:
   - Advanced in a later chapter, or
   - Explicitly marked as "dormant" in the tracking files
   - **Dormant threads with no mention for 5+ chapters: flag as "forgotten thread"**

4. **Location continuity**: Characters present in location A at end of chapter N must travel to location B before appearing there in chapter N+1 (unless time skip is explicit).

5. **Relationship continuity**: Relationship states (allies, enemies, romantic) must evolve consistently. A sudden shift from "enemies" to "allies" without narrative explanation is a contradiction.

6. **Object/prop continuity**: Important objects (weapons, keys, documents) must be tracked. If a character loses their sword in chapter 3, they can't have it in chapter 5 without recovery.

7. **Knowledge continuity**: Characters should not know things they haven't learned yet. If a secret is revealed in chapter 6, characters can't reference it in chapter 4 (unless non-linear timeline).

8. **Voice continuity**: Character dialogue should remain consistent with voice profiles. Run voice drift check across all chapters.

**Continuity scan report:**

\`\`\`markdown
## Continuity Scan Report

### Contradictions (HARD BLOCK)
| # | Type | Chapters | Contradiction | Evidence |
|---|------|----------|---------------|----------|
| 1 | Character state | 3→4 | X is injured at end of 3, running at start of 4 | Ch3: "X clutched their wound"; Ch4: "X sprinted" |

### Forgotten Threads (Warning)
| # | Thread | Introduced | Last mentioned | Chapters dormant |
|---|--------|------------|----------------|-----------------|
| 1 | The missing heir | Ch2 | Ch5 | 6 chapters |

### Voice Drift (Warning)
| # | Character | Chapters | Drift indicator |
|---|-----------|----------|-----------------|
| 1 | X | 3, 7 | Sentence length increased 40% in ch7 |

**Gate Result**: FAIL — [N] contradictions must be resolved before publication.
\`\`\`

**If contradictions found: BLOCK. Report all contradictions with evidence. Do not proceed to publication until resolved.** Forgotten threads and voice drift are warnings, not blocks.

### 3b. Structural Analyses (HARD BLOCK)

Run the following cross-chapter structural analyses:

1. **Reverse outline comparison** — for each chapter, generate an outline of what was actually written and compare to the planned outline. Flag missing beats (hard block) and added beats (warning). Uses \`src/lib/reverse-outline.ts\`.

2. **Character arc verification** — per-character check that each arc has introduction, escalation, crisis, transformation, resolution. Incomplete arcs with 2+ stages are flagged. Uses \`src/lib/character-arc.ts\`.

3. **Question/answer accounting** — track every narrative question (mystery, goal, implicit) through to resolution. Unanswered questions are flagged. Uses \`src/lib/qa-accounting.ts\`.

4. **Promise keeping audit** — verify genre, tone, structural, and thematic promises declared in the constitution and opening chapter are fulfilled by the book's end. Broken promises block. Uses \`src/lib/promise-audit.ts\`.

5. **Escalation curve verification** — verify stakes/intensity increase from act to act. Plateaus (3+ chapters at same intensity) and descending stretches are flagged. Uses \`src/lib/escalation-curve.ts\`.

6. **Cognitive load analysis** — per-chapter count of active named characters, plot threads, and open questions. Chapters exceeding thresholds (7 chars, 5 threads, 3 questions) are flagged. Uses \`src/lib/cognitive-load.ts\`.

7. **Knowledge state matrix** — per-chapter tracking of what each character knows vs. what the reader knows. Detects dramatic irony opportunities and knowledge violations. Uses \`src/lib/knowledge-state.ts\`.

**If any structural analysis produces a hard block (missing beats, broken promises, knowledge violations): STOP. Report specific failures.**

### 3c. Structural Visualization Outputs

Generate the following visualization outputs alongside the review report:

1. **Thread tracking matrix** — tabular view of plot threads across chapters (\`src/lib/thread-matrix.ts\`). Save to \`./book/review/thread-matrix.md\`.
2. **Chapter dependency graph** — directed graph of setup→payoff dependencies (\`src/lib/dependency-graph.ts\`). Save to \`./book/review/dependency-graph.md\`.

These visualizations reveal gaps, over-concentration, dropped threads, and revision impact at a glance.

### 4. Factual Verification (Non-Fiction Only)

For non-fiction and mixed tracks, run a separate factual verification pass:
- Identify all factual claims in each chapter
- Cross-reference against source notes
- Flag unsupported claims as \`[CitationNeeded]\`
- Flag contradictory sources as \`[Disputed]\`

### 5. Final Readiness Assessment

When the user requests a final review:

Checklist:
1. All tasks marked \`[X]\` (Done) or \`[ED]\` (Edited)
2. All \`[CitationNeeded]\` markers resolved
3. All tracking files up to date
4. No \`[Needs Clarification]\` markers remain in specification
5. Constitution followed throughout
6. Knowledge files comprehensive and consistent
7. Critical/Critique feedback addressed in revision log
8. Metadata recorded (\`./book/meta.json\`)
9. All chapters present and sequentially numbered
10. Word count meets target range
11. **Continuity scan passed** (no contradictions)
12. **Voice profiles up to date** (drift checked across all chapters)
13. **Style sheet enforced** (no violations in any chapter)

### 6. Review Report

Produce a structured report:

\`\`\`markdown
# Review Report

**Mode**: [Framework / Content / Final / Factual]
**Date**: [date]

## Summary
[Overall assessment: Pass / Conditional / Fail]

## Continuity Scan
- Contradictions: [N] (HARD BLOCK if > 0)
- Forgotten threads: [M] (warning)
- Voice drift: [K] (warning)

## Issues Found
| ID | Severity | Chapter | Issue | Recommendation |
|----|----------|---------|-------|----------------|
| 1 | Major | 3 | [Issue] | [Action] |

## Recommendations
- [Action item 1]
- [Action item 2]

## Verdict
[Pass: proceed to next phase / Conditional: address issues first / Fail: restructure needed]
\`\`\`

### 7. Next Steps (Auto-Handoff)

Based on the review verdict, offer to automatically continue. Use the \`question\` tool:

Question varies by verdict:
- **Pass**: "Review passed. Continuity scan clean. Continue to publishing?"
  - **Yes — Publish** → Run \`/kombinat publish\` (call hubMenu route)
  - **No — I'll continue later** → Stop
- **Conditional**: "Review identified [N] items to address. Continue?"
  - **Yes — Edit** (line fixes) → Run \`/kombinat edit\` (call hubMenu route)
  - **Yes — Revise** (substantive) → Run \`/kombinat revise\` (call hubMenu route)
  - **No — I'll review the items first** → Stop
- **Fail**: "Review failed. [N] continuity contradictions must be resolved. Continue?"
  - **Yes — Revise** → Run \`/kombinat revise\` (call hubMenu route)
  - **No — I'll address these manually** → Stop

If the user selects, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`consistency-checker\` | \`skills/quality-assurance/consistency-checker/SKILL.md\` | Cross-chapter consistency |
| \`forgotten-elements\` | \`skills/quality-assurance/forgotten-elements/SKILL.md\` | Dropped threads detection |
| \`fact-checker\` | \`skills/quality-assurance/fact-checker/SKILL.md\` | Factual verification (non-fiction) |
| \`citation-validator\` | \`skills/quality-assurance/citation-validator/SKILL.md\` | Citation correctness (non-fiction) |
| \`style-enforcer\` | \`skills/quality-assurance/style-enforcer/SKILL.md\` | Style consistency |
| \`reverse-outline\` | \`src/lib/reverse-outline.ts\` | Draft vs planned outline comparison |
| \`character-arc\` | \`src/lib/character-arc.ts\` | Character arc completeness verification |
| \`qa-accounting\` | \`src/lib/qa-accounting.ts\` | Question/answer tracking |
| \`promise-audit\` | \`src/lib/promise-audit.ts\` | Promise keeping audit |
| \`escalation-curve\` | \`src/lib/escalation-curve.ts\` | Escalation curve verification |
| \`cognitive-load\` | \`src/lib/cognitive-load.ts\` | Cognitive load management |
| \`knowledge-state\` | \`src/lib/knowledge-state.ts\` | Knowledge state matrix |
| \`thread-matrix\` | \`src/lib/thread-matrix.ts\` | Thread tracking matrix |
| \`dependency-graph\` | \`src/lib/dependency-graph.ts\` | Chapter dependency graph |`,
  tools: ["loadSkill", "bash"],
  relatedSkills: ["consistency-checker", "forgotten-elements", "fact-checker", "citation-validator", "style-enforcer"],
  examples: [{ input: "/kombinat review final", approach: "Runs final readiness assessment with continuity scan before publication" }],
  warnings: ["Continuity scan is a HARD BLOCK — contradictions between chapters (character state, timeline, plot threads, location, relationships, objects, knowledge, voice) must be resolved before publication", "Forgotten threads (dormant for 5+ chapters) and voice drift are warnings, not blocks"]
}

export default spec