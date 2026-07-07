/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { phaseLabel, stateLabel, bar, BOLD } from '../utils/format.js'

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

  return (
    <box flexDirection="column">
      {/* ─── Project Status ─── */}
      <text style={{ fg: 'cyan', attributes: BOLD }}>── Project ──</text>
      <Show when={project()} fallback={<text style={{ fg: 'gray' }}>No project detected</text>}>
        <text style={{ fg: 'white' }}>
          Track: <text style={{ fg: 'yellow' }}>{project()!.track}</text>
        </text>
        <text style={{ fg: 'white' }}>
          Phase: <text style={{ fg: 'green' }}>{phaseLabel(project()!.phase)}</text>
        </text>
        <text style={{ fg: 'gray' }}>
          State: {stateLabel(project()!.state)}
        </text>

        {/* Phase Progress Bar */}
        <box marginTop={1}>
          <text style={{ fg: 'gray' }}>Progress: </text>
          <text style={{ fg: 'cyan' }}>
            {bar(currentPhaseIndex() + 1, phaseList().length, 15)}
          </text>
          <text style={{ fg: 'gray' }}>
            {' '}{currentPhaseIndex() + 1}/{phaseList().length}
          </text>
        </box>

        {/* ─── Documents ─── */}
        <box marginTop={1}>
          <text style={{ fg: 'cyan', attributes: BOLD }}>── Documents ──</text>
        </box>
        <text>
          <text style={{ fg: project()!.constitution ? 'green' : 'gray' }}>
            {project()!.constitution ? '✓' : '○'} Constitution
          </text>
          {'  '}
          <text style={{ fg: project()!.specification ? 'green' : 'gray' }}>
            {project()!.specification ? '✓' : '○'} Specification
          </text>
        </text>
        <text>
          <text style={{ fg: project()!.outline ? 'green' : 'gray' }}>
            {project()!.outline ? '✓' : '○'} Outline
          </text>
          {'  '}
          <text style={{ fg: project()!.tasks ? 'green' : 'gray' }}>
            {project()!.tasks ? '✓' : '○'} Tasks
          </text>
          {'  '}
          <text style={{ fg: project()!.research ? 'green' : 'gray' }}>
            {project()!.research ? '✓' : '○'} Research
          </text>
        </text>

        {/* ─── Chapters ─── */}
        <box marginTop={1}>
          <text style={{ fg: 'cyan', attributes: BOLD }}>── Chapters ──</text>
        </box>
        <text style={{ fg: 'white' }}>
          Drafted: {project()!.chapters}
        </text>
        <text style={{ fg: 'white' }}>
          Critique rounds: {project()!.critiqueRounds}
        </text>
        <text style={{ fg: 'white' }}>
          Revisions: {project()!.revisions}
        </text>
        <Show when={project()!.edited > 0}>
          <text style={{ fg: 'white' }}>
            Edited: {project()!.edited}
          </text>
        </Show>

        {/* ─── Next Recommended ─── */}
        <box marginTop={1}>
          <text style={{ fg: 'yellow' }}>
            → Next: {project()!.nextRecommended || '—'}
          </text>
        </box>
      </Show>

      {/* ─── Quick Actions ─── */}
      <box marginTop={1}>
        <text style={{ fg: 'cyan', attributes: BOLD }}>── Actions ──</text>
      </box>
      <text style={{ fg: 'gray' }}>
        Run /kombinat commands in prompt:
      </text>
      <text style={{ fg: 'blue' }}>
        /kombinat draft · /kombinat critique
      </text>
      <text style={{ fg: 'blue' }}>
        /kombinat revise · /kombinat edit
      </text>
      <text style={{ fg: 'blue' }}>
        /kombinat verify · /kombinat status
      </text>
    </box>
  )
}