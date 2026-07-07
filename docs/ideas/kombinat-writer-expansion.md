# Kombinat Writer — Expansion Plan

## Problem Statement
How might we expand Kombinat Writer's pipeline so that each phase produces measurably better output, quality is enforced at every transition, and the system handles the realities of long-form AI-assisted writing — voice drift, continuity breaks, context loss, and unverified revisions — while delivering a full publication suite with series support?

## Recommended Direction

Build in three layers, each layer making the previous one better:

### Layer 1: Verified Quality Pipeline (Foundation)
The pipeline enforces quality at every phase transition. No phase can be skipped without explicit override. Every checklist item is verified, not just checked off. The critique→revise loop becomes a verified cycle. Voice drift is detected automatically. Context persists across sessions via checkpoints.

**New subcommands:**
- `/kombinat verify` — Run quality gate for current phase (prerequisites, output completeness, continuity)
- `/kombinat resume` — Load checkpoint, reconstruct context efficiently for mid-chapter continuation

**Enhanced existing phases:**
- `draft` — Pre-draft gate verifies all 13 context items loaded (produces evidence, not just "checked"). Post-draft gate verifies tracking updated, chapter meets outline purpose. Voice check against voice profile (generated after chapter 3).
- `critique` — Adds verification that critique items are specific enough to be actionable (not "this could be better" but "paragraph 3, the motivation is unclear")
- `revise` — Adds revision verification: cross-reference critique items against revision log, report unaddressed critical/major items, block progression if critical items remain
- `edit` — Checks against style sheet (living document of every style/terminology decision)
- `review` — Runs automated continuity scan (character states, timeline, plot threads, terminology) across all chapters

**New artifacts:**
- `./book/knowledge/voice-profile.md` — Generated after chapter 3, maintained as chapters are added. Captures: sentence length distribution, dialogue-to-prose ratio, sensory detail density, character-specific speech patterns, emotional register.
- `./book/style-sheet.md` — Living document. Every phase that makes a style or continuity decision appends to it. Edit phase checks against it. Review validates it.
- `./book/checkpoints/chapter-N.json` — Context state after each chapter. Records what was loaded, what changed, what needs to be loaded next time.

### Layer 2: Per-Chapter Editorial Cycle + Real Publishing
After infrastructure setup, each chapter goes through its own complete editorial cycle. Publishing uses real pandoc integration. New quality sub-phases add professional editorial depth.

**New subcommands:**
- `/kombinat cycle Chapter N` — Runs full editorial cycle for one chapter: draft → critique → revise → edit → continuity-check → mark done
- `/kombinat pacing-audit` — Analyze pacing distribution across all chapters, identify saggy sections
- `/kombinat hook-review` — Check each chapter's opening/closing hooks
- `/kombinat read-through` — Full read-through as a reader (not editor), flag confusion/engagement drops

**Enhanced `publish` phase:**
- Detect and integrate with pandoc (the universal document converter)
- `publish-config.json` — format preferences, cover image, metadata, pandoc options
- Actual EPUB 3 / DOCX / LaTeX / PDF / HTML output via pandoc
- Post-export verification (EPUB validates, DOCX opens, file sizes reasonable)
- Fallback: manual generation if pandoc not available (with warning)

**Enhanced task tracking:**
- Per-chapter status: each chapter has its own `draft → critique → revise → edit → done` lifecycle
- `tasks.md` gains per-chapter sub-status, not just global phase status

### Layer 3: Series Infrastructure
Multi-book support. Knowledge bases that persist across books. Series-level tracking.

**New structure:**
- `./series/bible/` — Cross-book knowledge base (character profiles, world-setting, glossary)
- `./series/timeline.json` — Series-level timeline spanning all books
- `track.json` gains `seriesId` and `bookNumber` fields
- `constitute` for book 2+ offers "inherit from series bible" option

## Key Assumptions to Validate
- [ ] The agent can produce **evidence-based verification** (not just "checked" but "here's what I found"). Test: run a draft gate and see if it reports specific findings or just says "all good."
- [ ] Voice profile comparison actually catches drift. Test: deliberately write chapter 5 in a different voice and see if the check flags it.
- [ ] Checkpoint/resume actually saves context loading time. Test: resume chapter 10 and measure how many files are loaded vs. cold start.
- [ ] Pandoc is available or installable on the target system. Test: `which pandoc` on the user's machine.

## MVP Scope (Layer 1 only)
- Voice profile generation after chapter 3
- Pre-draft gate with evidence-based verification
- Post-draft gate (tracking updated, outline purpose met, voice check)
- Revision verification (critique items cross-referenced against revision log)
- Style sheet as living document
- Checkpoint/resume system
- `verify` and `resume` subcommands
- Enhanced `review` with automated continuity scan

## Not Doing (Yet)
- Per-chapter editorial cycles (Layer 2 — needs task tracking restructure first)
- Real export tooling (Layer 2 — needs pandoc availability check first)
- Series bible (Layer 3 — needs at least one complete book to validate the pattern)
- ML-based voice fingerprinting (the voice profile is structured text, not embeddings)
- Multi-author support
- Cover generation
- Market analysis
- Distribution pipeline integration (KDP, Draft2Digital, etc.)

## Open Questions
- Should the voice profile be per-character (each character has their own voice fingerprint) or per-book (one voice profile for the narration)?
- Should the checkpoint system save to JSON (structured, programmatic) or markdown (human-readable, editable)?
- Should quality gates block progression (hard gate) or warn and allow override (soft gate with logged override)?
- Should the style sheet be a single file or split by category (terminology, character voices, formatting, timeline decisions)?