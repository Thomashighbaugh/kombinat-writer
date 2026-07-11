/** @jsxImportSource @opentui/solid */
import type { SidebarState } from '../hooks/use-project-state.js'
import { DashboardTab } from './dashboard-tab.js'
import { GatesTab } from './gates-tab.js'
import { DiffTab } from './diff-tab.js'
import { VizTab } from './viz-tab.js'
import { c } from '../utils/colors.js'

/**
 * Renders all four sidebar sections stacked vertically as a single scrollable
 * column. No tabs, no keybinds. The user scrolls down to see everything.
 *
 * Sections (in order):
 *   1. Project status (Dashboard)
 *   2. Quality gates
 *   3. Diff approval
 *   4. Visualizations
 */
export function SidebarContent(props: { session_id: string; state: SidebarState }) {
  return (
    <box flexDirection="column">
      <DashboardTab state={props.state} />
      <text style={{ fg: c.alt }}>{'─'}</text>
      <GatesTab state={props.state} />
      <text style={{ fg: c.alt }}>{'─'}</text>
      <DiffTab state={props.state} />
      <text style={{ fg: c.alt }}>{'─'}</text>
      <VizTab state={props.state} />
    </box>
  )
}
