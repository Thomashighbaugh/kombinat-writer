import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "draft",
  description: "Batch drafting by default: draft all planned chapters or up to 6 at a time. XML-structured with pre/post gates and voice check. Use /kombinat draft Chapter N for single-chapter override.",
  reminder: "Phase 7: Batch XML-structured drafting with quality gates (batch-first)",
  phases: "7",
  detailedDescription: `# User Input: {userInput}

## Objective

Produce first-pass drafts using XML-structured intermediate representation. **Batch mode is the default** — draft all planned chapters, or up to 6 at a time, to maximize context window usage and minimize API calls. Single-chapter mode is an explicit override.

## Batch vs Single Mode

| Mode | Trigger | Behaviour | Why |
|------|---------|-----------|-----|
| Batch (DEFAULT) | \`/kombinat draft\` or \`/kombinat draft 3-8\` | Draft all planned chapters, or the specified range, in one session | Saves API calls, leverages context window, maintains cross-chapter flow |
| Single | \`/kombinat draft Chapter 5\` or \`/kombinat draft 5\` | Draft one chapter only | Explicit override for targeted work, revisions, or debugging |

**Batch sizing:** When no range is specified, draft all chapters with status \`[ ]\` (Pending) in \`./book/tasks.md\`, up to 6 at a time. If more than 6 are pending, draft the first 6 and report: "6 of [N] chapters drafted. Run \`/kombinat draft\` again for the next batch."

## Pre-Execution: Load Relevant Lore Context

Before the pre-draft gate, retrieve the most relevant lore context for the chapters being drafted. The full lorebook may be large — only inject what's relevant.

**Run the lore query script:**
\`\`\`bash
bun .opencode/tools/lib/scripts/lore-query.mjs \
  --query "Draft context: [book title] — characters present in chapters [range], world rules, voice profiles, and terminology for drafting chapters [N-M]" \
  --top 5 --rerank
\`\`\`

This uses local Ollama models (pedrohml/mxbai-embed-large + hans-tech/bge-reranker-v2-m3) to find the lore entries most relevant to the chapters being drafted. The output is a formatted markdown block with only the top 5 most relevant lore chunks.

**What it checks:**
- Series lorebook: characters, world, glossary, timeline, threads
- Per-book knowledge: character profiles, voice profiles, locations, world rules

**Why this matters:** The draft's XML tags include \`<characters-present>\`, voice-aware dialogue, world-consistent setting details, and terminology. The lore context directly informs all of these. Without it, the AI drafts in a vacuum.

**Fallback:** If the script produces no output (no lore files or Ollama unavailable), read \`./series/lorebook/\` and \`./book/knowledge/\* manually. The lorebook takes precedence over any conflicting specification or outline details.

## Prerequisites

- \`./book/outline.md\` and \`./book/tasks.md\` must exist
- Track-appropriate: specification (fiction) or research notes (non-fiction)

## Execution Steps

### 1. Resolve Scope

Parse \`{userInput}\`:
- \`/kombinat draft\` → all pending chapters (up to 6)
- \`/kombinat draft 3-8\` → chapters 3 through 8
- \`/kombinat draft Chapter 5\` or \`/kombinat draft 5\` → single chapter (explicit override)
- \`/kombinat draft all\` → all chapters regardless of batch limit (use with caution)

If no chapter specified, read \`./book/tasks.md\` and collect all tasks with status \`[ ]\` (Pending) or \`[/]\` (In Progress). If 0 pending tasks, report: "No pending chapters. Use \`/kombinat draft Chapter N\` to rewrite, or add chapters to the outline."

**Batch window:** Sort pending chapters by number. Take up to 6. Report which chapters are in this batch and how many remain.

### 2. Pre-Draft Gate (HARD BLOCK — once per batch, then incremental per chapter)

Run the pre-draft quality gate. For batch mode, the shared context (constitution, track, specification, outline, knowledge, tracking) is loaded ONCE and verified with evidence. Per-chapter items (previous chapter, drafts, existing chapter) are checked per chapter.

**The 13 required items:**
1. \`./book/constitution.md\` — Creative/intellectual principles
2. \`./book/track.json\` — Track and project metadata
3. \`./book/specification.md\` or \`./book/specification/_main.md\` — Story blueprint (fiction)
4. \`./book/outline.md\` — The chapter's structural context
5. \`./book/knowledge/*\` — All relevant knowledge files
6. \`./book/tracking/*\` — Current state of all tracked entities
7. \`./book/content/chapter_[previous].md\` — Previous chapter for continuity (per-chapter in batch)
8. \`./book/research/sources/*\` — Sources relevant to this chapter (non-fiction)
9. \`./book/revisions/revision-log.md\` — Pending revision notes
10. \`./book/drafts/*\` — Draft material for this chapter
11. \`./book/tasks.md\` — Task status for this chapter
12. \`./book/critique/\` — Critique feedback on adjacent chapters
13. \`./book/content/chapter_[current].md\` — Existing chapter if this is a rewrite

**If any required item is missing, STOP. Report which items are missing and why they block. Do not proceed to drafting.**

Optional items (research-sources, revision-log, drafts, critique-feedback, existing-chapter) produce warnings, not blocks.

Also check: if voice profiles exist (\`./book/knowledge/voice-profiles.json\`), note that voice check will run after each draft. If chapter > 3 and profiles don't exist, block with: "Run \`/kombinat verify voice-init\` to generate voice profiles after chapter 3."

**Outline gate precondition:** The outline must have passed the outline quality gate (\`/kombinat outline\`). If the outline lacks fine-grained scene beats and continuity anchors, block with: "Outline has not passed the quality gate. Run \`/kombinat outline\` to build a fine-grained outline with scene beats, setup/payoff chains, and continuity anchors first." The draft phase depends on the outline's awareness map — a coarse outline makes continuity errors inevitable.

### 3. Batch Drafting Loop

For each chapter in the batch:

#### a) Load Previous Chapter (continuity)
Read the previous chapter's clean prose from \`./book/content/\`. In batch mode, the previous chapter in the batch is the one just drafted — use it directly for continuity.

#### b) Load Chapter Awareness Map (from outline)

Extract this chapter's entry from the outline and load it as the **awareness map**. This is the fine-grained slice that gives the LLM awareness of what came before and what comes after without needing to hold the whole book in active memory. Parse \`./book/outline.md\` (or the relevant shard) for the current chapter's entry.

The awareness map includes:

- **Scene beats** — the goal and conflict for each scene in this chapter. The draft must hit every beat.
- **Pacing tag** — drives the narration register and emotional intensity.
- **Timeline position** — where this chapter sits in the story chronology.
- **Characters present** — who is in this chapter's scenes.
- **Open threads** — plot threads carried into this chapter from earlier.
- **Payoff-from** — earlier setups this chapter must pay off. For each \`payoff-from\` reference, load the referenced chapter's outline entry's \`sets-up\` declaration to confirm what was planted, and check the previous chapter's prose for the plant if the referenced chapter is adjacent.
- **Sets-up** — what this chapter must plant for later chapters to pay off. The draft must include the plant — a prop, a line of dialogue, a revealed fact — even if its payoff is chapters away.
- **Continuity anchors** — key objects, state changes, and carry-forward notes. The draft must respect these: if the outline says "Kira discovers the map", the draft must include that discovery. If it says "carry-forward: Kira now knows Jin is wounded — she will act protective in Ch6", the draft must establish Kira's protective awareness.
- **Adjacent chapter summaries** — load the outline entries for the previous and next chapters (just their scene beats and setup/payoff fields, not full text). This gives the LLM awareness of the surrounding context: what the previous chapter set up that this one should carry, and what the next chapter needs this one to plant.

**If the awareness map is missing or incomplete (e.g., chapter entry not in outline, missing scene beats, missing continuity anchors):** BLOCK with "Chapter N awareness map is incomplete — [field] missing from outline. Run \`/kombinat outline\` to regenerate the outline with a passing quality gate before drafting."

The awareness map replaces the need to load every prior chapter's full text. Instead, the LLM gets:
1. This chapter's scene beats (what to write now)
2. Payoff-from references (what was planted earlier that pays off here)
3. Sets-up declarations (what to plant now for later)
4. Continuity anchors (what state to maintain and establish)
5. Adjacent chapter summaries (surrounding context)

This is a much smaller and more focused context than loading the entire book, and it keeps the details that matter at the forefront.

#### c) XML-Structured Drafting

Write the chapter using XML tags as an intermediate representation. The XML is NOT saved as the chapter file — it's an internal structure for quality verification. Tags are stripped on save.

**Fiction XML structure:**

\`\`\`xml
<chapter number="N" title="[Title]" pacing="[tag]" word-target="[N]">
  <metadata>
    <outline-purpose>[From outline]</outline-purpose>
    <pov>[Character]</pov>
    <setting>[Location, time of day]</setting>
    <time>[Timeline date — from outline awareness map]</time>
    <characters-present>[List — must match outline awareness map]</characters-present>
    <plot-threads-advanced>[List — must include all open-threads from awareness map]</plot-threads-advanced>
  </metadata>

  <awareness-map>
    <payoff-from ref="[Chapter N: description]">[How this draft pays it off]</payoff-from>
    <sets-up ref="[Chapter N: description]">[How this draft plants it]</sets-up>
    <continuity-anchors>
      <anchor name="[object/state]">[How it appears in this draft]</anchor>
    </continuity-anchors>
  </awareness-map>

  <scene number="1" type="[transition|action|dialogue|revelation|resolution]" goal="[Scene goal]" conflict="[Scene conflict]">
    <narration register="[tense|observing|immersive|reflective]" sensory-focus="[senses]">
      [Prose narration]
    </narration>
    <dialogue speaker="[Name]" emotion="[emotion]" subtext="[hidden meaning]">
      [Dialogue text]
    </dialogue>
    <action beat="[Physical action]" significance="[Why it matters]" />
    <interiority character="[Name]" emotion="[emotion]" thought="[Internal thought]" />
    <beatchange from="[emotion]" to="[emotion]" trigger="[What caused the shift]" />
    <sensory-inject type="[sight|sound|smell|touch|taste]">[Sensory detail]</sensory-inject>
  </scene>

  <chapter-notes>
    <word-count>[N]</word-count>
    <tracking-updates>
      <character-state name="[Name]" field="[field]" from="[old]" to="[new]" />
      <plot-thread name="[Name]" status="[advanced|complete|introduced]" />
      <timeline event="[Event]" date="[Date]" />
    </tracking-updates>
    <sources-used>[List, non-fiction]</sources-used>
    <hooks>
      <opening-hook>[Description]</opening-hook>
      <closing-hook>[Description]</closing-hook>
    </hooks>
  </chapter-notes>
</chapter>
\`\`\`

**Non-fiction XML structure:**

\`\`\`xml
<chapter number="N" title="[Title]" word-target="[N]">
  <metadata>
    <outline-purpose>[From outline]</outline-purpose>
    <argument-position>[Thesis position]</argument-position>
    <evidence-density>[high|medium|low]</evidence-density>
    <prerequisite-knowledge>[What reader needs first]</prerequisite-knowledge>
  </metadata>

  <section number="1" type="[foundation|deep-dive|synthesis|application]" claim="[Section claim]">
    <exposition register="[academic-clinical|academic-precise|accessible]">
      [Expository prose]
    </exposition>
    <evidence source-key="[key]" page="[page]" type="[primary|secondary]">
      [Evidence presentation]
    </evidence>
    <citation marker="[Source: key]" style="[apa7|chicago|mla|ieee]" />
    <warrant>[How evidence supports claim]</warrant>
    <counterargument position="[Opposing view]">
      <refutation>[Why the opposition fails]</refutation>
    </counterargument>
    <synthesis>[Section synthesis]</synthesis>
  </section>

  <chapter-notes>
    <word-count>[N]</word-count>
    <sources-used>[List]</sources-used>
    <claims>
      <claim id="[N.M]" text="[Claim]" sources="[keys]" />
    </claims>
    <citations>
      <citation id="[C1]" source="[key]" page="[N]" verified="true" />
    </citations>
    <hook>[Opening hook]</hook>
  </chapter-notes>
</chapter>
\`\`\`

#### c) Write Mode Selection

Based on detected state:
- **Full Draft** (default): No existing chapter → write complete chapter from scratch
- **Expand Draft**: Draft material exists in \`./book/drafts/\` → expand and integrate
- **Rewrite**: Existing chapter needs major rework → replace, preserve tracking
- **Revise**: Revision notes exist → apply specific changes within XML structure
- **Continue Mid-Chapter**: Interrupted session → resume from last sentence (use \`/kombinat resume\` first)

#### d) Post-Draft Gate (HARD BLOCK — per chapter)

After drafting each chapter, run the post-draft quality gate:

1. **XML structure**: <chapter> root, <metadata>, <scene> elements present
2. **Metadata completeness**: outline-purpose, time, characters-present all filled
3. **Awareness map block**: <awareness-map> with <payoff-from>, <sets-up>, and <continuity-anchors> — all must be present and non-empty
4. **Awareness map verification**: 
   - Every \`payoff-from\` declared in the outline for this chapter has a matching <payoff-from> in the XML explaining how the draft pays it off
   - Every \`sets-up\` declared in the outline for this chapter has a matching <sets-up> in the XML explaining how the draft plants it
   - Every continuity anchor in the outline has a matching <anchor> in the XML explaining how it appears in the draft
   - **Missing any required payoff, setup, or anchor: BLOCK.** The draft must honor the outline's awareness map.
5. **Scene quality**: each scene has goal + conflict attributes matching the outline's scene beats
6. **Chapter notes**: <word-count>, <tracking-updates>, <hooks> all present
7. **Tracking updates**: block is not empty — if nothing changed, explain why
8. **Voice check** (if profiles exist): compare against voice-profiles.json
   - Extract all <dialogue speaker="X"> blocks, compare against X's voice profile
   - Extract all <narration register="Y"> blocks, compare against narration voice profile
   - Flag drift: sentence length shift, sensory density shift, register mismatch, contraction change
   - **If voice drift detected: BLOCK. Report specific deviations. Do not save until drift is corrected.**

**If any gate check fails, STOP. Report specific failures with evidence. Do not save until corrected.** In batch mode, this stops the entire batch — fix the failed chapter before continuing.

#### e) Style Sheet Check

Run the style sheet check against the drafted text:
- Check for terminology violations (e.g., "gray" when style sheet says "use 'grey'")
- Check for formatting decisions (e.g., em-dash vs en-dash)
- Check for character voice decisions
- Check for timeline decisions

**If violations found: BLOCK. Report each violation. Do not save until corrected.**

#### f) Prose Quality Scorecard (HARD BLOCK)

Run the prose quality analysis on the drafted XML:
- **Filter word density** (saw, heard, felt, noticed, realized, seemed, appeared, wondered, knew, thought) — block if >3 per 1000 words
- **Adverb density** (-ly words) — block if >2% of words
- **Passive voice** — block if >5% of sentences
- **Info-dump detection** — block if any passage >100 contiguous words of narration without dialogue/action/sensory
- **Tense/POV consistency** — block if mid-chapter drift detected
- **Showing vs telling ratio** — warn if <60% showing
- **Crutch word frequency** — warn if >5 per 1000 words

Produces a scorecard per chapter. Blocking metrics (filter words, adverbs, passive, info-dump, tense/POV) must pass before save. Warning metrics are reported but don't block.

**If any blocking metric fails: STOP. Report the specific failure with count, density, and threshold. Do not save until corrected.**

#### g) Echo & Repetition Detection (HARD BLOCK)

Run echo detection on the drafted text:
- **Word echo** — same significant word appearing 3+ times within 3 sentences — block if >3 significant echoes
- **Crutch word frequency** — AI-typical crutch words (suddenly, somehow, literally, a sense of, began to) — block if any crutch >3 per 1000 words
- **Structural echo** — same sentence-opening pattern repeated 5+ times — warn
- **Beat pattern echo** — same scene beat sequence across multiple scenes — warn

**If blocking echoes detected: STOP. Report the specific words/patterns and their locations. Do not save until corrected.**

#### h) Emotional Beat Arc Check (HARD BLOCK)

Parse the \`<beatchange>\` tags from the XML to construct the emotional trajectory:
- Verify at least one \`<beatchange>\` tag exists per scene — no beat data means no arc analysis
- Check for flat streaks (>3 consecutive same-emotion beats) — warn
- Check for repetitive patterns (same from→to appearing 3+ times) — warn

**If no \`<beatchange>\` tags found: BLOCK. The draft must track emotional shifts for arc analysis.**

#### i) Save

After all gates pass:
1. **Strip XML tags** from the content to produce clean prose
2. Save clean prose to \`./book/content/chapter_[NNNNN].md\`
3. Save XML version to \`./book/drafts/chapter_[NNNNN].xml\`
4. Update \`./book/tracking/\` state files based on <tracking-updates>
5. Update \`./book/tasks.md\` task status to \`[FR]\` (For Review)
6. Save checkpoint to \`./book/checkpoints/chapter-N.json\`

#### j) Update Tracking for Next Chapter

Before drafting the next chapter in the batch, update the tracking state so the next chapter's pre-draft gate sees the latest state. This is critical for batch continuity — character states, plot threads, and timeline must reflect what just happened in the previous chapter.

### 4. Batch Report

After the batch completes (or stops on a gate failure):

\`\`\`markdown
## Batch Draft Report

**Scope**: Chapters [start]–[end] ([N] of [M] requested)
**Gates**: Pre-draft ✓ | Post-draft [N] ✓ | Style sheet [N] ✓ | Prose quality [N] ✓ | Echo [N] ✓ | Beat arc [N] ✓
**Word counts**:
| Chapter | Words | Status |
|---------|-------|--------|
| 3 | 4200 | ✓ Saved |
| 4 | 3800 | ✓ Saved |
| 5 | 4500 | ✗ Filter word density 4.2/1000 — NOT SAVED |

**Prose quality summary**:
| Chapter | Filter | Adverb | Passive | Info-dump | Tense | Status |
|---------|--------|--------|--------|-----------|-------|--------|
| 3 | 2.1/1000 | 1.8% | 3.2% | 0 | ✓ | ✓ Pass |
| 4 | 2.8/1000 | 1.5% | 4.1% | 0 | ✓ | ✓ Pass |
| 5 | 4.2/1000 | 2.3% | 6.0% | 1 | ✓ | ✗ Block |

**Remaining**: [K] chapters still pending. Run \`/kombinat draft\` for the next batch.
\`\`\`

### 5. Next Steps (Auto-Handoff)

After the batch completes, offer to automatically continue. Use the \`question\` tool:

Question: "Batch [complete/stopped]. [N] chapters drafted. Continue?"
Options (adjust based on gate results):
- **Yes — Critique** → Run \`/kombinat critique\` (call hubMenu route for \`critique\`)
- **Yes — Draft next batch** → Run \`/kombinat draft\` again (call hubMenu route for \`draft\`)
- **No — I'll continue later** → Stop

If partial/gate failure, only offer "Draft next batch" and "Stop" — do not offer critique on incomplete batches.
If the user selects, call \`hubMenu\` with \`action: "route"\`, \`hub: "kombinat"\`, \`subcommand: <chosen>\` and execute it immediately.

### 6. Human-in-the-Loop Features

The draft phase integrates these HITL features:

**Phase Preview** (\`src/lib/phase-preview.ts\`): Before drafting begins, show the author what will happen — which chapters, estimated word count, estimated duration, context to load, gates to run. Author confirms before execution.

**Authorial Intent** (\`src/lib/authorial-intent.ts\`): Before the batch, capture the author's intent in 1-2 sentences. If the author types "generic" or leaves blank, a generic intent is used: "Produce the best possible output consistent with the outline and constitution." After drafting, verify the output honors the stated intent.

**Non-Negotiables Gate** (\`src/lib/creative-constraints.ts\`): The draft content is checked against any creative constraints declared at constitution. If a constraint is violated (e.g., "no on-page violence against children" but the draft contains such a scene), the gate blocks and the chapter is NOT saved.

**Provenance Tracking** (\`src/lib/provenance.ts\`): Every line of the drafted chapter is tagged as 'ai-drafted' with timestamp and phase. Provenance sidecar JSON saved alongside the chapter. Display via \`/kombinat review\` or \`/kombinat verify\`.

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`pre-draft-checklist\` | \`skills/quality-assurance/pre-draft-checklist/SKILL.md\` | Checklist reference (now enforced by gate) |
| \`scene-architecture\` | \`skills/fiction/writing-techniques/scene-architecture/SKILL.md\` | Scene framework (fiction) |
| \`dialogue-techniques\` | \`skills/fiction/writing-techniques/dialogue-techniques/SKILL.md\` | Dialogue quality (fiction) |
| \`psychological-interiority\` | \`skills/fiction/writing-techniques/psychological-interiority/SKILL.md\` | Internal reactions (fiction) |
| \`argument-structure\` | \`skills/non-fiction/argument-structure/SKILL.md\` | Evidence presentation (non-fiction) |
| \`academic-writing\` | \`skills/non-fiction/academic-writing/SKILL.md\` | Academic register (non-fiction) |
| \`phase-preview\` | \`src/lib/phase-preview.ts\` | Pre-execution confirmation showing scope/time/changes |
| \`authorial-intent\` | \`src/lib/authorial-intent.ts\` | Authorial intent capture before drafting |
| \`creative-constraints\` | \`src/lib/creative-constraints.ts\` | Non-negotiables gate check |
| \`provenance\` | \`src/lib/provenance.ts\` | Change provenance tracking |`,
  rules: [
    "Whenever the user makes a decision that alters narrative context, metanarrative, formatting, or tracking states, you MUST proactively update the relevant files in ./book/metadata/ and ./book/tracking/ before completing the turn."
  ],
  tools: ["loadSkill", "bash"],
  relatedSkills: ["pre-draft-checklist", "scene-architecture", "dialogue-techniques", "psychological-interiority", "argument-structure", "academic-writing", "phase-preview", "authorial-intent", "creative-constraints", "provenance"],
  examples: [
    { input: "/kombinat draft", approach: "Drafts all pending chapters (up to 6) in one batch with shared context loaded once" },
    { input: "/kombinat draft 3-8", approach: "Drafts chapters 3 through 8 in one batch" },
    { input: "/kombinat draft Chapter 5", approach: "Single-chapter override — drafts only chapter 5" },
    { input: "/kombinat draft all", approach: "Drafts ALL pending chapters regardless of batch limit — use with caution on large manuscripts" }
  ],
  warnings: ["Batch mode is the DEFAULT — single-chapter requires explicit chapter number", "Batch stops on first gate failure — fix the failed chapter before continuing", "Tracking state is updated between chapters in the batch for cross-chapter continuity", "Pre-draft gate runs once for shared context, then per-chapter for previous chapter and existing chapter checks", "Prose quality scorecard runs after post-draft gate — filter words, adverbs, passive, info-dump, tense/POV are hard blocks", "Echo detection runs after prose quality — word echo and crutch words are hard blocks", "Beat arc check verifies <beatchange> tags exist — no beat data means no arc analysis (hard block)"]
}

export default spec