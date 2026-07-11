import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Tab } from './use-project-state.js'

/**
 * Tab order for cycling.
 */
const TAB_ORDER: readonly Tab[] = ['dashboard', 'gates', 'diff', 'viz'] as const

/**
 * Register keybinds to cycle through Kombinat sidebar tabs.
 *
 * Uses the modern `api.keymap.registerLayer({ commands, bindings })` API.
 * The legacy `api.command.register` with `keybind: '1'` only added entries
 * to the command palette — pressing the key in the prompt just typed it.
 *
 * Bindings:
 *   - `<leader>k`   cycle to next tab (wraps)
 *   - `<leader>1`   jump to Dashboard
 *   - `<leader>2`   jump to Gates
 *   - `<leader>3`   jump to Diff
 *   - `<leader>4`   jump to Viz
 *
 * The `getActiveTab` and `setActiveTab` callbacks let us read the current
 * tab (a Solid signal) at the moment the binding fires, compute the next
 * tab, and update it.
 *
 * This function is **defensive**: any failure in the keymap API is caught
 * and logged via a toast so the plugin still loads (the slash command menu
 * and sidebar slots remain functional even if keybinds fail to register).
 */
export function useKeybinds(
  api: TuiPluginApi,
  getActiveTab: () => Tab,
  setActiveTab: (t: Tab) => void
): void {
  if (!api.keymap) {
    api.ui?.toast?.({
      title: 'Kombinat',
      message: 'Keymap API not available — tab cycling disabled (use /kombinat menu)',
      variant: 'warning',
      duration: 5000,
    })
    return
  }

  const cycle = () => {
    setActiveTab(nextTab(getActiveTab()))
  }

  try {
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
          desc: 'Cycle through Kombinat sidebar tabs',
          group: 'Kombinat Writer',
        },
        {
          key: '<leader>1',
          cmd: 'kombinat.tab.dashboard',
          desc: 'Kombinat → Dashboard tab',
          group: 'Kombinat Writer',
        },
        {
          key: '<leader>2',
          cmd: 'kombinat.tab.gates',
          desc: 'Kombinat → Gates tab',
          group: 'Kombinat Writer',
        },
        {
          key: '<leader>3',
          cmd: 'kombinat.tab.diff',
          desc: 'Kombinat → Diff tab',
          group: 'Kombinat Writer',
        },
        {
          key: '<leader>4',
          cmd: 'kombinat.tab.viz',
          desc: 'Kombinat → Viz tab',
          group: 'Kombinat Writer',
        },
      ],
    })
  } catch (err) {
    // Don't let a keymap failure kill the whole plugin — the slash command
    // menu and sidebar slots still work without keybinds.
    api.ui?.toast?.({
      title: 'Kombinat',
      message: `Keybind registration failed: ${err instanceof Error ? err.message : String(err)}`,
      variant: 'warning',
      duration: 5000,
    })
  }
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

