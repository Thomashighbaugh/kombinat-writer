/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { pacingChart } from '../utils/chart-rendering.js'
import { c } from '../utils/colors.js'

/** Renders the pacing heartbeat visualization as a vertical bar chart. */
export function PacingChart(props: { state: SidebarState }) {
  const viz = props.state.vizData
  return (
    <Show
      when={viz()?.pacing.length}
      fallback={<text style={{ fg: c.textMuted }}>{'No pacing data — run /kombinat verify'}</text>}
    >
      <box flexDirection="column">
        <text style={{ fg: c.cyan }}>{'Pacing Heartbeat'}</text>
        <For each={pacingChart(viz()!.pacing)}>
          {(line) => <text style={{ fg: c.green }}>{line}</text>}
        </For>
      </box>
    </Show>
  )
}
