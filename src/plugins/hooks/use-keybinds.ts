import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Tab } from './use-project-state.js'

/**
 * Register keybinds for tab switching (1-4) and veto (|).
 * Uses api.keybind.create() to build keybind sets and renderer input events.
 *
 * Since OpenCode's keybind system is high-level, we use a simpler approach:
 * register a command for each tab that can be invoked via number keys.
 */
export function useKeybinds(
  api: TuiPluginApi,
  setActiveTab: (t: Tab) => void
): void {
  // Tab switching via command palette — users can press 1-4 when sidebar is focused.
  if (!api.command) return
  api.command.register(() => [
    {
      title: 'Kombinat: Dashboard Tab',
      value: 'kombinat:tab-dashboard',
      description: 'Switch to Dashboard tab',
      keybind: '1',
      onSelect: () => setActiveTab('dashboard'),
    },
    {
      title: 'Kombinat: Gates Tab',
      value: 'kombinat:tab-gates',
      description: 'Switch to Gates tab',
      keybind: '2',
      onSelect: () => setActiveTab('gates'),
    },
    {
      title: 'Kombinat: Diff Tab',
      value: 'kombinat:tab-diff',
      description: 'Switch to Diff tab',
      keybind: '3',
      onSelect: () => setActiveTab('diff'),
    },
    {
      title: 'Kombinat: Viz Tab',
      value: 'kombinat:tab-viz',
      description: 'Switch to Visualizations tab',
      keybind: '4',
      onSelect: () => setActiveTab('viz'),
    },
  ])
}