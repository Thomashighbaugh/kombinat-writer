import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Tab } from './use-project-state.js'

/**
 * Tab order for cycling.
 */
const TAB_ORDER: readonly Tab[] = ['dashboard', 'gates', 'diff', 'viz'] as const

/**
 * Register keybinds to cycle through Kombinat sidebar tabs.
 *
 * Plain `ctrl+x,...` sequences — no `<leader>` token, no helper functions.
 * Just direct key sequences the keymap engine recognizes without substitution.
 *
 * Bindings:
 *   - `ctrl+x,k`   cycle to next tab (wraps)
 *   - `ctrl+x,1`   jump to Dashboard
 *   - `ctrl+x,2`   jump to Gates
 *   - `ctrl+x,3`   jump to Diff
 *   - `ctrl+x,4`   jump to Viz
 */
export function useKeybinds(
  api: TuiPluginApi,
  getActiveTab: () => Tab,
  setActiveTab: (t: Tab) => void
): void {
  if (!api.keymap) return

  const cycle = () => {
    setActiveTab(nextTab(getActiveTab()))
  }

  api.keymap.registerLayer({
    commands: [
      {
        name: 'kombinat.tab.cycle',
        title: 'Kombinat: Cycle Tab',
        category: 'Kombinat Writer',
        run: cycle,
      },
      {
        name: 'kombinat.tab.dashboard',
        title: 'Kombinat: Dashboard Tab',
        category: 'Kombinat Writer',
        run: () => setActiveTab('dashboard'),
      },
      {
        name: 'kombinat.tab.gates',
        title: 'Kombinat: Gates Tab',
        category: 'Kombinat Writer',
        run: () => setActiveTab('gates'),
      },
      {
        name: 'kombinat.tab.diff',
        title: 'Kombinat: Diff Tab',
        category: 'Kombinat Writer',
        run: () => setActiveTab('diff'),
      },
      {
        name: 'kombinat.tab.viz',
        title: 'Kombinat: Viz Tab',
        category: 'Kombinat Writer',
        run: () => setActiveTab('viz'),
      },
    ],
    bindings: [
      { key: 'ctrl+x,k', cmd: 'kombinat.tab.cycle' },
      { key: 'ctrl+x,1', cmd: 'kombinat.tab.dashboard' },
      { key: 'ctrl+x,2', cmd: 'kombinat.tab.gates' },
      { key: 'ctrl+x,3', cmd: 'kombinat.tab.diff' },
      { key: 'ctrl+x,4', cmd: 'kombinat.tab.viz' },
    ],
  })
}

/** Pure helper: given the current tab, return the next tab (wrapping). */
export function nextTab(current: Tab): Tab {
  const i = TAB_ORDER.indexOf(current)
  return TAB_ORDER[(i + 1) % TAB_ORDER.length]!
}

/** Returns the tab order so the parent can show a hint of the cycle. */
export function getTabOrder(): readonly Tab[] {
  return TAB_ORDER
}
