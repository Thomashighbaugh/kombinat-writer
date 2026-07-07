---
name: consistency-checker
description: "Checks for plot holes, character inconsistencies, timeline errors, and constitution violations across written chapters. Use during review or when continuity issues are suspected."
---

# Consistency Checker

Scans written chapters for five categories of continuity failure. Each category has distinct detection patterns and severity thresholds.

## Consistency Categories

### 1. Chronological
- **What to check**: timeline order, elapsed time, date references, seasonal continuity, relative time (e.g., "three days later" matching actual intervening events).
- **Detection**: extract all time markers and verify monotonic progression against the master timeline in the constitution.

### 2. Character Behaviour
- **What to check**: actions matching stated personality, knowledge state (character cannot know what they have not learned), emotional arc consistency, dialogue register matching character profile.
- **Detection**: cross-reference each character action against their constitution entry. Flag mismatches between what the character knows and what they act on.

### 3. World Rules
- **What to check**: magic/technology systems, physical laws, social structures, geographical constraints established in the constitution's world lorebook.
- **Detection**: extract every world-rule invocation (spell cast, device used, social norm referenced) and verify against the rule's stated limitations.

### 4. Plot Causality
- **What to check**: cause-effect chains, Chekhov's-gun setup/payoff, consequence propagation, setup-establishment before payoff.
- **Detection**: map dependencies between plot events. Flag any payoff whose setup occurs later, is missing, or contradicts earlier events.

### 5. Knowledge State
- **What to check**: what each POV character knows at each point, information asymmetry between narrator and character, dramatic irony integrity.
- **Detection**: compare scene-by-scene knowledge inventories against revealed information.

## Severity Classification

| Severity | Definition | Action |
|----------|------------|--------|
| **Critical** | Breaks reader trust, makes story nonsensical | Block until fixed |
| **Major** | Contradicts established canon | Fix before next session |
| **Minor** | Inconsistency explainable with small retcon | Flag for revision |
| **Cosmetic** | Ambiguous enough that most readers miss it | Log in tracking |

## False Positive Awareness

- Characters may behave inconsistently *on purpose* (unreliable narrator, character growth, deception).
- World rules may have intentional exceptions the reader has not yet learned.
- Chronological breaks may be intentional (time jumps, parallel timelines).
- When uncertain, flag with `[CONSISTENCY: suspect]` rather than marking as error.

## Phase 2 Analysis Integration

The consistency checker is supplemented by 9 dedicated Phase 2 analysis libraries that provide deeper, specialized checks:

| Library | Purpose |
|--------|---------|
| `reverse-outline.ts` | Compares draft beats against planned outline — detects drift |
| `character-arc.ts` | Verifies per-character arc completeness (intro→escalation→crisis→transformation→resolution) |
| `qa-accounting.ts` | Tracks narrative questions — answered, unanswered, deliberately unresolved |
| `promise-audit.ts` | Verifies genre/tone/thematic/structural promises are kept |
| `escalation-curve.ts` | Checks stakes escalation from act to act, detects plateaus |
| `cognitive-load.ts` | Per-chapter character/thread/question count — reader load management |
| `knowledge-state.ts` | Character vs reader knowledge matrix — dramatic irony verification |
| `thread-matrix.ts` | Thread tracking matrix — dropped, orphaned, over-concentrated threads |
| `dependency-graph.ts` | Chapter dependency graph from setup/payoff chains — revision impact analysis |

These run during `/kombinat review` and `/kombinat verify`. The consistency checker provides the manual detection methodology; the Phase 2 libraries provide automated, programmatic analysis.
