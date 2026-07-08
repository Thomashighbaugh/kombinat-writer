/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { GateRunResult } from '../hooks/use-project-state.js'
import { statusIcon, statusColor, BOLD } from '../utils/format.js'

/** Renders a single quality gate as a selectable card with status icon and detail preview. */
export function GateCard(props: { result: () => GateRunResult | undefined; gateName: string; gateId: string; onSelect: () => void }) {
  const r = props.result
  return (
    <box flexDirection="column" on:select={props.onSelect}>
      <text style={{ fg: r() ? statusColor(r()!.status) : 'gray' }}>
        {r() ? statusIcon(r()!.status) : '○'} {props.gateName}
      </text>
      <Show when={r()}>
        <text style={{ fg: 'gray' }}>
          {r()!.detail.slice(0, 50)}
        </text>
      </Show>
    </box>
  )
}