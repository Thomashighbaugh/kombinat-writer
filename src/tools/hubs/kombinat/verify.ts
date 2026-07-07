import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "verify",
  description: "Run quality gates independently: voice-init (generate voice profiles from existing chapters), voice-check (check drift against profiles), continuity (cross-chapter scan), style (style sheet enforcement), gates (run any single gate on demand).",
  reminder: "On-demand quality gate runner — voice profiles, continuity, style, gate checks",
  phases: "7-11",
  detailedDescription: `# User Input: {userInput}

## Objective

Run quality gates independently of the drafting pipeline. Use this when you want to:
- Initialize voice profiles from existing chapters
- Check voice drift on a drafted chapter
- Run a continuity scan across chapters
- Enforce style sheet on a chapter
- Run any specific gate on demand

## Sub-Commands

### \`/kombinat verify voice-init\`

Generate voice profiles from existing chapters.

**Prerequisites:**
- At least 3 chapters must exist in \`./book/content/\` (need enough data to fingerprint)
- XML versions should exist in \`./book/drafts/\` (for accurate extraction)

**Process:**
1. Read all chapters and their XML versions
2. For each character that appears in dialogue:
   - Extract all \`<dialogue speaker="X">\` blocks across all chapters
   - Generate fingerprint: speech pattern, dialogue length, emotional range, verbal tics, register, subtext frequency, contractions, sentence openers, sample lines
3. For narration:
   - Extract all \`<narration register="Y">\` blocks across all chapters
   - Generate fingerprint: register, sentence length distribution, sensory density, dialogue-to-prose ratio, emotional register, common patterns, atmosphere, sample passages
4. Save to \`./book/knowledge/voice-profiles.json\`
5. Report: "[N] character profiles and [1] narration profile generated from [M] chapters."

**When to use:**
- After chapter 3 is drafted (first time)
- After major revisions that change character voices
- After adding new characters with significant dialogue

### \`/kombinat verify voice-check [chapter]\`

Check voice drift on a specific chapter against existing voice profiles.

**Prerequisites:**
- Voice profiles must exist (\`./book/knowledge/voice-profiles.json\`)
- Target chapter must exist with XML version in \`./book/drafts/\`

**Process:**
1. Load voice profiles
2. Read target chapter's XML version
3. For each \`<dialogue speaker="X">\` block:
   - Compare against X's voice profile
   - Check: sentence length, contraction rate, register, emotional range, verbal tics
4. For each \`<narration register="Y">\` block:
   - Compare against narration voice profile
5. Report drift indicators:
   - Sentence length shift > 30%: flag
   - Contraction rate change > 20%: flag
   - Register mismatch: flag
   - New verbal tics not in profile: flag
   - Missing established tics: flag

**Output:**
\`\`\`markdown
## Voice Check Report: Chapter [N]

### Character: [Name]
| Metric | Profile | Chapter | Drift | Status |
|--------|---------|---------|-------|--------|
| Avg sentence length | 12 words | 18 words | +50% | ⚠ DRIFT |
| Contraction rate | 40% | 25% | -15% | ⚠ DRIFT |
| Register | informal | formal | mismatch | ⚠ DRIFT |

### Narration
| Metric | Profile | Chapter | Drift | Status |
|--------|---------|---------|-------|--------|
| Sensory density | 3.2/sentence | 3.1/sentence | -3% | ✓ OK |
| Dialogue ratio | 30% | 35% | +5% | ✓ OK |

**Result**: [N] drift indicators found. [Pass/Fail]
\`\`\`

### \`/kombinat verify continuity [range]\`

Run continuity scan across a range of chapters (or all chapters if no range specified).

**Process:** Same as the continuity check in the review phase — character state, timeline, plot threads, location, relationships, objects, knowledge, voice.

**Output:** Continuity scan report with contradictions (hard block), forgotten threads (warning), voice drift (warning).

### \`/kombinat verify style [chapter]\`

Run style sheet enforcement on a specific chapter.

**Process:** Same as the style sheet check in the edit phase — checks all 5 modules (terminology, character-voices, formatting, timeline, emotional-register) against the chapter text.

**Output:** Style violation report with module, decision, violation, and location for each violation.

### \`/kombinat verify gates [gate-name] [chapter]\`

Run a specific quality gate on demand:

| Gate Name | What It Checks |
|-----------|----------------|
| \`outline\` | Fine-grained scene beats, setup/payoff chains, continuity anchors |
| \`pre-draft\` | All 13 context items loaded with evidence |
| \`post-draft\` | XML structure, metadata, scenes, tracking, voice, awareness map |
| \`prose-quality\` | Filter words, adverbs, passive voice, info-dumps, tense/POV drift |
| \`echo-detection\` | Word echo, structural echo, beat echo, crutch word frequency |
| \`beat-arc\` | Emotional beat trajectory from <beatchange> tags — flat/repetitive arcs |
| \`revision-verify\` | Critique items cross-referenced against revision log |
| \`continuity\` | Cross-chapter contradictions |
| \`style\` | Style sheet violations |
| \`subtext\` | On-the-nose dialogue detection |
| \`purple-prose\` | Overwriting, excessive modifiers, metaphor overload |
| \`cliche\` | Clichéd phrases and genre-trope overuse |
| \`rhythm\` | Sentence length variety, monotony detection |
| \`immersion\` | Anachronisms, authorial intrusion, meta-references, logic breaks |
| \`trust\` | Coincidences, deus ex machina, plot armor, stupid-for-plot |
| \`reverse-outline\` | Draft vs planned outline comparison — missing/added beats |
| \`thread-matrix\` | Plot thread tracking matrix — dropped/orphaned/over-concentrated |
| \`dependency-graph\` | Chapter dependency graph from outline setup/payoff chains |
| \`character-arc\` | Per-character arc completeness (intro→escalation→crisis→transformation→resolution) |
| \`qa-accounting\` | Narrative question tracking — unanswered questions flagged |
| \`promise-audit\` | Genre/tone/thematic promises kept by book end |
| \`escalation-curve\` | Stakes escalation from act to act, plateau detection |
| \`cognitive-load\` | Per-chapter character/thread/question count |
| \`knowledge-state\` | Who knows what when — dramatic irony, knowledge violations |
| \`opening-closing\` | Book-level first/last 500 words strength audit |
| \`non-negotiables\` | Creative constraints (author's red lines) — plot, character, tone, content, structure, world |

**Usage:**
- \`/kombinat verify gates pre-draft Chapter 5\` — run pre-draft gate for chapter 5
- \`/kombinat verify gates post-draft Chapter 3\` — run post-draft gate on chapter 3's XML
- \`/kombinat verify gates prose-quality Chapter 3\` — run prose quality scorecard on chapter 3
- \`/kombinat verify gates echo-detection Chapter 3\` — run echo detection on chapter 3
- \`/kombinat verify gates beat-arc Chapter 3\` — run beat arc analysis on chapter 3
- \`/kombinat verify gates revision-verify 1\` — run revision-verify gate on critique round 1
- \`/kombinat verify gates thread-matrix\` — generate thread tracking matrix
- \`/kombinat verify gates dependency-graph\` — generate chapter dependency graph

## Execution

For all verify sub-commands:
1. Parse the sub-command from user input
2. Load the relevant library (voice-profile, quality-gates, style-sheet, checkpoints)
3. Run the check
4. Report results in structured format
5. Do NOT modify any files unless explicitly requested (voice-init generates profiles, but other checks are read-only)

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`pre-draft-checklist\` | \`skills/quality-assurance/pre-draft-checklist/SKILL.md\` | Pre-draft context verification |
| \`consistency-checker\` | \`skills/quality-assurance/consistency-checker/SKILL.md\` | Cross-chapter consistency |
| \`forgotten-elements\` | \`skills/quality-assurance/forgotten-elements/SKILL.md\` | Dropped thread/element detection |
| \`style-enforcer\` | \`skills/quality-assurance/style-enforcer/SKILL.md\` | Style sheet enforcement |
| \`fact-checker\` | \`skills/quality-assurance/fact-checker/SKILL.md\` | Factual accuracy (non-fiction) |
| \`citation-validator\` | \`skills/quality-assurance/citation-validator/SKILL.md\` | Citation verification (non-fiction) |
| \`voice-profile\` | \`src/lib/voice-profile.ts\` | Voice fingerprinting engine |
| \`quality-gates\` | \`src/lib/quality-gates.ts\` | Gate runner |
| \`style-sheet\` | \`src/lib/style-sheet.ts\` | Style sheet enforcement |
| \`checkpoints\` | \`src/lib/checkpoints.ts\` | Checkpoint system |
| \`prose-quality\` | \`src/lib/prose-quality.ts\` | Prose quality scorecard |
| \`echo-detection\` | \`src/lib/echo-detection.ts\` | Echo & repetition detection |
| \`beat-arc\` | \`src/lib/beat-arc.ts\` | Emotional beat arc tracking |
| \`thread-matrix\` | \`src/lib/thread-matrix.ts\` | Thread tracking matrix |
| \`dependency-graph\` | \`src/lib/dependency-graph.ts\` | Chapter dependency graph |
| \`subtext-analysis\` | \`src/lib/subtext-analysis.ts\` | On-the-nose dialogue detection |
| \`purple-prose\` | \`src/lib/purple-prose.ts\` | Overwriting detection |
| \`cliche-detection\` | \`src/lib/cliche-detection.ts\` | Cliché and trope overuse |
| \`sentence-rhythm\` | \`src/lib/sentence-rhythm.ts\` | Sentence length variety |
| \`immersion-audit\` | \`src/lib/immersion-audit.ts\` | Immersion break detection |
| \`trust-audit\` | \`src/lib/trust-audit.ts\` | Trust accounting (convenience/deus ex machina) |
| \`reverse-outline\` | \`src/lib/reverse-outline.ts\` | Draft vs planned outline comparison |
| \`character-arc\` | \`src/lib/character-arc.ts\` | Character arc verification |
| \`qa-accounting\` | \`src/lib/qa-accounting.ts\` | Question/answer tracking |
| \`promise-audit\` | \`src/lib/promise-audit.ts\` | Promise keeping audit |
| \`escalation-curve\` | \`src/lib/escalation-curve.ts\` | Escalation curve verification |
| \`cognitive-load\` | \`src/lib/cognitive-load.ts\` | Cognitive load management |
| \`knowledge-state\` | \`src/lib/knowledge-state.ts\` | Knowledge state matrix |
| \`opening-closing\` | \`src/lib/opening-closing.ts\` | Book opening/closing strength |
| \`creative-constraints\` | \`src/lib/creative-constraints.ts\` | Non-negotiables gate check |
| \`diff-approval\` | \`src/lib/diff-approval.ts\` | Diff-based approval gates |
| \`authorial-intent\` | \`src/lib/authorial-intent.ts\` | Authorial intent capture and verification |
| \`severity-tiers\` | \`src/lib/severity-tiers.ts\` | Suggestion severity tiers |
| \`veto-system\` | \`src/lib/veto-system.ts\` | Veto system (\`|\` key) |
| \`feedback-memory\` | \`src/lib/feedback-memory.ts\` | Rejection reason memory |
| \`provenance\` | \`src/lib/provenance.ts\` | Change provenance tracking |
| \`phase-preview\` | \`src/lib/phase-preview.ts\` | Phase pre-execution confirmation |`,
  tools: ["bash"],
  relatedSkills: ["pre-draft-checklist", "consistency-checker", "forgotten-elements", "style-enforcer", "fact-checker", "citation-validator"],
  examples: [
    { input: "/kombinat verify voice-init", approach: "Generates voice profiles from all existing chapters" },
    { input: "/kombinat verify voice-check Chapter 5", approach: "Checks voice drift on chapter 5 against profiles" },
    { input: "/kombinat verify continuity all", approach: "Runs continuity scan across all chapters" },
    { input: "/kombinat verify style Chapter 3", approach: "Runs style sheet enforcement on chapter 3" }
  ],
  warnings: ["Voice-init requires at least 3 chapters to generate meaningful profiles", "Verify commands are read-only (except voice-init which generates profiles)", "Voice-check requires XML version in ./book/drafts/ for accurate extraction"]
}

export default spec