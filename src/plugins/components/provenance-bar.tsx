/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { provenanceBar } from '../utils/chart-rendering.js'
import { c } from '../utils/colors.js'

/** Renders a compact provenance bar showing author vs AI contribution split. */
export function ProvenanceBar(props: { state: SidebarState }) {
  const prov = props.state.provenanceData
  return (
    <Show
      when={prov()}
      fallback={<text style={{ fg: c.textMuted }}>{'No provenance data'}</text>}
      keyed
    >
      {(p) => (
        <box flexDirection="column">
          <text style={{ fg: c.cyan }}>{'Provenance'}</text>
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
          <text style={{ fg: c.green }}>
            {`🟢 Author: ${String(p.author + p.authorRevised)} (${String(p.percentages.author)}%)`}
          </text>
          <text style={{ fg: c.blue }}>
            {`🔵 AI: ${String(p.aiDrafted + p.aiRevised + p.aiEdited + p.aiModified)} (${String(p.percentages.ai)}%)`}
          </text>
        </box>
      )}
    </Show>
  )
}
