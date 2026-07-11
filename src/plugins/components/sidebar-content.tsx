/** @jsxImportSource @opentui/solid */
import type { SidebarState } from '../hooks/use-project-state.js'
import { DashboardTab } from './dashboard-tab.js'
import { GatesTab } from './gates-tab.js'
import { DiffTab } from './diff-tab.js'
import { VizTab } from './viz-tab.js'

/**
 * Renders all four sidebar sections stacked vertically as a single scrollable
 * column. The Viz and Diff sections are HIDDEN entirely when there is no
 * data to show — no garish empty placeholders.
 *
 * Sections:
 *   1. Project status (Dashboard) — always shown
 *   2. Quality gates — always shown (the run-all action is useful)
 *   3. Diff approval — only when diffData() is non-null
 *   4. Visualizations — only when vizData() has chapters
 */
export function SidebarContent(props: { session_id: string; state: SidebarState }) {
  return (
    <box flexDirection="column">
      <DashboardTab state={props.state} />
      <GatesTab state={props.state} />
      {props.state.diffData() ? <DiffTab state={props.state} /> : null}
      {props.state.vizData() && props.state.vizData()!.chapters > 0 ? (
        <VizTab state={props.state} />
      ) : null}
    </box>
  )
}
