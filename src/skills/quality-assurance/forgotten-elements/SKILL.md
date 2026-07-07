---
name: forgotten-elements
description: "Identifies dropped plot threads, forgotten characters, unresolved mysteries, and abandoned subplots. Use during review to catch elements that were set up but never paid off."
---

# Forgotten Elements

Tracks narrative elements through their lifecycle — from introduction through development to payoff. Flags any element that was set up but never resolved.

## Element Lifecycle

Every narrative element passes through four stages:

1. **Setup** — the element is introduced (character appears, question raised, object described, Chekhov's gun noted)
2. **Checkov's Gun** — the element is conspicuously featured, creating an expectation of future relevance
3. **Development** — the element is used, explored, or complicated
4. **Payoff** — the element reaches its conclusion or purpose is revealed

An element is **forgotten** if it reaches setup or Chekhov's-gun stage but never progresses to development or payoff.

## Scan Patterns

### Named Characters Disappearing
Compare character appearance logs against chapter indices. Flag any named character who appears in 3+ consecutive chapters then vanishes for 5+ chapters without explanation.

### Plot Questions Unanswered
Extract every explicit or implicit question posed by the narrative (raised by characters, narrator, or dramatic situation). Verify each has a corresponding answer or deliberate non-answer later in the text.

### Items & MacGuffins
Track every physical object that receives narrative emphasis (described in detail, given a name, carried by a POV character). Verify each has a purpose or resolution.

### Subplot Threads
Identify narrative threads that diverge from the main plot. Verify each subplot has a resolution scene or is explicitly abandoned as a structural choice.

## Severity by Element Type

| Element Type | Severity if Forgotten | Rationale |
|--------------|----------------------|-----------|
| Main plot thread | Critical | Structural failure |
| Named character with POV | Major | Reader investment betrayed |
| Chekhov's gun object | Major | Expectation violated |
| Minor character | Minor | Noticeable but recoverable |
| Thematic motif | Cosmetic | Only pattern-sensitive readers notice |

## Recovery Strategies

- **Weave back in**: give the forgotten element a role in an existing upcoming scene
- **Cut explicitly**: acknowledge the thread ends (character exits, question abandoned, item lost) — resolution does not require success
- **Elevate to payoff**: make the forgotten element the focus of a future chapter
- **Track as intentional**: if the element is a long-burn setup, flag it as pending in tracking data with expected payoff location

## Automated Detection

The `thread-matrix.ts` library (run during `/kombinat review` and `/kombinat verify`) provides automated thread tracking:
- **Matrix structure**: rows = threads, columns = chapters — each cell shows activity level
- **Dropped threads**: introduced then no activity for 5+ chapters
- **Orphaned threads**: set up with `sets-up` in outline but never paid off
- **Over-concentrated threads**: 3+ threads active in a single chapter — cognitive load risk

The manual scan patterns above remain valuable for nuanced detection the automated system may miss (e.g., a thread that technically appears but contributes nothing meaningful).
