import { HubSubcommandSpec } from "../../hub-data.js"

const spec: HubSubcommandSpec = {
  label: "refresh",
  description: "Idempotent plugin sync — refresh skills, tools, commands, templates, the sidebar bundle, and the lore index from the current kombinat-writer source. Preserves your locally-modified files (HTML-comment override workflow).",
  reminder: "Utility: Sync the kombinat-writer plugin in this project",
  phases: "utility",
  // Shell-delegated: the router runs this command in a shell instead of
  // interpreting detailedDescription as a subagent workflow.
  command: "npx kombinat-refresh",
  detailedDescription: `# /kombinat refresh — Plugin Sync

This is a **plugin maintenance** command, not a writing phase. The router
detects the \`command\` field and shells out to it. You do not need to
interpret this \`detailedDescription\` as instructions for you to follow.

## What It Does

Runs \`npx kombinat-refresh\` in the project root. That command:

1. Reads the prior install manifest at \`./opencode/.kombinat-install-manifest.json\`
2. Diffs the current \`kombinat-writer\` source against what was last installed
3. Copies changed/new plugin-owned files (skills, tools, commands, templates, sidebar)
4. **Always** rebuilds the TypeScript-derived sidebar bundle (\`npm run build:sidebar\`)
5. **Always** rebuilds the lore index (incrementally — only re-embeds chunks whose source files have changed)
6. Re-registers the sidebar plugin in \`tui.json\`, \`opencode.jsonc\`, and \`package.json\` (additive only)
7. Re-writes the manifest with new commit SHA, timestamp, and per-file SHA256

## What It Preserves

- Your locally-modified plugin files (HTML-comment overrides) — detected by per-file SHA256 diff against the manifest
- All project-owned paths: \`book/\`, \`memory/\`, \`output/\`, \`series/\`, \`.opencode/state/\`, \`.opencode/cache/\` (except \`cache/lore-index/\`)
- Your index: \`./opencode/cache/lore-index/index.json\` is rebuilt, not deleted

## Flags

The \`npx kombinat-refresh\` command accepts flags. Pass them after \`refresh\`:

| Flag | Effect |
|------|--------|
| (none) | Default: sync changed files, preserve local edits, rebuild sidebar + index |
| \`--prune\` | Also remove files that vanished from source |
| \`--force\` | Overwrite locally-modified files (destructive) |
| \`--skip-build\` | Skip the sidebar TypeScript build (faster iteration) |
| \`--skip-index\` | Skip the lore index rebuild |
| \`--track <fiction\|non-fiction\|mixed>\` | Track to use for skills/templates (default: fiction) |

## When to Use

- After \`git pull\` (or any update) on the \`kombinat-writer\` source
- When you see "kombinat-writer" warnings or missing features in the TUI
- After adding or substantially editing lorebook/knowledge/outline/draft content (the index gets a partial refresh automatically; use \`refresh-index\` for index-only)
- Before starting a new writing session if it's been a while

## Exit Codes

- \`0\` — success, no drift detected
- \`1\` — success, but locally-modified files were preserved (drift detected; review the \`locallyModified[]\` list in the output)
- \`2\` — refresh failed
`,
}

export default spec
