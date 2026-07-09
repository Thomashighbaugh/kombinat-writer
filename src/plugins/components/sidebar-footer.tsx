/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { statusIcon, BOLD } from '../utils/format.js'

/** Renders the sidebar footer with tab navigation hints and gate status counts. */
export function SidebarFooter(props: { session_id: string; state: SidebarState }) {
  const summary = props.state.gateSummary

  return (
    <box flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <text style={{ fg: 'gray' }}>
          1:Dash 2:Gates 3:Diff 4:Viz
        </text>
        <Show when={summary().total > 0}>
          <text>
            <text style={{ fg: 'green' }}>{statusIcon('pass')} {summary().passed}</text>
            {'  '}
            <text style={{ fg: 'red' }}>{statusIcon('block')} {summary().blocked}</text>
            {'  '}
            <text style={{ fg: 'yellow' }}>{statusIcon('warn')} {summary().warnings}</text>
          </text>
        </Show>
      </box>
      <text style={{ fg: 'cyan', attributes: BOLD }}>
        [leader]b toggle · 1-4 tabs · /kombinat menu
      </text>
    </box>
  )
}