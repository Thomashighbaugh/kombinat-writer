/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { phaseLabel, stateLabel, bar, BOLD } from '../utils/format.js'

/** Renders the Dashboard tab with project status, document checklist, chapter counts, and quick actions. */
export function DashboardTab(props: { state: SidebarState }) {
  const project = props.state.project

  const phaseList = createMemo(() => {
    if (!project()) return []
    const track = project()!.track
    const phases = track === 'non-fiction'
      ? ['constitute', 'specify', 'research', 'outline', 'draft', 'edit', 'review', 'publish']
      : ['constitute', 'specify', 'clarify', 'outline', 'draft', 'critique', 'revise', 'edit', 'review', 'publish']
    return phases
  })

  const currentPhaseIndex = createMemo(() => {
    if (!project()) return -1
    return phaseList().indexOf(project()!.phase)
  })

  const statusMark = (ok: boolean) => (ok ? '✓' : '○')
  const statusColor = (ok: boolean) => (ok ? 'green' : 'gray')

  return (
    <box flexDirection="column">
      {/* ─── Project Status ─── */}
      <text style={{ fg: 'cyan', attributes: BOLD }}>{'── Project ──'}</text>
      <Show when={project()} fallback={<text style={{ fg: 'gray' }}>{'No project detected'}</text>}>
        <box flexDirection="row">
          <text style={{ fg: 'white' }}>{'Track: '}</text>
          <text style={{ fg: 'yellow' }}>{project()!.track}</text>
        </box>
        <box flexDirection="row">
          <text style={{ fg: 'white' }}>{'Phase: '}</text>
          <text style={{ fg: 'green' }}>{phaseLabel(project()!.phase)}</text>
        </box>
        <text style={{ fg: 'gray' }}>
          {`State: ${stateLabel(project()!.state)}`}
        </text>

        {/* Phase Progress Bar */}
        <box marginTop={1} flexDirection="row">
          <text style={{ fg: 'gray' }}>{'Progress: '}</text>
          <text style={{ fg: 'cyan' }}>
            {bar(currentPhaseIndex() + 1, phaseList().length, 15)}
          </text>
          <text style={{ fg: 'gray' }}>
            {` ${String(currentPhaseIndex() + 1)}/${String(phaseList().length)}`}
          </text>
        </box>

        {/* ─── Documents ─── */}
        <box marginTop={1}>
          <text style={{ fg: 'cyan', attributes: BOLD }}>{'── Documents ──'}</text>
        </box>
        <box flexDirection="row">
          <text style={{ fg: statusColor(project()!.constitution) }}>
            {`${statusMark(project()!.constitution)} Constitution`}
          </text>
          <text>{'  '}</text>
          <text style={{ fg: statusColor(project()!.specification) }}>
            {`${statusMark(project()!.specification)} Specification`}
          </text>
        </box>
        <box flexDirection="row">
          <text style={{ fg: statusColor(project()!.outline) }}>
            {`${statusMark(project()!.outline)} Outline`}
          </text>
          <text>{'  '}</text>
          <text style={{ fg: statusColor(project()!.tasks) }}>
            {`${statusMark(project()!.tasks)} Tasks`}
          </text>
          <text>{'  '}</text>
          <text style={{ fg: statusColor(project()!.research) }}>
            {`${statusMark(project()!.research)} Research`}
          </text>
        </box>

        {/* ─── Chapters ─── */}
        <box marginTop={1}>
          <text style={{ fg: 'cyan', attributes: BOLD }}>{'── Chapters ──'}</text>
        </box>
        <text style={{ fg: 'white' }}>
          {`Drafted: ${String(project()!.chapters)}`}
        </text>
        <text style={{ fg: 'white' }}>
          {`Critique rounds: ${String(project()!.critiqueRounds)}`}
        </text>
        <text style={{ fg: 'white' }}>
          {`Revisions: ${String(project()!.revisions)}`}
        </text>
        <Show when={project()!.edited > 0}>
          <text style={{ fg: 'white' }}>
            {`Edited: ${String(project()!.edited)}`}
          </text>
        </Show>

        {/* ─── Next Recommended ─── */}
        <box marginTop={1}>
          <text style={{ fg: 'yellow' }}>
            {`→ Next: ${project()!.nextRecommended || '—'}`}
          </text>
        </box>
      </Show>

      {/* ─── Quick Actions ─── */}
      <box marginTop={1}>
        <text style={{ fg: 'cyan', attributes: BOLD }}>{'── Actions ──'}</text>
      </box>
      <text style={{ fg: 'gray' }}>
        {'Run /kombinat commands in prompt:'}
      </text>
      <text style={{ fg: 'blue' }}>
        {'/kombinat draft · /kombinat critique'}
      </text>
      <text style={{ fg: 'blue' }}>
        {'/kombinat revise · /kombinat edit'}
      </text>
      <text style={{ fg: 'blue' }}>
        {'/kombinat verify · /kombinat status'}
      </text>
    </box>
  )
}
