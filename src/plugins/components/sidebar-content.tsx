/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { DashboardTab } from './dashboard-tab.js'
import { GatesTab } from './gates-tab.js'
import { DiffTab } from './diff-tab.js'
import { VizTab } from './viz-tab.js'

export function SidebarContent(props: { session_id: string; state: SidebarState }) {
  const tab = props.state.activeTab

  return (
    <box flexDirection="column">
      <Show when={tab() === 'dashboard'}>
        <DashboardTab state={props.state} />
      </Show>
      <Show when={tab() === 'gates'}>
        <GatesTab state={props.state} />
      </Show>
      <Show when={tab() === 'diff'}>
        <DiffTab state={props.state} />
      </Show>
      <Show when={tab() === 'viz'}>
        <VizTab state={props.state} />
      </Show>
    </box>
  )
}