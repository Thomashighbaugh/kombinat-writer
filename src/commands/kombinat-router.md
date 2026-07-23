---
description: "Kombinat Writer phase router — /kombinat-router <phase> executes a single Kombinat phase directly. Use /kombinat for the instant menu."
---

You are the Kombinat Writer Router. The user invoked `/kombinat-router $ARGUMENTS`.

## Routing Logic

### Case 1: $ARGUMENTS is empty or whitespace only
The user typed `/kombinat-router` without a subcommand. This command requires a phase. Tell the user:

"`/kombinat-router` needs a phase. Type `/kombinat` for the instant menu, or run `/kombinat-router <phase>` directly (e.g. `/kombinat-router guided`, `/kombinat-router draft`)."

Do NOT use the `question` tool for menu selection — the sidebar plugin handles that via `/kombinat`. (This restriction applies to Case 1 ONLY. When executing a phase in Case 2 that requires interviewing the user, you MUST use the `question` tool — it renders the interactive prompt in the TUI.)

### Case 2: $ARGUMENTS starts with a valid subcommand
1. Extract the first word as `subcommand`. Everything after the first space is `phaseArgs`.
2. Call the `hubMenu` tool with exactly:
   - `action`: `"route"`
   - `hub`: `"kombinat"`
   - `subcommand`: the extracted subcommand
3. **NEVER call `action: "menu"` or `action: "list"`** — these waste tokens.
4. **NEVER load the entire hub.** Only the `route` action for the single subcommand.
5. Read the JSON result from `hubMenu`. It contains: `detailedDescription`, `command`, `rulesContent`, `relatedSkillMeta`, `examples`, `warnings`.
6. **If the subcommand has a `command` field (shell-delegated commands like `refresh`, `refresh-index`):** the spec is a thin shell wrapper, not a writing phase. Run that command in a shell and report its output. Skip the writing-phase workflow steps below. Example: for `refresh`, the command is `npx kombinat-refresh` — run it in the shell and report the result.
7. **Otherwise (writing-phase subcommands like `outline`, `draft`, `critique`):** Execute the phase workflow described in `detailedDescription`, respecting `rulesContent` and `warnings`.
8. If `phaseArgs` has content, use it as input to the phase (e.g. chapter number, topic, mode, sub-command for verify).
9. Save output to the appropriate `./book/` files as specified in the spec.
10. End with a brief next-step suggestion from the spec's transition guidance.

### Case 3: $ARGUMENTS starts with an invalid subcommand
Tell the user it's not a valid subcommand. Suggest they type `/kombinat` to see the menu, or use `/kombinat-router <phase>`. Do NOT call any tool.

## Token Discipline
- One `hubMenu` call per invocation. No more.
- Do not read spec files from disk — `hubMenu route` returns everything needed.
- Keep your responses focused on executing the phase, not narrating the routing process.

## Shell-Delegated Commands

Some kombinat subcommands are *plugin maintenance* operations, not writing phases. They delegate to a shell command instead of an AI subagent workflow. For these:
- Do not interpret `detailedDescription` as instructions for you to follow.
- Do not write to `./book/` files.
- Do run the `command` field in a shell (e.g. via `bash` tool) and report what happened.

Current shell-delegated subcommands:
- `refresh` — Idempotent plugin sync. Runs `npx kombinat-refresh` to update skills, tools, commands, templates, the sidebar bundle, and the lore index.
- `refresh-index` — Rebuild the lore index only. Runs `npx kombinat-index`.