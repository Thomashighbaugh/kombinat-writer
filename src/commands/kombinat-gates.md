---
description: "Run all quality gates immediately and print a summary. Equivalent to pressing `r` in the TUI."
---

Run every quality gate in the project and print a compact summary.

## What this does

1. Loads the project root (cwd)
2. Calls each gate via the kombinat library
3. Prints a table of pass/block/warn counts and a one-line per-gate summary

## When to use

- You want a quick health check without going through the full `/kombinat verify` flow
- You just finished a revision and want to see the new gate state
- The sidebar's "Run All Gates" button is what you want, but you're in the prompt, not the sidebar

## Implementation

The agent calls the kombinat lib directly:

```typescript
import { runGate } from './tools/quality-gates.js'
import { detectState } from './tools/project-state.js'

const state = detectState(projectRoot)
const gates = ['outline', 'pre-draft', 'post-draft', 'revision-verify', 'continuity-check', 'non-negotiables']
for (const id of gates) {
  const r = runGate(id, projectRoot)
  // print r.status, r.blocking, r.warnings
}
```

Or via the **Run All Gates** button in the sidebar.

There is no global keybind. Single-letter bindings would block typing, modifier+letter pairs collide with OpenCode's built-ins, and leader-based bindings require expansion that wasn't worth the complexity. Use the button or the slash command.

## Output format

```
Quality Gates — Chapter 1-15
✓ Outline Gate        PASS
✓ Pre-Draft Gate      PASS
✗ Post-Draft Gate     BLOCK — missing <metadata> in chapter 5
⚠ Continuity Check    WARN — 2 dropped threads
✓ Revision Verify     PASS
✓ Non-Negotiables     PASS

Summary: 4 pass, 1 warn, 1 block
```

## Companion keybind

In the TUI, press `r` (no modifier, no leader) to run the same operation interactively and see results in the sidebar.
