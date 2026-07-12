/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { phaseLabel, stateLabel, bar, BOLD } from '../utils/format.js'
import { c } from '../utils/colors.js'

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
  const statusColor = (ok: boolean) => (ok ? c.pass : c.alt)

  return (
    <box flexDirection="column">
      {/* ─── Project Status ─── */}
      <text style={{ fg: c.header, attributes: BOLD }}>{'── Project ──'}</text>
      <Show when={project()} fallback={<text style={{ fg: c.textMuted }}>{'No project detected'}</text>}>
        <box flexDirection="row">
          <text style={{ fg: c.text }}>{'Track: '}</text>
          <text style={{ fg: c.magenta }}>{project()!.track}</text>
        </box>
        <box flexDirection="row">
          <text style={{ fg: c.text }}>{'Phase: '}</text>
          <text style={{ fg: c.green }}>{phaseLabel(project()!.phase)}</text>
        </box>
        <text style={{ fg: c.textMuted }}>
          {`State: ${stateLabel(project()!.state)}`}
        </text>

        {/* Phase Progress Bar */}
        <box marginTop={1} flexDirection="row">
          <text style={{ fg: c.textMuted }}>{'Progress: '}</text>
          <text style={{ fg: c.cyan }}>
            {bar(currentPhaseIndex() + 1, phaseList().length, 15)}
          </text>
          <text style={{ fg: c.textMuted }}>
            {` ${String(currentPhaseIndex() + 1)}/${String(phaseList().length)}`}
          </text>
        </box>

        {/* ─── Documents ─── */}
        <box marginTop={1}>
          <text style={{ fg: c.header, attributes: BOLD }}>{'── Documents ──'}</text>
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
          <text style={{ fg: c.header, attributes: BOLD }}>{'── Chapters ──'}</text>
        </box>
        <text style={{ fg: c.text }}>
          {`Drafted: ${String(project()!.chapters)}`}
        </text>
        <text style={{ fg: c.text }}>
          {`Critique rounds: ${String(project()!.critiqueRounds)}`}
        </text>
        <text style={{ fg: c.text }}>
          {`Revisions: ${String(project()!.revisions)}`}
        </text>
        <Show when={project()!.edited > 0}>
          <text style={{ fg: c.text }}>
            {`Edited: ${String(project()!.edited)}`}
          </text>
        </Show>

        {/* ─── Next Recommended ─── */}
        <box marginTop={1}>
          <text style={{ fg: c.orange }}>
            {`→ Next: ${project()!.nextRecommended || '—'}`}
          </text>
        </box>
      </Show>

      {/* ─── Quick Actions (clickable boxes) ─── */}
      <box marginTop={1}>
        <text style={{ fg: c.header, attributes: BOLD }}>{'── Actions ──'}</text>
      </box>
      <box flexDirection="row" on:select={() => props.state.injectCommand('/kombinat draft')}>
        <text style={{ fg: c.pass, attributes: BOLD }}>{'▶ '}</text>
        <text style={{ fg: c.blue }}>{'/kombinat draft'}</text>
        <text style={{ fg: c.textMuted }}>{'   batch draft pending chapters'}</text>
      </box>
      <box flexDirection="row" on:select={() => props.state.injectCommand('/kombinat critique')}>
        <text style={{ fg: c.pass, attributes: BOLD }}>{'▶ '}</text>
        <text style={{ fg: c.blue }}>{'/kombinat critique'}</text>
        <text style={{ fg: c.textMuted }}>{'   batch critique with 95% score'}</text>
      </box>
      <box flexDirection="row" on:select={() => props.state.injectCommand('/kombinat revise')}>
        <text style={{ fg: c.pass, attributes: BOLD }}>{'▶ '}</text>
        <text style={{ fg: c.blue }}>{'/kombinat revise'}</text>
        <text style={{ fg: c.textMuted }}>{'   batch revise to 95%'}</text>
      </box>
      <box flexDirection="row" on:select={() => props.state.injectCommand('/kombinat edit')}>
        <text style={{ fg: c.pass, attributes: BOLD }}>{'▶ '}</text>
        <text style={{ fg: c.blue }}>{'/kombinat edit'}</text>
        <text style={{ fg: c.textMuted }}>{'   three-pass line/copy/proofread'}</text>
      </box>
      <box flexDirection="row" on:select={() => props.state.injectCommand('/kombinat verify')}>
        <text style={{ fg: c.pass, attributes: BOLD }}>{'▶ '}</text>
        <text style={{ fg: c.blue }}>{'/kombinat verify'}</text>
        <text style={{ fg: c.textMuted }}>{'   run all quality gates'}</text>
      </box>
      <box flexDirection="row" on:select={() => props.state.injectCommand('/kombinat status')}>
        <text style={{ fg: c.pass, attributes: BOLD }}>{'▶ '}</text>
        <text style={{ fg: c.blue }}>{'/kombinat status'}</text>
        <text style={{ fg: c.textMuted }}>{'   show project state'}</text>
      </box>
    </box>
  )
}
