/** @jsxImportSource @opentui/solid */
/**
 * Kombinat Writer Sidebar — TUI Plugin Entry Point
 *
 * Registers 3 sidebar slots into OpenCode's TUI:
 *   sidebar_title   — project name, phase, progress
 *   sidebar_content — 4 tabs (Dashboard, Gates, Diff, Viz)
 *   sidebar_footer  — gate status, keybind hints
 *
 * Uses @opentui/solid for terminal rendering.
 * Calls Kombinat's lib files directly as functions.
 */

import type { TuiPlugin, TuiPluginApi, TuiPluginMeta } from '@opencode-ai/plugin/tui'
import { createSignal } from 'solid-js'
import { SidebarTitle } from './components/sidebar-title.js'
import { SidebarContent } from './components/sidebar-content.js'
import { SidebarFooter } from './components/sidebar-footer.js'
import { useKeybinds } from './hooks/use-keybinds.js'
import { useProjectState, setInjector, type Tab } from './hooks/use-project-state.js'

const tui: TuiPlugin = async (api: TuiPluginApi, _o, _meta: TuiPluginMeta) => {
  const projectRoot = api.state.path.directory

  const [activeTab, setActiveTab] = createSignal<Tab>('dashboard')

  // Wire command injector so sidebar can inject /kombinat commands into the prompt
  setInjector((cmd: string) => {
    api.client.tui.appendPrompt({ text: cmd + ' ' }).catch(() => {})
  })

  const sidebarState = useProjectState(projectRoot, activeTab, setActiveTab)

  // Register keybinds for tab switching (1-4)
  useKeybinds(api, setActiveTab)

  // Register sidebar slots — slot renderers receive (ctx, props) where ctx has theme
  api.slots.register({
    slots: {
      'sidebar_title': (_ctx, props: { session_id: string; title: string }) =>
        <SidebarTitle {...props} state={sidebarState} />,

      'sidebar_content': (_ctx, props: { session_id: string }) =>
        <SidebarContent {...props} state={sidebarState} />,

      'sidebar_footer': (_ctx, props: { session_id: string }) =>
        <SidebarFooter {...props} state={sidebarState} />,
    },
  })

  // Register sidebar focus command
  if (api.command) {
    api.command.register(() => [
      {
        title: 'Kombinat: Focus Sidebar',
        value: 'kombinat:focus-sidebar',
        description: 'Focus the Kombinat Writer sidebar — use 1-4 to switch tabs',
        keybind: 'ctrl+k',
        onSelect: () => {
          api.ui.toast({ title: 'Kombinat', message: 'Sidebar active — 1:Dashboard 2:Gates 3:Diff 4:Viz' })
        },
      },
    ])
  }
}

const plugin = { id: 'kombinat-sidebar', tui }
export default plugin