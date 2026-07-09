/** @jsxImportSource @opentui/solid */
import { For } from 'solid-js'
import type { DiffHunk } from '../hooks/use-project-state.js'
import { truncate, BOLD } from '../utils/format.js'

/** Renders a navigable list of diff hunks with status indicators. */
export function HunkNavigator(props: {
  hunks: DiffHunk[]
  selected: number
  onSelect: (index: number) => void
}) {
  return (
    <box flexDirection="column">
      <text style={{ fg: 'cyan' }}>
        {`Hunks (${String(props.hunks.length)})`}
      </text>
      <For each={props.hunks}>
        {(hunk, i) => {
          const isSelected = i() === props.selected
          const statusIcon = hunk.status === 'approved' ? '✓' : hunk.status === 'rejected' ? '✗' : '○'
          const preview = truncate(hunk.after[0] || hunk.before[0] || '', 30)
          return (
            <text
              style={{
                fg: isSelected ? 'cyan'
                  : hunk.status === 'approved' ? 'green'
                  : hunk.status === 'rejected' ? 'red'
                  : 'yellow',
                ...(isSelected ? { attributes: BOLD } : {}),
              }}
              on:select={() => props.onSelect(i())}
            >
              {`${statusIcon} ${String(i() + 1)}. L${String(hunk.startLine)}–${String(hunk.endLine)} — ${preview}`}
            </text>
          )
        }}
      </For>
    </box>
  )
}
