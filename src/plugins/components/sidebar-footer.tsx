/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { statusIcon } from '../utils/format.js'
import { c } from '../utils/colors.js'

/** Renders the sidebar footer with tab navigation hints and gate status counts. */
export function SidebarFooter(props: { session_id: string; state: SidebarState }) {
  const summary = props.state.gateSummary

  return (
    <box flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <text style={{ fg: c.textMuted }}>
          {'1:Dash 2:Gates 3:Diff 4:Viz'}
        </text>
        <Show when={summary().total > 0}>
          <box flexDirection="row">
            <text style={{ fg: c.pass }}>{`${statusIcon('pass')} ${String(summary().passed)}`}</text>
            <text>{'  '}</text>
            <text style={{ fg: c.block }}>{`${statusIcon('block')} ${String(summary().blocked)}`}</text>
            <text>{'  '}</text>
            <text style={{ fg: c.warn }}>{`${statusIcon('warn')} ${String(summary().warnings)}`}</text>
          </box>
        </Show>
      </box>
      <text style={{ fg: c.textMuted }}>
        {'Ctrl+X,K cycle · Ctrl+X,1-4 jump · /kombinat menu'}
      </text>
    </box>
  )
}
