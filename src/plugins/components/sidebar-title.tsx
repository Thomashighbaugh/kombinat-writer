/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { phaseLabel, stateLabel, BOLD } from '../utils/format.js'

/** Renders the sidebar header with project name, phase, state, and chapter counts. */
export function SidebarTitle(props: { session_id: string; title: string; state: SidebarState }) {
  const project = props.state.project

  return (
    <box flexDirection="column">
      <text style={{ fg: 'cyan', attributes: BOLD }}>
        {'Kombinat Writer'}
      </text>
      <Show when={project()} fallback={<text style={{ fg: 'gray' }}>{'No project detected'}</text>}>
        <text style={{ fg: 'white' }}>
          {`${phaseLabel(project()!.phase)} — ${stateLabel(project()!.state)}`}
        </text>
        <text style={{ fg: 'gray' }}>
          {`${String(project()!.chapters)} ch · ${String(project()!.critiqueRounds)} crit · ${String(project()!.revisions)} rev`}
        </text>
      </Show>
    </box>
  )
}
