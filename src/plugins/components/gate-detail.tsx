/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { GateRunResult } from '../hooks/use-project-state.js'
import { statusIcon, statusColor, BOLD } from '../utils/format.js'
import { c } from '../utils/colors.js'

/** Renders expanded details for a single gate run result with fix hint. */
export function GateDetail(props: { result: GateRunResult | null }) {
  return (
    <Show when={props.result} fallback={<text style={{ fg: c.textMuted }}>{'Select a gate to view details'}</text>}>
      {(r) => (
        <box flexDirection="column" marginTop={1}>
          <text style={{ fg: statusColor(r().status), attributes: BOLD }}>
            {`${statusIcon(r().status)} ${r().gateName}`}
          </text>
          <text style={{ fg: c.text }}>{r().detail}</text>
          <Show when={r().fixHint}>
            <text style={{ fg: c.warn }}>{`Fix: ${r().fixHint}`}</text>
          </Show>
        </box>
      )}
    </Show>
  )
}
