/** @jsxImportSource @opentui/solid */
import { createSignal } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { DashboardTab } from './dashboard-tab.js'
import { GatesTab } from './gates-tab.js'
import { DiffTab } from './diff-tab.js'
import { VizTab } from './viz-tab.js'

/**
 * Sidebar content with a tab_select bar at the top. Each tab is a section
 * (Dashboard, Gates, Diff, Viz). TabSelect fires native ITEM_SELECTED events
 * so clicking/tapping a tab actually works — unlike <box on:select> which is
 * a dead listener.
 *
 * Diff and Viz tabs are omitted when there is no data to show.
 */
export function SidebarContent(props: { session_id: string; state: SidebarState }) {
  // Build the tab list reactively
  const tabs = () => {
    const list = [
      { name: 'Dashboard', description: 'Project status overview', value: 'dashboard' },
      { name: 'Gates',     description: 'Quality gate runs',      value: 'gates' },
    ]
    if (props.state.diffData()) {
      list.push({ name: 'Diff', description: 'Revision diff approval', value: 'diff' as const })
    }
    if (props.state.vizData() && props.state.vizData()!.chapters > 0) {
      list.push({ name: 'Viz', description: 'Writing visualizations', value: 'viz' as const })
    }
    return list
  }

  const [activeTab, setActiveTab] = createSignal('dashboard')

  return (
    <box flexDirection="column">
      {/* Tab bar — actually clickable because TabSelect fires native events */}
      <tab_select
        options={tabs()}
        onSelect={(_i: number, opt: { value?: string } | null) => {
          if (opt?.value) setActiveTab(opt.value)
        }}
        showDescription={false}
        showUnderline={true}
        tabWidth={18}
      />

      {/* Active tab content */}
      <box marginTop={1} flexDirection="column">
        {activeTab() === 'dashboard' ? <DashboardTab state={props.state} /> : null}
        {activeTab() === 'gates'     ? <GatesTab state={props.state} /> : null}
        {activeTab() === 'diff'      ? <DiffTab state={props.state} /> : null}
        {activeTab() === 'viz'       ? <VizTab state={props.state} /> : null}
      </box>
    </box>
  )
}
