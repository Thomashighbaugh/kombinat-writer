# Kombinat Writer — Professional Book Writing Workflow for OpenCode

**Kombinat Writer** is a professional-grade book writing workflow for OpenCode that guides authors from initial concept to completed, publishable manuscript. It supports fiction, non-fiction, mixed, and series projects through a structured phase system with fine-grained outlining, XML-structured drafting, 25 hard-block quality gates, 8 critique modes, three-pass editing, multi-pass revision, and pandoc-based publishing.

Named after the Old English *kombinat* — the oral poet who composed and recited epic verse, transmitting works like *Beowulf* through craft rather than inscription — Kombinat Writer is a tool for the writer's craft in the age of AI-assisted composition.

---

## Origin

Kombinat Writer is a substantial expansion and re-architecture of [novel-writer-english](https://github.com/JeroTan/novel-writer-english) by JeroTan, which was itself a translation and platform-agnostic adaptation of [novel-writer-skills](https://github.com/wordflowlab/novel-writer-skills) by wordflowlab. See [ATTRIBUTION.md](./ATTRIBUTION.md) for the full chain.

The author's earlier non-agentic project, [Fiction Fabricator](https://github.com/Thomashighbaugh/fiction-fabricator) — a Python CLI for multi-phase novel generation with XML state management, lorebook support, and multi-format export — contributed key concepts that were refined and re-architected for the agentic context. Fiction Fabricator itself drew inspiration from [pulpgen](https://github.com/pulpgen-dev/pulpgen) and the broader AI creative writing ecosystem, including SillyTavern character card formats and lorebook structures from the AI roleplay community.

The shift from non-agentic Python scripts to an agentic workflow design was inspired by the terminal-based agentic coding approach of [Claude Code](https://www.anthropic.com/claude-code) by Anthropic and made possible by [OpenCode](https://github.com/sst/opencode) — the agentic coding platform whose hub-and-skill architecture, slash command system, per-project configuration model, and TypeScript tool loading are the foundation Kombinat Writer runs on.

**What Kombinat Writer adds beyond its antecedents:**

- 25-subcommand workflow with 26 spec files, 40 library files, and 34 skill files
- Fine-grained outline with scene beats, setup/payoff chains, and continuity anchors
- Outline quality gate with 3-cycle revision — blocks drafting if outline is too coarse
- XML-structured drafting with awareness maps — each chapter loads only its outline slice
- 26 hard-block quality gates across 8 categories (outline, pre-draft, post-draft, revision, structural, linguistic, experience, non-negotiables)
- 8 critique modes: alpha, beta, peer, sensitivity, cold-read, comprehensive, adversarial (two-agent dialectic), personas (3-5 reader types)
- Three-pass editing: line-edit (craft) → copy-edit (mechanics) → proofread (typos)
- Multi-pass revision with `--depth full` (structural → language → pacing)
- Per-character and per-narration voice fingerprinting
- Modular style sheets (5 modules: prose, dialogue, description, pacing, POV)
- JSON checkpoint system with content hashing for resume
- Series lorebook infrastructure with cross-book knowledge inheritance
- External lorebook import (SillyTavern, JanitorAI, CharacterAI formats)
- Premise stress-test (6 criteria, hard block) before specification
- Thematic statement (required, hard block) in constitution
- Phase 2 structural analyses: reverse outline, character arc, Q/A accounting, promise audit, escalation curve, subtext, rhythm, purple prose, immersion, trust, cognitive load, knowledge state, opening/closing, cliché detection
- Pandoc integration for production-quality export with fallback generators
- Agentic workflow design (inspired by Claude Code, built on OpenCode) replacing Fiction Fabricator's non-agentic Python CLI model
- 8 human-in-the-loop features: phase preview, authorial intent capture, diff-based approval, suggestion severity tiers, veto system (`|`), feedback memory, non-negotiables (creative constraints), change provenance tracking

---

## Quick Start

```bash
# In your book project directory
npx kombinat-writer
```

The interactive installer will:
1. Ask which track you want (fiction / non-fiction / mixed)
2. Create the project directory structure under `book/`
3. Install commands, skills, templates, tools, and lib files into `.opencode/`
4. Initialize track metadata

After installation, type `/kombinat` in OpenCode to open the workflow menu, or type `/kombinat <subcommand>` for direct dispatch.

---

## The 25-Subcommand Workflow

All functionality is accessed through the `/kombinat` hub command. `/kombinat` with no arguments opens an interactive menu via state detection. `/kombinat <subcommand>` routes directly to the specified phase.

### Phase Subcommands

| # | Subcommand | Purpose | Key Features |
|---|------------|---------|--------------|
| 1 | `constitute` | Establish creative/intellectual principles | Thematic statement (required, hard block), series lorebook inheritance |
| 2 | `specify` | Build story specification | Premise stress-test (6 criteria, hard block) before specification |
| 3 | `clarify` | Resolve specification ambiguities | Consistency checker, forgotten elements scan |
| 4 | `research` | Active research | Sources, annotation, literature review, field notes, interviews |
| 5 | `outline` | Fine-grained chapter structure | Scene beats (min 2/chapter), setup/payoff chains, continuity anchors, quality gate + 3 revision cycles |
| 6 | `task-manager` | Break outline into tracked tasks | Per-chapter sub-status lifecycle |
| 7 | `draft` | Write chapters | Batch-first (up to 6), XML structure, awareness map, prose quality, echo detection, beat arc check |
| 8 | `critique` | Structured critique | 8 modes: alpha, beta, peer, sensitivity, cold-read, comprehensive, adversarial, personas |
| 9 | `revise` | Apply revisions | Batch revision, revision-verify gate, `--depth full` (structural→language→pacing) |
| 10 | `edit` | Line-level editing | Three-pass: line-edit → copy-edit → proofread + linguistic gates (subtext, purple-prose, cliché, rhythm) |
| 11 | `review` | Broad project QA | Continuity scan + 7 Phase 2 structural analyses + 2 visualization outputs |
| 12 | `publish` | Export manuscript | Pandoc integration + post-export verification |

### Utility Subcommands

| Subcommand | Purpose |
|------------|---------|
| `guided` | Automatic state detection — recommends next phase |
| `track` | Unified tracking: character state, plot progress, timeline, sources |
| `timeline` | Chronological consistency verification |
| `meta` | Bibliographic metadata management |
| `cite` | Citation lifecycle (non-fiction): add, format, validate, bibliography |
| `drafter` | Loose draft jumpstart from raw ideas |
| `verify` | On-demand quality gate runner — 25 gates available |
| `resume` | JSON checkpoint resume with file diff |
| `cycle` | Full draft→critique→revise→edit cycle for all chapters |
| `pacing-audit` | Cross-chapter pacing analysis |
| `hook-review` | Opening/closing hook audit + book-level opening/closing strength |
| `read-through` | Full reader experience audit + immersion + trust accounting |
| `series` | Series lorebook operations: init, sync, audit, register, status, import |

---

## Quality Gate System

Kombinat uses **hard-block quality gates** — gates produce evidence-based pass/fail results that block progression on failure. No soft warnings: a gate either passes or stops the workflow with specific evidence.

### 26 Gates Across 8 Categories

| Category | Gates | When Run |
|----------|-------|----------|
| **Outline** | `outline` | Before drafting — checks scene beats (min 2/chapter), setup/payoff bidirectionality, continuity anchors, pacing distribution |
| **Pre-Draft** | `pre-draft` | Before each draft session — 13 context items must be loaded with evidence |
| **Post-Draft** | `post-draft`, `prose-quality`, `echo-detection`, `beat-arc` | After drafting — XML structure, metadata, scenes, tracking, voice, awareness map verification, prose metrics (filter words, adverbs, passive, info-dumps, tense/POV), echo/repetition, beat arc trajectory |
| **Revision** | `revision-verify` | After revision — critique items cross-referenced against revision log |
| **Structural** | `reverse-outline`, `character-arc`, `qa-accounting`, `promise-audit`, `escalation-curve`, `cognitive-load`, `knowledge-state`, `thread-matrix`, `dependency-graph` | During review — Phase 2 deep analyses |
| **Linguistic** | `subtext`, `purple-prose`, `cliche`, `rhythm` | During edit — on-the-nose dialogue, overwriting, clichés, sentence monotony |
| **Experience** | `immersion`, `trust`, `opening-closing`, `continuity`, `style` | During read-through/review — immersion breaks, trust violations, hook strength, cross-chapter contradictions, style sheet compliance |
| **Non-negotiables** | `non-negotiables` | During draft/revise/edit — checks content against author's declared creative constraints (plot, character, tone, content, structure, world) |

### Gate Severity Levels

| Level | Behavior |
|-------|----------|
| **Hard block** | Workflow stops. Evidence cited. Must fix before proceeding. |
| **Warning** | Flagged for review. Does not block progression. |

Prose quality scorecard: 5 hard-block metrics (filter words, adverbs, passive voice, info-dumps, tense/POV drift) + 4 warning metrics (showing/telling, concrete ratio, crutch words, dialogue ratio).

Echo detection: 2 hard-block checks (word echo, crutch words) + 2 warning checks (structural echo, beat echo).

Run `/kombinat verify` to run any gate on demand. Run `/kombinat verify --all` to run all gates.

---

## Track System

| Track | Phase Sequence | Use Case |
|-------|---------------|----------|
| **Fiction** | Constitute → Specify → Clarify → (Research) → Outline (gate) → Tasks → Draft → Critique → Revise → Edit (3-pass) → Review → Read-Through → Publish | Novels, short stories, serials, creative non-fiction |
| **Non-Fiction** | Constitute → Research → (Cite) → Outline → Tasks → Draft → Fact Check → Cite → Revise → Edit (3-pass) → Review → Publish | Academic works, journalism, biography, technical books |
| **Mixed** | Constitute → Specify + Research → Clarify → Outline → Tasks → Draft → Fact Check → Cite → Critique → Revise → Edit → Review → Read-Through → Publish | Creative non-fiction, memoir with research, narrative journalism |
| **Series** | Series Lorebook Init → Constitute (inherit) → Specify → Outline → [per-book cycle] → Series Audit → Sync Lorebook | Multi-book series with shared world/characters |

---

## XML-Structured Drafting

Drafts use internal XML tags for verification. Tags are stripped on save to produce clean prose.

```xml
<chapter number="3" title="The Summons">
<metadata>
  <wordcount>3200</wordcount>
  <pov>Mira</pov>
  <timeline>Day 4, evening</timeline>
  <characters-present>Mira, Theron, Captain Voss</characters-present>
</metadata>

<awareness-map>
  <payoff-from>ch2:Theron's-suspicion, ch1:summons-arrival</payoff-from>
  <sets-up>ch5:betrayal-revelation</sets-up>
  <continuity-anchors>Mira's scar (ch1), Voss's loyalty (ch2)</continuity-anchors>
</awareness-map>

<scene number="1" goal="Mira confronts Theron about his disappearance">
<beatchange emotion="dread" intensity="3" reason="Theron's evasion suggests guilt"/>
...

<tracking>
  <open-threads>summons-origin, Theron's-absence, Voss's-secret</open-threads>
  <resolved-threads>none</resolved-threads>
</tracking>
</chapter>
```

The post-draft gate verifies:
- XML structure completeness (metadata, scenes, tracking)
- Awareness map honored (payoff-from items addressed, sets-up items planted, continuity anchors present)
- Voice profile compliance (per-character + per-narration)
- Style sheet compliance (5 modules)
- Prose quality scorecard (9 metrics)
- Echo detection (4 checks)
- Beat arc trajectory (flat streak detection, cross-chapter arc)

---

## Critique Modes

| Mode | Description |
|------|-------------|
| **alpha** | Structural critique: pacing, plot logic, character arcs, scene necessity, causality |
| **beta** | Experience critique: engagement, comprehension, emotional investment, clarity |
| **peer** | Academic/peer review methodology (non-fiction) |
| **sensitivity** | Sensitivity assessment: representation, stereotypes, harmful tropes |
| **cold-read** | First-impression reader with no context — surfaces confusion points |
| **comprehensive** | All dimensions in a single pass |
| **adversarial** | Two-agent dialectic: defender agent + challenger agent + synthesis agent for blind-spot surfacing |
| **personas** | 3-5 reader types: Genre Fan, Casual Reader, Literary Critic, Subject Expert, Skeptical Reviewer |

---

## Three-Pass Editing

| Pass | Focus | What It Checks |
|------|-------|----------------|
| **line-edit** | Craft | Sentence-level quality, word choice, rhythm, imagery, scene construction, dialogue tags, showing vs telling |
| **copy-edit** | Mechanics | Grammar, punctuation, spelling, consistency (tense, POV, names), formatting, style sheet compliance |
| **proofread** | Typos | Final pass — typos, missing words, doubled words, punctuation errors, formatting glitches |

Linguistic analyses run during editing:
- **Subtext analysis**: on-the-nose dialogue detection
- **Purple prose**: modifier ratio, metaphor density, elevated vocabulary
- **Cliché detection**: 5 phrase categories + 5 genre-trope overuse categories
- **Sentence rhythm**: length distribution, monotony score, consecutive similar-length detection

---

## Phase 2 Structural Analyses

Run during `/kombinat review` — 14 dedicated analysis libraries:

| Analysis | What It Detects |
|----------|----------------|
| **Reverse outline** | Draft vs planned outline comparison — missing beats, added beats, drift |
| **Character arc** | Per-character arc completeness (intro→escalation→crisis→transformation→resolution) |
| **Q/A accounting** | Narrative question tracking — answered, unanswered, deliberately unresolved |
| **Promise audit** | Genre/tone/thematic/structural/mystery/romantic promises kept by book end |
| **Escalation curve** | Stakes escalation from act to act, plateau detection, descending stretches |
| **Subtext analysis** | On-the-nose dialogue detection, surface vs subtext comparison |
| **Sentence rhythm** | Length distribution, monotony score, consecutive similar-length detection |
| **Purple prose** | Modifier ratio, metaphor density, elevated vocabulary, purple passages |
| **Immersion audit** | Anachronisms, authorial intrusion, meta-references, tone shifts, logic breaks |
| **Trust audit** | Coincidences, deus ex machina, stupid-for-plot, plot armor |
| **Cognitive load** | Per-chapter named characters/active threads/open questions tracking |
| **Knowledge state** | Character vs reader knowledge matrix, dramatic irony detection |
| **Opening/closing** | First/last 500 words analysis, hook scoring, resonance scoring |
| **Cliché detection** | Cliché phrases (5 categories), genre-trope overuse (5 genres) |

---

## Series Lorebook Infrastructure

For multi-book series, Kombinat provides a shared knowledge base:

```
book/series/lorebook/
├── characters.md    # Cross-book character profiles
├── glossary.md       # Shared terminology
├── threads.md        # Active plot threads across books
├── timeline.json     # Master timeline (all books)
└── world.md          # World-building canon
```

- `/kombinat series init` — Initialize series lorebook
- `/kombinat series sync` — Sync book-level knowledge to lorebook
- `/kombinat series audit` — Audit lorebook for inconsistencies
- `/kombinat series register` — Register a new book in the series
- `/kombinat series status` — Show series status and per-book progress
- `/kombinat series import` — Import external lorebook (SillyTavern, JanitorAI, CharacterAI)

### Semantic Lore Injection

When generating content (outline, draft, critique, revise, review), Kombinat uses **semantic lore retrieval** to inject only the most relevant lore into the prompt — not the entire lorebook. This keeps the context window focused and reduces token usage.

The retrieval pipeline uses local Ollama models:

1. **Embedding** — `pedrohml/mxbai-embed-large:latest` — Chunks lore files by section (## headings) and embeds each chunk
2. **Vector search** — Cosine similarity between the task query and lore chunks
3. **Reranking** (optional) — `hans-tech/bge-reranker-v2-m3:260522` — Re-scores the top candidates for precision

**Setup:** Pull the required models:
```bash
ollama pull pedrohml/mxbai-embed-large:latest
ollama pull hans-tech/bge-reranker-v2-m3:260522
```

These models run locally — no data leaves your machine. The query script (`lore-query.mjs`) is installed as `.opencode/tools/lib/scripts/lore-query.mjs` and called automatically by the phase workflows.

If Ollama is not running or the models are missing, the system falls back to reading lore files directly — no functionality is lost, only the selective retrieval optimization.

External lorebook import supports:
- **SillyTavern** character cards (PNG embedded JSON, JSON files)
- **JanitorAI** character definitions
- **CharacterAI** character exports
- Heuristic classification of entries into characters, locations, items, concepts

---

## Voice & Style System

### Voice Profiles

Per-character AND per-narration voice fingerprints:

```json
{
  "narration": {
    "register": "literary",
    "sentenceLength": "varied",
    "figurativeDensity": "moderate",
    "sensoryPriority": ["tactile", "auditory", "visual"]
  },
  "characters": {
    "Mira": {
      "register": "blunt",
      "vocabulary": "sparse",
      "speechPattern": "short-declarative",
      "contractions": true
    }
  }
}
```

### Modular Style Sheets

5 separate modules in `book/style-sheet/`:

| Module | What It Covers |
|--------|---------------|
| `prose.md` | Sentence structure, paragraph rhythm, figurative language density |
| `dialogue.md` | Dialogue tags, speech patterns, attribution conventions |
| `description.md` | Sensory emphasis, description density, exposition handling |
| `pacing.md` | Scene length, chapter rhythm, tension/release cycles |
| `pov.md` | POV type, head-hopping rules, narrator distance |

---

## Human-in-the-Loop Features

Kombinat integrates 8 HITL features to keep the author in control of the AI-assisted process:

### Phase Preview

Before any phase executes, the author sees a preview: which chapters will be affected, estimated duration, what context will be loaded, which gates will run. The author confirms before execution.

```
## Phase Preview: DRAFT
Chapters: 3, 4, 5, 6, 7, 8 (6 total)
Estimated duration: ~36 minutes (18000 words)
Gates to run: pre-draft, post-draft, prose-quality, echo-detection, beat-arc, non-negotiables
Confirm to proceed.
```

### Authorial Intent

Before each phase (draft, revise, edit), the author states their intent in 1-2 sentences. If unsure, a generic intent is used: "Produce the best possible output consistent with the outline and constitution." After the phase, the AI verifies the output honors the stated intent.

### Diff-Based Approval

After revise or edit passes, the author sees a structured diff (before/after). Approve line-by-line, reject specific hunks, or accept all. Rejected hunks preserve the original text.

### Suggestion Severity Tiers

All AI suggestions are tiered:

| Tier | Behavior |
|------|----------|
| **must-fix** | Blocks progression (maps to gate failure) |
| **should-consider** | Warning — flagged but not blocking |
| **your-call** | Preference — author's choice |
| **FYI** | Observation — no action needed |

Author controls the filter level — only must-fix shown by default.

### Veto System

The author types `|` to veto any suggestion:
- `|` — silent veto (no explanation required)
- `| keeping this rhythm for effect` — veto with reason

Vetoed suggestions are never re-suggested. Vetoes with reasons feed into feedback memory.

### Feedback Memory

When the author rejects a suggestion with a reason, the reason is logged as an avoidance pattern. The AI checks preferences before making future suggestions and avoids patterns the author has consistently rejected.

### Non-Negotiables (Creative Constraints)

At constitution, the author declares creative elements that must not be changed by any AI pass — the author's red lines:

| Category | Example |
|----------|---------|
| **Plot** | "Mira must die in chapter 12" |
| **Character** | "Theron never lies" |
| **Tone** | "Always melancholic, never hopeful" |
| **Content** | "No on-page violence against children" |
| **Structure** | "Each chapter must end on a turn" |
| **World** | "Magic always has a cost" |

The `non-negotiables` gate checks all content against these constraints during draft, revise, and edit phases. Violations block progression.

### Provenance Tracking

Every line of prose is tagged with its origin:

| Origin | Meaning |
|--------|---------|
| `author` | Written by the author |
| `ai-drafted` | Generated by AI in draft phase |
| `ai-revised` | Revised by AI (approved as-is) |
| `ai-edited` | Edited by AI (approved as-is) |
| `ai-modified` | AI-suggested, modified by author before acceptance |
| `author-revised` | Author revised AI output |

Manuscript-level statistics show the author vs AI percentage, per chapter and aggregate.

---

## Checkpoint System

JSON checkpoints save state after each phase, enabling resume:

```json
{
  "phase": "draft",
  "chapter": 7,
  "batchSize": 6,
  "contentHash": "sha256:...",
  "gates": { "pre-draft": "pass", "post-draft": "pass" },
  "timestamp": "2026-07-07T..."
}
```

`/kombinat resume` loads checkpoint, diffs files against content hash, and reports what changed since the checkpoint was saved.

---

## Project Structure

```
project/
├── .opencode/               # Installed workflow
│   ├── commands/kombinat-router.md  # Hub phase router (direct phase execution)
│   ├── skills/               # 34 SKILL.md files across 5 categories
│   │   ├── quality-assurance/
│   │   ├── critique/
│   │   ├── research/
│   │   ├── fiction/writing-techniques/
│   │   ├── fiction/genre-knowledge/
│   │   └── non-fiction/
│   ├── tools/
│   │   ├── hubs/kombinat/    # 26 subcommand spec files
│   │   └── lib/             # 32 library files
│   └── templates/           # Track + series templates
├── book/                    # All book content
│   ├── track.json           # Track selection: fiction | non-fiction | mixed
│   ├── constitution.md      # Core rules + thematic statement
│   ├── specification.md     # Story spec (with premise stress-test)
│   ├── outline/             # Fine-grained chapter structure
│   ├── content/             # Clean prose (tags stripped)
│   ├── drafts/              # XML-structured drafts (with verification tags)
│   ├── critique/            # Critique artifacts (8 modes)
│   ├── revisions/           # Revision tracking + verify gate results
│   ├── knowledge/           # Character profiles, locations, glossary
│   ├── tracking/            # State tracking JSON
│   ├── style-sheet/         # 5 modular style sheets
│   ├── checkpoints/         # JSON checkpoint state
│   ├── research/            # Sources, bibliography, interviews
│   └── series/lorebook/     # Series lorebook (if series project)
├── memory/                  # Durable reference
└── output/                  # Published exports
```

---

## Batch-First Defaults

All pipeline phases default to batch processing:
- **draft**: All chapters or up to 6 at a time
- **critique**: All chapters with shared context loaded once per batch
- **revise**: All chapters or up to 6
- **edit**: All chapters or up to 6
- **cycle**: Full draft→critique→revise→edit for all chapters

Single-chapter is an explicit override: `/kombinat draft 5` or `/kombinat edit Chapter 3`.

Shared context (constitution, specification, knowledge, tracking, style sheet) is loaded **once per batch**, not per chapter.

---

## Development

```bash
git clone <repo>
cd kombinat-writer
npm install
npx tsc --noEmit    # Type check
node bin/install.mjs test-dir   # Test installation
```

Source structure:
- `src/commands/kombinat-router.md` — Hub phase router (direct `/kombinat-router <phase>`)
- `src/tools/hubs/kombinat/` — 26 subcommand spec files
- `src/lib/` — 32 library files (gates, voice, checkpoints, analyses, etc.)
- `src/skills/` — 34 SKILL.md files across 5 categories
- `src/templates/` — Track templates (fiction, non-fiction, series)
- `bin/install.mjs` — Interactive installer

---

## License

MIT. See [LICENSE](./LICENSE).

---

## Attribution

This project builds upon the work of multiple antecedent projects:

- **wordflowlab** — [novel-writer-skills](https://github.com/wordflowlab/novel-writer-skills) (MIT) — original Chinese-language methodology and skill architecture
- **JeroTan** — [novel-writer-english](https://github.com/JeroTan/novel-writer-english) (MIT) — English translation and eight-step fiction workflow
- **Thomas Highbaugh** — [Fiction Fabricator](https://github.com/Thomashighbaugh/fiction-fabricator) (MIT) — the author's earlier non-agentic AI novel generator; contributed multi-phase generation, XML state management, lorebook system, and export concepts that were refined for the agentic context
- **pulpgen-dev** — [pulpgen](https://github.com/pulpgen-dev/pulpgen) (MIT) — AI novel drafting agent that inspired Fiction Fabricator's multi-phase approach and patch-based state tracking
- **OpenCode team** — [OpenCode](https://github.com/sst/opencode) — the agentic coding platform whose hub-and-skill architecture, slash command system, and per-project configuration model are the foundation Kombinat Writer runs on
- **Anthropic** — [Claude Code](https://www.anthropic.com/claude-code) — terminal-based agentic coding approach that inspired the shift from non-agentic Python scripts to an agentic workflow design

See [ATTRIBUTION.md](./ATTRIBUTION.md) for the full attribution chain and a detailed accounting of what Kombinat Writer adds.