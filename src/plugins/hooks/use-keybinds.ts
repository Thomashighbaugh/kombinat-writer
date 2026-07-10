import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Tab } from './use-project-state.js'

/**
 * Tab order for cycling.
 */
const TAB_ORDER: readonly Tab[] = ['dashboard', 'gates', 'diff', 'viz'] as const

/**
 * Register a single leader-key keybind to cycle through Kombinat sidebar tabs.
 *
 * Uses the modern `api.keymap.registerLayer({ commands, bindings })` API.
 * The legacy `api.command.register` with `keybind: '1'` only added entries
 * to the command palette — pressing the key in the prompt just typed it.
 *
 * The binding `<leader>k` lets the user press the leader key (Ctrl+X by
 * default in OpenCode) followed by `k` to advance to the next tab. The
 * same binding wraps around, so pressing it on the last tab returns to
 * the first.
 *
 * The `getActiveTab` and `setActiveTab` callbacks let us read the current
 * tab (a Solid signal) at the moment the binding fires, compute the next
 * tab, and update it.
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
    priority: 100,
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
      {
        key: '<leader>k',
        cmd: 'kombinat.tab.cycle',
        desc: 'Cycle through Kombinat sidebar tabs (Dashboard / Gates / Diff / Viz)',
        group: 'Kombinat Writer',
      },
      {
        key: '<leader>1',
        cmd: 'kombinat.tab.dashboard',
        desc: 'Kombinat sidebar → Dashboard tab',
        group: 'Kombinat Writer',
      },
      {
        key: '<leader>2',
        cmd: 'kombinat.tab.gates',
        desc: 'Kombinat sidebar → Gates tab',
        group: 'Kombinat Writer',
      },
      {
        key: '<leader>3',
        cmd: 'kombinat.tab.diff',
        desc: 'Kombinat sidebar → Diff tab',
        group: 'Kombinat Writer',
      },
      {
        key: '<leader>4',
        cmd: 'kombinat.tab.viz',
        desc: 'Kombinat sidebar → Viz tab',
        group: 'Kombinat Writer',
      },
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
