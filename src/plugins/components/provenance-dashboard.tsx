/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { provenanceBar } from '../utils/chart-rendering.js'
import { BOLD } from '../utils/format.js'
import { c } from '../utils/colors.js'

/** Renders the full provenance dashboard with stacked bar and per-category line counts. */
export function ProvenanceDashboard(props: { state: SidebarState }) {
  const prov = props.state.provenanceData
  return (
    <Show
      when={prov()}
      fallback={<text style={{ fg: c.textMuted }}>{'No provenance data — run /kombinat verify'}</text>}
      keyed
    >
      {(p) => (
        <box flexDirection="column">
          <text style={{ fg: c.header, attributes: BOLD }}>{'── Provenance ──'}</text>
          <text style={{ fg: c.textBright }}>
            {provenanceBar({
              author: p.author,
              aiDrafted: p.aiDrafted,
              aiRevised: p.aiRevised,
              aiEdited: p.aiEdited,
              aiModified: p.aiModified,
              authorRevised: p.authorRevised,
            })}
          </text>
          <text style={{ fg: c.green }}>{`🟢 Author:     ${String(p.author + p.authorRevised)} (${String(p.percentages.author)}%)`}</text>
          <text style={{ fg: c.blue }}>{`🔵 AI Drafted: ${String(p.aiDrafted)}`}</text>
          <text style={{ fg: c.blue }}>{`🔵 AI Revised: ${String(p.aiRevised)}`}</text>
          <text style={{ fg: c.blue }}>{`🔵 AI Edited:  ${String(p.aiEdited)}`}</text>
          <text style={{ fg: c.blue }}>{`🔵 AI Modified: ${String(p.aiModified)}`}</text>
          <text style={{ fg: c.textMuted }}>{`Total lines: ${String(p.totalLines)}`}</text>
        </box>
      )}
    </Show>
  )
}
