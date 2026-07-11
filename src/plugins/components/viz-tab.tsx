/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import {
  pacingChart,
  threadMatrix,
  provenanceBar,
  cognitiveLoadSparkline,
  escalationCurve,
} from '../utils/chart-rendering.js'
import { BOLD } from '../utils/format.js'
import { c } from '../utils/colors.js'

/**
 * Renders the Visualizations section. All five chart types are shown
 * stacked vertically in a single column (no sub-tabs). The section is
 * only rendered by SidebarContent when viz data exists, so an empty
 * `vizData()` here means "old data after refresh" and we just show muted
 * headers without charts.
 */
export function VizTab(props: { state: SidebarState }) {
  const viz = props.state.vizData

  return (
    <box flexDirection="column">
      <text style={{ fg: c.header, attributes: BOLD }}>{'── Visualizations ──'}</text>

      <Show when={viz() && viz()!.chapters && viz()!.chapters! > 0} fallback={
        <text style={{ fg: c.textMuted }}>{'No visualization data yet.'}</text>
      }>
        {/* ─── Pacing ─── */}
        <Show when={viz()!.pacing.length > 0}>
          <text style={{ fg: c.cyan, attributes: BOLD }}>{'Pacing'}</text>
          <box flexDirection="column">
            <For each={pacingChart(viz()!.pacing)}>
              {(line) => <text style={{ fg: c.green }}>{line}</text>}
            </For>
          </box>
        </Show>

        {/* ─── Thread Matrix ─── */}
        <Show when={viz()!.threads.length > 0}>
          <text style={{ fg: c.cyan, attributes: BOLD }}>{'Threads'}</text>
          <box flexDirection="column">
            <For each={threadMatrix(viz()!.threads, viz()!.chapters ?? 20)}>
              {(line) => <text style={{ fg: c.textBright }}>{line}</text>}
            </For>
          </box>
          <text style={{ fg: c.textMuted }}>{'█ = present  ░ = absent'}</text>
        </Show>

        {/* ─── Cognitive Load ─── */}
        <Show when={viz()!.cognitiveLoad.length > 0}>
          <text style={{ fg: c.cyan, attributes: BOLD }}>{'Cognitive Load'}</text>
          <text style={{ fg: c.yellow }}>
            {cognitiveLoadSparkline(viz()!.cognitiveLoad)}
          </text>
          <text style={{ fg: c.textMuted }}>{'▁ low · ▄ med · █ high'}</text>
        </Show>

        {/* ─── Escalation Curve ─── */}
        <Show when={viz()!.escalation.length > 0}>
          <text style={{ fg: c.cyan, attributes: BOLD }}>{'Escalation'}</text>
          <box flexDirection="column">
            <For each={escalationCurve(viz()!.escalation)}>
              {(line) => <text style={{ fg: c.red }}>{line}</text>}
            </For>
          </box>
        </Show>

        {/* ─── Provenance ─── */}
        <Show when={viz()!.provenance}>
          <text style={{ fg: c.cyan, attributes: BOLD }}>{'Provenance'}</text>
          <text style={{ fg: c.textBright }}>
            {provenanceBar({
              author: viz()!.provenance!.author,
              aiDrafted: viz()!.provenance!.aiDrafted,
              aiRevised: viz()!.provenance!.aiRevised,
              aiEdited: viz()!.provenance!.aiEdited,
              aiModified: viz()!.provenance!.aiModified,
              authorRevised: viz()!.provenance!.authorRevised,
            })}
          </text>
          <text style={{ fg: c.green }}>
            {`🟢 Author: ${String(viz()!.provenance!.author + viz()!.provenance!.authorRevised)}`}
          </text>
          <text style={{ fg: c.blue }}>
            {`🔵 AI: ${String(viz()!.provenance!.aiDrafted + viz()!.provenance!.aiRevised + viz()!.provenance!.aiEdited + viz()!.provenance!.aiModified)}`}
          </text>
        </Show>
      </Show>
    </box>
  )
}
