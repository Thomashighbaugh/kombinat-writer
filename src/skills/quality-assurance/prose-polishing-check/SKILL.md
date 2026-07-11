---
name: prose-polishing-check
description: "Prose polishing audit for line-level craft, rhythm, sound, and AI-slop detection. Use after revisions are complete and before the final report. Catches sentence-level issues that survive structural revisions."
---

# Prose Polishing Check

A final-pass audit focused on the sentence level. The critique and revision phases handle structure, plot, character, and argument. This skill audits the prose itself — the words on the page, their sound, rhythm, and whether the writing still carries AI-generated slop patterns after revision.

## When to Run

After revisions pass the 95% structural bar. **Not** during critique or revise — those phases have their own scope. This runs only after structural work is complete, to give the prose a final polish before the user is informed the cycle is done.

## Categories

### 1. Sentence Rhythm
- **Variation**: mix of long, medium, short sentences. No three consecutive same-length sentences.
- **Opening variety**: sentence starters vary. No three consecutive sentences starting with the same word or same grammatical structure.
- **Periodic vs cumulative**: vary sentence architecture. Not every sentence should be a one-line punch closer.
- **Detection**: scan for anaphora (3+ consecutive same-word openings), uniform sentence length clusters, and over-reliance on short punchy closers.

### 2. Sound & Texture
- **Alliteration**: spot-check for accidental tongue-twisters (3+ same-initial words in a row) that may be unintentional.
- **Hard consonant clusters**: long strings of hard consonants slow the reader. Look for "str-", "thr-", "scr-" clusters within sentences and ensure they earn their place.
- **Euphony vs cacophony**: each passage should match the mood. Tension scenes may want harder sounds; calm scenes softer.
- **Detection**: read aloud mentally. Flag any sentence where the sound fights the meaning.

### 3. AI-Slop Audit (residual)
Even after critique flagged slop and revision removed it, do a final sweep. AI patterns that survive revisions:
- **Ozone/tang/crackle** sensory slop — should be eliminated in critique, verify it's gone
- **Gemstone eyes / animal smiles** — verify gone
- **"Not X. Not X the way Y expected."** — verify gone
- **"It wasn't just X. It was Y."** binary escalation — verify gone
- **"Something shifted in [their] expression"** — verify gone
- **Hollow emotional beats** ("didn't have to" closers) — verify gone
- **Adverbial dialogue tags** ("said angrily") — verify gone
- **Generic body horror clichés** (copper taste, shiver down spine) — verify gone

If any Tier 1 slop survives revision, it must be removed before the cycle is reported as complete.

### 4. Word Choice
- **Specific over generic**: "the man" → "the lamplighter", "she felt sad" → physical manifestation.
- **Active over passive**: where voice permits.
- **Concrete over abstract**: "the weight of grief" → specific image that conveys grief.
- **Telling vs showing**: flag any remaining "she was angry" / "he was sad" without supporting image or action.

### 5. Punctuation
- **Em-dashes**: use sparingly. More than 2 per paragraph signals rhythm crutch.
- **Semicolons**: check usage. A semicolon between two independent clauses should be a real relationship, not a pause-for-effect.
- **Ellipses**: count. More than 2 per chapter signals dramatic hesitation overuse.
- **Exclamation points**: in prose, almost never. Flag every one for review.

## Output Format

The skill produces a per-chapter report:

```markdown
## Chapter [N]: Prose Polishing Report

**Polish score**: [0-100]

| Category | Issues | Severity |
|----------|--------|----------|
| Sentence rhythm | [N] | [Minor/Major] |
| Sound & texture | [N] | [Minor/Major] |
| AI-slop residual | [N] | [Critical/Major] |
| Word choice | [N] | [Minor] |
| Punctuation | [N] | [Minor] |

**Blockers** (must fix before cycle is complete):
- [List of Critical/Major issues with location]

**Suggestions** (consider):
- [List of Minor issues]

**If polish score ≥ 95**: chapter passes.
**If polish score < 95**: list specific failures and required fixes.
```

## Polish Score Calculation

```
polish_score = 100
  - (critical_issues × 10)        # Each unsuppressed slop hit = -10
  - (major_issues × 3)            # Each rhythm/word choice issue = -3
  - (minor_issues × 0.5)          # Each minor = -0.5
  - max(0, score)                 # Floor at 0
```

A chapter needs **≥ 95** to pass. Below 95, the cycle is not complete. Apply the suggested fixes and re-run.

## Cycle Gate

After polishing, the cycle is only complete when:
1. Structural revision score ≥ 95
2. Continuity check passes
3. Prose polish score ≥ 95
4. No Tier 1 AI-slop survives

Until all four are true, do **not** report back to the user. The user only hears from you when the work is genuinely ready.
