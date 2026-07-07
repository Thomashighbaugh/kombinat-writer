/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { pacingChart } from '../utils/chart-rendering.js'

export function PacingChart(props: { state: SidebarState }) {
  const viz = props.state.vizData
  return (
    <Show
      when={viz()?.pacing.length}
      fallback={<text style={{ fg: 'gray' }}>No pacing data — run /kombinat verify</text>}
    >
      <box flexDirection="column">
        <text style={{ fg: 'cyan' }}>Pacing Heartbeat</text>
        <For each={pacingChart(viz()!.pacing)}>
          {(line) => <text style={{ fg: 'green' }}>{line}</text>}
        </For>
      </box>
    </Show>
  )
}