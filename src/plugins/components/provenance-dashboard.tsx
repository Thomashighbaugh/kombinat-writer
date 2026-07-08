/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { provenanceBar } from '../utils/chart-rendering.js'
import { BOLD } from '../utils/format.js'

/** Renders the full provenance dashboard with stacked bar and per-category line counts. */
export function ProvenanceDashboard(props: { state: SidebarState }) {
  const prov = props.state.provenanceData
  return (
    <Show
      when={prov()}
      fallback={<text style={{ fg: 'gray' }}>No provenance data — run /kombinat verify</text>}
      keyed
    >
      {(p) => (
        <box flexDirection="column">
          <text style={{ fg: 'cyan', attributes: BOLD }}>── Provenance ──</text>
          <text style={{ fg: 'white' }}>
            {provenanceBar({
              author: p.author,
              aiDrafted: p.aiDrafted,
              aiRevised: p.aiRevised,
              aiEdited: p.aiEdited,
              aiModified: p.aiModified,
              authorRevised: p.authorRevised,
            })}
          </text>
          <text style={{ fg: 'green' }}>🟢 Author:     {p.author + p.authorRevised} ({p.percentages.author}%)</text>
          <text style={{ fg: 'blue' }}>🔵 AI Drafted: {p.aiDrafted}</text>
          <text style={{ fg: 'blue' }}>🔵 AI Revised: {p.aiRevised}</text>
          <text style={{ fg: 'blue' }}>🔵 AI Edited:  {p.aiEdited}</text>
          <text style={{ fg: 'blue' }}>🔵 AI Modified: {p.aiModified}</text>
          <text style={{ fg: 'gray' }}>Total lines: {p.totalLines}</text>
        </box>
      )}
    </Show>
  )
}