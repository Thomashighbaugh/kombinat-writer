/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js'
import type { DiffHunk } from '../hooks/use-project-state.js'
import { truncate } from '../utils/format.js'
import { c } from '../utils/colors.js'

/** Renders a single hunk's before/after diff lines. */
export function DiffViewer(props: { hunk: DiffHunk | null }) {
  return (
    <Show when={props.hunk} fallback={<text style={{ fg: c.textMuted }}>{'No hunk selected'}</text>} keyed>
      {(h: DiffHunk) => (
        <box flexDirection="column">
          <text style={{ fg: c.textMuted }}>
            {`Lines ${String(h.startLine)}–${String(h.endLine)}`}
          </text>
          <text style={{ fg: c.diffRemoved }}>{'─ Before ─'}</text>
          <For each={h.before}>
            {(line) => <text style={{ fg: c.diffRemoved }}>{`- ${truncate(line, 60)}`}</text>}
          </For>
          <text style={{ fg: c.diffAdded }}>{'─ After ─'}</text>
          <For each={h.after}>
            {(line) => <text style={{ fg: c.diffAdded }}>{`+ ${truncate(line, 60)}`}</text>}
          </For>
        </box>
      )}
    </Show>
  )
}
