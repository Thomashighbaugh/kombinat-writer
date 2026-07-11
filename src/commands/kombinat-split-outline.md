---
description: "Split ./book/outline.md into per-chapter files (./book/outline/chapter_NN.md + _index.json). Use for disaster recovery or after editing outline.md."
---

Split the canonical book outline into per-chapter files for easy editing and disaster recovery.

## What this does

1. Reads `./book/outline.md` (the single source of truth)
2. Parses chapter/section headings
3. Writes one file per chapter to `./book/outline/chapter_NN.md` (zero-padded)
4. Writes `./book/outline/_index.json` — machine-readable manifest

## When to use

- After running `/kombinat outline` and the gate passed (this should run automatically as part of that phase)
- When per-chapter files are missing or stale (disaster recovery)
- After hand-editing `./book/outline.md` and wanting to refresh the per-chapter cache

## Implementation

Call the splitter library directly:

```typescript
import { splitOutline } from './lib/outline-splitter.js'
const result = await splitOutline(projectRoot, { track: 'fiction', unit: 'chapter' })
console.log(`Wrote ${result.filesWritten.length} files for ${result.chapters} chapters`)
```

Or run it from the command line:

```bash
npx kombinat-writer split-outline
```

## File layout produced

```
./book/
├── outline.md              # canonical single file (NOT touched)
└── outline/
    ├── _index.json         # chapter manifest
    ├── chapter_01.md       # per-chapter file
    ├── chapter_02.md
    └── ...
```

## Rules

- `outline.md` is the source of truth — never overwrite it
- Per-chapter files are a **derivable cache** — they can always be regenerated from `outline.md`
- After splitting, verify with `ls book/outline/` — must show one file per chapter + `_index.json`
- The drafting phase reads `_index.json` to know which file to load for each chapter
