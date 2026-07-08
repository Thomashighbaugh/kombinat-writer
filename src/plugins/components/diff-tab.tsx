/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo, createSignal } from 'solid-js'
import type { SidebarState, DiffHunk } from '../hooks/use-project-state.js'
import { truncate, BOLD } from '../utils/format.js'

/** Renders the Diff Approval tab with hunk navigation, side-by-side diff, and approve/reject/veto actions. */
export function DiffTab(props: { state: SidebarState }) {
  const diff = props.state.diffData
  const [selectedHunk, setSelectedHunk] = createSignal<number>(0)

  const currentHunk = createMemo(() => {
    const d = diff()
    if (!d || d.hunks.length === 0) return null
    return d.hunks[selectedHunk()]
  })

  return (
    <box flexDirection="column">
      <text style={{ fg: 'cyan', attributes: BOLD }}>── Diff Approval ──</text>

      <Show
        when={diff()}
        fallback={
          <box flexDirection="column" marginTop={1}>
            <text style={{ fg: 'gray' }}>No pending diffs.</text>
            <text style={{ fg: 'gray' }}>
              Run /kombinat revise to generate diffs.
            </text>
            <box marginTop={1}>
              <text
                style={{ fg: 'green', attributes: BOLD }}
                on:select={() => props.state.injectCommand('/kombinat revise')}
              >
                [Enter] Run /kombinat revise
              </text>
            </box>
          </box>
        }
        keyed
      >
        {(d) => (
          <box flexDirection="column">
            {/* ─── Hunk Summary ─── */}
            <box marginTop={1}>
              <text style={{ fg: 'white' }}>
                {d.file}
              </text>
              <text style={{ fg: 'gray' }}>
                {'  '}{d.approved}/{d.totalHunks} approved · {d.rejected} rejected · {d.pending} pending
              </text>
            </box>

            {/* ─── Hunk Navigator ─── */}
            <box marginTop={1} flexDirection="column">
              <text style={{ fg: 'cyan' }}>Hunk {selectedHunk() + 1} of {d.hunks.length}</text>
              <text style={{ fg: 'gray' }}>
                [↑↓] Navigate  [A] Approve  [R] Reject  [|] Veto
              </text>
            </box>

            {/* ─── Side-by-side diff ─── */}
            <Show when={currentHunk()} keyed>
              {(hunk: DiffHunk) => (
                <box marginTop={1} flexDirection="column">
                  <text style={{ fg: 'gray' }}>
                    Lines {hunk.startLine}–{hunk.endLine}
                  </text>

                  {/* Before */}
                  <text style={{ fg: 'red' }}>─ Before ─</text>
                  <For each={hunk.before}>
                    {(line) => (
                      <text style={{ fg: 'diffRemoved' }}>
                        - {truncate(line, 60)}
                      </text>
                    )}
                  </For>

                  {/* After */}
                  <text style={{ fg: 'green' }}>─ After ─</text>
                  <For each={hunk.after}>
                    {(line) => (
                      <text style={{ fg: 'diffAdded' }}>
                        + {truncate(line, 60)}
                      </text>
                    )}
                  </For>

                  {/* Hunk status */}
                  <box marginTop={1}>
                    <text style={{
                      fg: hunk.status === 'approved' ? 'green'
                        : hunk.status === 'rejected' ? 'red'
                        : 'yellow',
                    }}>
                      Status: {hunk.status.toUpperCase()}
                      {hunk.severity ? `  Severity: ${hunk.severity}` : ''}
                    </text>
                  </box>
                </box>
              )}
            </Show>

            {/* ─── Action Buttons ─── */}
            <box marginTop={1} flexDirection="row">
              <text style={{ fg: 'green', attributes: BOLD }}>[A] Approve</text>
              <text>{'  '}</text>
              <text style={{ fg: 'red', attributes: BOLD }}>[R] Reject</text>
              <text>{'  '}</text>
              <text style={{ fg: 'yellow', attributes: BOLD }}>[|] Veto</text>
            </box>

            <text style={{ fg: 'gray' }}>
              [Enter] Apply approved · [Esc] Cancel
            </text>
          </box>
        )}
      </Show>
    </box>
  )
}