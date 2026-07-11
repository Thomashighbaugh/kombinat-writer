/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo, createSignal } from 'solid-js'
import type { SidebarState, DiffHunk } from '../hooks/use-project-state.js'
import { truncate, BOLD } from '../utils/format.js'
import { c } from '../utils/colors.js'

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
      <text style={{ fg: c.header, attributes: BOLD }}>{'── Diff Approval ──'}</text>

      <Show
        when={diff()}
        fallback={
          <text style={{ fg: c.textMuted }}>{'No pending diffs.'}</text>
        }
        keyed
      >
        {(d) => (
          <box flexDirection="column">
            {/* ─── Hunk Summary ─── */}
            <box marginTop={1} flexDirection="row">
              <text style={{ fg: c.textBright }}>
                {d.file}
              </text>
              <text style={{ fg: c.textMuted }}>
                {`  ${String(d.approved)}/${String(d.totalHunks)} approved · ${String(d.rejected)} rejected · ${String(d.pending)} pending`}
              </text>
            </box>

            {/* ─── Hunk Navigator ─── */}
            <box marginTop={1} flexDirection="column">
              <text style={{ fg: c.cyan }}>
                {`Hunk ${String(selectedHunk() + 1)} of ${String(d.hunks.length)}`}
              </text>
              <text style={{ fg: c.textMuted }}>
                {'[↑↓] Navigate  [A] Approve  [R] Reject  [|] Veto'}
              </text>
            </box>

            {/* ─── Side-by-side diff ─── */}
            <Show when={currentHunk()} keyed>
              {(hunk: DiffHunk) => (
                <box marginTop={1} flexDirection="column">
                  <text style={{ fg: c.textMuted }}>
                    {`Lines ${String(hunk.startLine)}–${String(hunk.endLine)}`}
                  </text>

                  {/* Before */}
                  <text style={{ fg: c.diffRemoved }}>{'─ Before ─'}</text>
                  <For each={hunk.before}>
                    {(line) => (
                      <text style={{ fg: c.diffRemoved }}>
                        {`- ${truncate(line, 60)}`}
                      </text>
                    )}
                  </For>

                  {/* After */}
                  <text style={{ fg: c.diffAdded }}>{'─ After ─'}</text>
                  <For each={hunk.after}>
                    {(line) => (
                      <text style={{ fg: c.diffAdded }}>
                        {`+ ${truncate(line, 60)}`}
                      </text>
                    )}
                  </For>

                  {/* Hunk status */}
                  <box marginTop={1}>
                    <text style={{
                      fg: hunk.status === 'approved' ? c.pass
                        : hunk.status === 'rejected' ? c.block
                        : c.warn,
                    }}>
                      {`Status: ${hunk.status.toUpperCase()}${hunk.severity ? `  Severity: ${hunk.severity}` : ''}`}
                    </text>
                  </box>
                </box>
              )}
            </Show>

            {/* ─── Action Buttons ─── */}
            <box marginTop={1} flexDirection="row">
              <text style={{ fg: c.pass, attributes: BOLD }}>{'[A] Approve'}</text>
              <text>{'  '}</text>
              <text style={{ fg: c.block, attributes: BOLD }}>{'[R] Reject'}</text>
              <text>{'  '}</text>
              <text style={{ fg: c.warn, attributes: BOLD }}>{'[|] Veto'}</text>
            </box>

            <text style={{ fg: c.textMuted }}>
              {'[Enter] Apply approved · [Esc] Cancel'}
            </text>
          </box>
        )}
      </Show>
    </box>
  )
}
