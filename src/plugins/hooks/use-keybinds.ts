import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

/**
 * Global keybinds for the Kombinat sidebar.
 *
 * `r` (without modifier, without leader) — runs all quality gates.
 * This is a true global keybind — fires regardless of focus — so the user
 * can hit `r` from anywhere in the TUI to refresh gate results.
 *
 * Plain `r` not `ctrl+r` because:
 *   - OpenCode already binds `ctrl+r` for session rename
 *   - `r` alone is the most discoverable for "run gates"
 *   - No leader-token expansion is needed
 */
export function useKeybinds(
  api: TuiPluginApi,
  runAllGates: () => Promise<void>,
): void {
  if (!api.keymap) return

  api.keymap.registerLayer({
    commands: [
      {
        name: 'kombinat.gates.run-all',
        title: 'Kombinat: Run All Gates',
        category: 'Kombinat Writer',
        run: async () => {
          await runAllGates()
        },
      },
    ],
    bindings: [
      { key: 'r', cmd: 'kombinat.gates.run-all' },
    ],
  })
}
