/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js'
import type { DiffHunk } from '../hooks/use-project-state.js'
import { truncate } from '../utils/format.js'

export function DiffViewer(props: { hunk: DiffHunk | null }) {
  return (
    <Show when={props.hunk} fallback={<text style={{ fg: 'gray' }}>No hunk selected</text>} keyed>
      {(h: DiffHunk) => (
        <box flexDirection="column">
          <text style={{ fg: 'gray' }}>
            Lines {h.startLine}–{h.endLine}
          </text>
          <text style={{ fg: 'red' }}>─ Before ─</text>
          <For each={h.before}>
            {(line) => <text style={{ fg: 'diffRemoved' }}>- {truncate(line, 60)}</text>}
          </For>
          <text style={{ fg: 'green' }}>─ After ─</text>
          <For each={h.after}>
            {(line) => <text style={{ fg: 'diffAdded' }}>+ {truncate(line, 60)}</text>}
          </For>
        </box>
      )}
    </Show>
  )
}