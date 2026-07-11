import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

/**
 * No global keybinds. The sidebar is invoked by:
 *   - clicking the [R] Run All Gates button in the gates tab
 *   - typing `/kombinat-gates` in the prompt
 *   - typing `/kombinat verify gates`
 *
 * Plain single-letter keybinds (like `r`) would block the user from typing
 * that letter anywhere else. Modifiers+letter pairs collide with OpenCode
 * built-ins. So we don't register any.
 */
export function useKeybinds(_api: TuiPluginApi, _runAllGates: () => Promise<void>): void {
  // intentionally empty
}
