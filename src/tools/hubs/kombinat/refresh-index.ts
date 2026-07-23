import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "refresh-index",
  description: "Rebuild the semantic lore index from current lorebook/knowledge/outline/draft files. Use after adding or substantially changing lore content, or to recover from an Ollama/model issue.",
  reminder: "Utility: Rebuild the on-disk semantic lore index",
  phases: "utility",
  detailedDescription: `# User Input: {userInput}

## Objective

Rebuild the on-disk semantic lore index used by the lore-query.mjs script during outline, draft, critique, revise, and review phases. The index lives at:

  \`./.opencode/cache/lore-index/index.json\`

The index is built incrementally: re-running on an up-to-date index is a no-op (no embeddings fetched). When lore files change, only the changed files are re-chunked and re-embedded.

## When to Use

- After importing a new lorebook (SillyTavern/JanitorAI/CharacterAI JSON via \`/kombinat manifest\`)
- After substantial edits to \`./series/lorebook/*\` or \`./book/knowledge/*\`
- After adding new chapters to \`./book/drafts/\` (so the new chapter is available for semantic retrieval)
- After upgrading the embed model or changing Ollama model names
- To recover from a corrupted or accidentally-deleted index
- After running \`npx kombinat-refresh\` if it reported an index-build failure

You do NOT need to run this on every \`/kombinat\` invocation — \`lore-query.mjs\` falls back to on-the-fly embedding when no index exists. The index exists to make queries fast (one embedding fetch per query, not per chunk).

## Execution Steps

### 1. Run the index build

The simplest way to refresh the index from inside OpenCode is to call the index CLI:

\`\`\`bash
npx kombinat-index
\`\`\`

Or, equivalently, the lore-query script's \`--build\` flag:

\`\`\`bash
bun .opencode/tools/lib/scripts/lore-query.mjs --build
\`\`\`

Both delegate to the same underlying logic in \`src/lib/index-builder.mjs\`.

### 2. Verify the build

After the build completes, confirm the index is fresh:

\`\`\`bash
bun .opencode/tools/lib/scripts/lore-query.mjs --status
\`\`\`

Expected output: a list of source files and chunk counts, the embed model version, and how long ago the index was built.

### 3. If the build fails

The most common failure is Ollama being unreachable or the embed model being missing. Verify:

\`\`\`bash
# Is Ollama running?
curl http://127.0.0.1:11434/api/tags

# Are the required models pulled?
ollama pull pedrohml/mxbai-embed-large:latest
ollama pull hans-tech/bge-reranker-v2-m3:260522
\`\`\`

If the embed model is unavailable, \`lore-query.mjs\` will still work — it falls back to re-embedding on the fly (slower) and to reading the full lore files (slowest). The index is an optimization, not a requirement.

## What Gets Indexed

The index scans:

- \`./series/lorebook/*\` — characters, world, glossary, timeline, threads
- \`./series/outline.md\` — Cross-book condensed outline
- \`./book/knowledge/*\` — character-profiles, voice-profiles, locations, world-rules, character-voices
- \`./book/manifest.md\` — Project canon (highest priority)
- \`./book/specification.md\` — Book specification
- \`./book/outline.md\` and \`./book/outline/chapter_*.md\` — Whole-book + per-chapter outline
- \`./book/drafts/chapter_*.xml\` — Drafted chapters (chunked by scene + awareness-map + metadata)

Each \`book/drafts/chapter_*.xml\` file is chunked by the XML chunker, which understands the chapter's \`<metadata>\`, \`<awareness-map>\`, and per-\`<scene>\` structure. Lore, outline, and canon files are chunked by markdown heading.

## Models Used

- **Embedding:** \`pedrohml/mxbai-embed-large:latest\` (set \`EMBED_MODEL\` env var to override)
- **Reranking (optional):** \`hans-tech/bge-reranker-v2-m3:260522\` (set \`RERANK_MODEL\` env var to override)

Both run locally via Ollama — no network calls, no telemetry.

## Related Commands

- \`/kombinat outline\`, \`/kombinat draft\`, \`/kombinat critique\`, \`/kombinat revise\`, \`/kombinat review\` — All use the index for semantic lore retrieval
- \`npx kombinat-refresh\` — Idempotent plugin sync; rebuilds the index automatically when source files have changed
- \`/kombinat manifest\` — Import a lorebook; should be followed by \`/kombinat refresh-index\`
`,
}

export default spec
