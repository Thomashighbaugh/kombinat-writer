/** @jsxImportSource @opentui/solid */
import { For } from 'solid-js'
import type { DiffHunk } from '../hooks/use-project-state.js'
import { truncate, BOLD } from '../utils/format.js'

export function HunkNavigator(props: {
  hunks: DiffHunk[]
  selected: number
  onSelect: (index: number) => void
}) {
  return (
    <box flexDirection="column">
      <text style={{ fg: 'cyan' }}>Hunks ({props.hunks.length})</text>
      <For each={props.hunks}>
        {(hunk, i) => (
          <text
            style={{
              fg: i() === props.selected ? 'cyan' : hunk.status === 'approved' ? 'green' : hunk.status === 'rejected' ? 'red' : 'yellow',
              attributes: i() === props.selected ? BOLD : 0,
            }}
            on:select={() => props.onSelect(i())}
          >
            {hunk.status === 'approved' ? '✓' : hunk.status === 'rejected' ? '✗' : '○'} {i() + 1}. L{hunk.startLine}–{hunk.endLine} — {truncate(hunk.after[0] || hunk.before[0] || '', 30)}
          </text>
        )}
      </For>
    </box>
  )
}