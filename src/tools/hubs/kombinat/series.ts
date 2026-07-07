import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "series",
  description: "Series lorebook operations: init (create lorebook), sync (push book knowledge to lorebook), audit (cross-book continuity scan), register (add book), import (convert external lorebooks from SillyTavern/JanitorAI/CharacterAI).",
  reminder: "Series infrastructure — cross-book lorebook and continuity",
  phases: "all",
  detailedDescription: `# User Input: {userInput}

## Objective

Manage series-level infrastructure for multi-book projects. The series lorebook is a cross-book knowledge base that persists characters, world details, glossary terms, timeline events, and plot threads across all books in a series. Supports importing from AI roleplay platforms (SillyTavern, JanitorAI, CharacterAI) to leverage extensively developed world-building.

## Sub-Commands

### \`/kombinat series init\`

Initialize a new series. Creates the series directory structure and lorebook files.

**Process:**
1. Ask for series title and author
2. Generate a series ID (from title slug or user-specified)
3. Create \`./series/\` directory:
   - \`./series/lorebook/characters.md\` — Cross-book character profiles
   - \`./series/lorebook/world.md\` — World-setting, geography, history
   - \`./series/lorebook/glossary.md\` — Terms, names, places, concepts
   - \`./series/lorebook/timeline.json\` — Series-level timeline
   - \`./series/lorebook/threads.md\` — Cross-book plot threads
   - \`./series/meta.json\` — Series metadata (title, author, book count, books list)
4. Link current book to series: update \`./book/track.json\` with \`seriesId\` and \`bookNumber\` (book 1)
5. Register current book in \`./series/meta.json\`
6. Report: "Series '[title]' initialized. This is book 1. The series lorebook is at \`./series/lorebook/\`."

### \`/kombinat series sync\`

Sync knowledge from the current book to the series lorebook. Run this after completing a book or after major knowledge updates.

**Process:**
1. Check series exists. If not: "No series initialized. Run \`/kombinat series init\` first."
2. Sync from \`./book/knowledge/character-profiles.md\` → \`./series/lorebook/characters.md\`:
   - New characters appended with book number tag
   - Existing characters flagged for manual review
3. Sync from \`./book/knowledge/voice-profiles.json\` → note in lorebook (per-book, not copied)
4. Sync from \`./book/tracking/timeline.json\` → \`./series/lorebook/timeline.json\`:
   - New timeline entries added with book number
   - Duplicates skipped
5. Sync from \`./book/style-sheet/terminology.md\` → \`./series/lorebook/glossary.md\`:
   - Terms extracted and added under "Book N Terms" heading
6. Report what was synced: "[N] characters, [M] timeline entries, [K] glossary terms synced from book [bookNumber]."

### \`/kombinat series audit\`

Run a cross-book continuity scan across all books in the series.

**Process:**
1. Check series exists
2. Load \`./series/meta.json\` to find all book paths
3. For each book that has content:
   - Load character profiles, locations, timeline, tracking
4. Run continuity checks:
   - **Character continuity**: Characters in books but not in lorebook; character state consistency across books
   - **Timeline continuity**: Events ordered correctly across books; no date conflicts between books
   - **World consistency**: Locations in books but not in lorebook; world fact contradictions
   - **Glossary consistency**: Conflicting term definitions across books
   - **Plot threads**: Threads introduced in early books but never resolved by the latest book
5. Generate \`./series/continuity-log.md\` with findings
6. Report: "[N] critical, [M] major, [K] minor, [L] observations."

### \`/kombinat series register\`

Register a new book in an existing series. Use this when starting book 2+.

**Process:**
1. Check series exists
2. Ask for book number and title
3. Update \`./series/meta.json\` books array
4. Link current book: update \`./book/track.json\` with \`seriesId\` and \`bookNumber\`
5. Report: "Book [N] '[title]' registered in series '[series title]'. Run \`/kombinat constitute\` and choose 'inherit from series lorebook' to bootstrap the constitution."

### \`/kombinat series status\`

Show series status: books, their status, word counts, lorebook completeness.

**Output:**
\`\`\`markdown
## Series Status: [title]

**Author**: [name]
**Books**: [N]

| # | Title | Status | Words | Chapters |
|---|-------|--------|-------|----------|
| 1 | The Summons | complete | 85,000 | 24 |
| 2 | The Threshold | drafting | 42,000 | 12 |

**Series Lorebook**:
- Characters: [N] profiles
- World: [N] sections
- Glossary: [N] terms
- Timeline: [N] entries
- Threads: [N] active, [M] resolved
\`\`\`

### \`/kombinat series import <format> <path>\`

Import an external lorebook from an AI roleplay platform. These platforms often contain extensively developed world-building, character sheets, and lore entries created through months of interactive experimentation — exactly the kind of deep world knowledge that benefits a book series.

**Supported formats:**

| Format | Platform | What It Contains |
|--------|----------|------------------|
| \`sillytavern\` | SillyTavern | World Info / Lorebook entries with keys, content, selective logic |
| \`janitorai\` | JanitorAI | Character cards with personality, scenario, first_message, system_prompt |
| \`characterai\` | CharacterAI | Character definitions with name, greeting, description, title, definitions |
| \`auto\` | (auto-detect) | Automatically detects format from file content |

**Usage:**
- \`/kombinat series import sillytavern ./my-world-info.json\`
- \`/kombinat series import janitorai ./character-card.json\`
- \`/kombinat series import characterai ./cai-character.json\`
- \`/kombinat series import auto ./exported-lorebook.json\`

**Process:**
1. Check series lorebook exists. If not: "No series initialized. Run \`/kombinat series init\` first."
2. Read the input file
3. Auto-detect format if not specified (or validate specified format)
4. Parse entries using the format-specific parser:
   - **SillyTavern**: Parse \`entries\` object with uid keys. Each entry has \`key\`, \`content\`, \`comment\`. Classify entries as character (personality/appearance indicators), world (long content), glossary (short content), timeline (date patterns), or thread (plot/quest indicators).
   - **JanitorAI**: Parse character card. Extract character from \`name\`, \`personality\`, \`scenario\`, \`first_message\`, \`description\`. Extract world from \`scenario\` if long enough. Extract glossary from \`tags\`.
   - **CharacterAI**: Parse character definition. Extract character from \`name\`, \`description\`, \`greeting\`, \`definitions\`, \`title\`. Extract world from \`description\` if long enough.
5. Write parsed entries to the series lorebook:
   - Characters → \`./series/lorebook/characters.md\` (append with source tag)
   - World entries → \`./series/lorebook/world.md\` (append)
   - Glossary terms → \`./series/lorebook/glossary.md\` (append)
   - Timeline entries → \`./series/lorebook/timeline.json\` (merge, deduplicate)
   - Plot threads → \`./series/lorebook/threads.md\` (append)
6. Tag all imported entries with \`[Imported from <format>]\`
7. Generate import report

**Import options:**
- \`--overwrite\`: Overwrite existing lorebook entries (default: append)
- \`--no-tag\`: Don't tag imported entries with source format
- \`--characters-only\`: Only extract character entries
- \`--world-only\`: Only extract world/setting entries

**Import report format:**

\`\`\`markdown
## Lorebook Import Report

**Requested format**: sillytavern
**Detected format**: sillytavern
**Total entries imported**: 47

### Breakdown
- Characters: 12
- World entries: 18
- Glossary terms: 10
- Timeline entries: 3
- Plot threads: 4

### Warnings
- Character "Theron" already exists in lorebook — skipped
- 2 entries had unparseable content — treated as world entries
\`\`\`

**Important notes:**
- Imported entries are APPENDED to existing lorebook (unless --overwrite)
- All imported entries are tagged with their source platform
- Duplicate detection: entries with the same name/term are skipped (with warning)
- Classification is heuristic — the agent should review imported entries for accuracy
- SillyTavern entries with \`disable: true\` are skipped
- Character sheets from JanitorAI/CharacterAI may contain roleplay-specific formatting (actions in asterisks, etc.) — review and clean up after import

## Execution

For all series sub-commands:
1. Parse the sub-command from user input
2. Execute the corresponding workflow
3. Report results in structured format

## Supplement Skills

| Skill | File | Purpose |
|-------|------|---------|
| \`series-lorebook\` | \`src/lib/series-lorebook.ts\` | Series lorebook engine |
| \`lorebook-import\` | \`src/lib/lorebook-import.ts\` | External format converter |`,
  tools: ["bash"],
  relatedSkills: ["consistency-checker", "forgotten-elements"],
  examples: [
    { input: "/kombinat series init", approach: "Creates series lorebook structure, links current book as book 1" },
    { input: "/kombinat series sync", approach: "Syncs knowledge from current book to series lorebook" },
    { input: "/kombinat series audit", approach: "Runs cross-book continuity scan" },
    { input: "/kombinat series register", approach: "Registers a new book in existing series" },
    { input: "/kombinat series status", approach: "Shows series overview and lorebook completeness" },
    { input: "/kombinat series import sillytavern ./my-world.json", approach: "Imports SillyTavern world info into series lorebook" },
    { input: "/kombinat series import janitorai ./character.json", approach: "Imports JanitorAI character card into series lorebook" },
    { input: "/kombinat series import auto ./export.json", approach: "Auto-detects format and imports into series lorebook" }
  ],
  warnings: ["Series must be initialized before sync/audit/register/import can run", "Series audit critical issues are HARD BLOCKS for series-level publication", "Sync is one-directional (book -> lorebook) — the lorebook is the authoritative cross-book reference", "Imported entries are APPENDED by default — use --overwrite to replace", "Imported entries should be reviewed for accuracy — classification is heuristic"]
}

export default spec