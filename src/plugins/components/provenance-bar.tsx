/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { provenanceBar } from '../utils/chart-rendering.js'

/** Renders a compact provenance bar showing author vs AI contribution split. */
export function ProvenanceBar(props: { state: SidebarState }) {
  const prov = props.state.provenanceData
  return (
    <Show
      when={prov()}
      fallback={<text style={{ fg: 'gray' }}>No provenance data</text>}
      keyed
    >
      {(p) => (
        <box flexDirection="column">
          <text style={{ fg: 'cyan' }}>Provenance</text>
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
          <text style={{ fg: 'green' }}>
            🟢 Author: {p.author + p.authorRevised} ({p.percentages.author}%)
          </text>
          <text style={{ fg: 'blue' }}>
            🔵 AI: {p.aiDrafted + p.aiRevised + p.aiEdited + p.aiModified} ({p.percentages.ai}%)
          </text>
        </box>
      )}
    </Show>
  )
}