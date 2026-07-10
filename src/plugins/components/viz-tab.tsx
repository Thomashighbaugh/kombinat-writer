/** @jsxImportSource @opentui/solid */
import { For, Show, createSignal } from 'solid-js'
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

type VizSubTab = 'pacing' | 'threads' | 'provenance' | 'cognitive' | 'escalation'

/** Renders the Visualizations tab with sub-tab navigation for pacing, threads, provenance, cognitive, and escalation. */
export function VizTab(props: { state: SidebarState }) {
  const [subTab, setSubTab] = createSignal<VizSubTab>('pacing')
  const viz = props.state.vizData

  const subTabColor = (s: VizSubTab) => subTab() === s ? c.cyan : c.alt

  return (
    <box flexDirection="column">
      <text style={{ fg: c.header, attributes: BOLD }}>{'── Visualizations ──'}</text>

      {/* Sub-tab selector */}
      <box marginTop={1} flexDirection="row">
        <text style={{ fg: subTabColor('pacing') }} on:select={() => setSubTab('pacing')}>{'1:Pacing'}</text>
        <text>{' '}</text>
        <text style={{ fg: subTabColor('threads') }} on:select={() => setSubTab('threads')}>{'2:Threads'}</text>
        <text>{' '}</text>
        <text style={{ fg: subTabColor('provenance') }} on:select={() => setSubTab('provenance')}>{'3:Prov'}</text>
        <text>{' '}</text>
        <text style={{ fg: subTabColor('cognitive') }} on:select={() => setSubTab('cognitive')}>{'4:Cog'}</text>
        <text>{' '}</text>
        <text style={{ fg: subTabColor('escalation') }} on:select={() => setSubTab('escalation')}>{'5:Esc'}</text>
      </box>

      <Show
        when={viz()}
        fallback={
          <box marginTop={1} flexDirection="column">
            <text style={{ fg: c.textMuted }}>{'No visualization data.'}</text>
            <text style={{ fg: c.textMuted }}>
              {'Run /kombinat verify or /kombinat review to generate data.'}
            </text>
          </box>
        }
        keyed
      >
        {(v) => (
          <box marginTop={1} flexDirection="column">
            {/* ─── Pacing ─── */}
            <Show when={subTab() === 'pacing'}>
              <text style={{ fg: c.cyan }}>{'Pacing Heartbeat'}</text>
              <text style={{ fg: c.textMuted }}>{'Chapter intensity over time'}</text>
              <box marginTop={1} flexDirection="column">
                <For each={pacingChart(v.pacing)}>
                  {(line) => <text style={{ fg: c.green }}>{line}</text>}
                </For>
              </box>
            </Show>

            {/* ─── Thread Matrix ─── */}
            <Show when={subTab() === 'threads'}>
              <text style={{ fg: c.cyan }}>{'Thread Matrix'}</text>
              <text style={{ fg: c.textMuted }}>{'Story thread presence per chapter'}</text>
              <box marginTop={1} flexDirection="column">
                <For each={threadMatrix(v.threads, 20)}>
                  {(line) => <text style={{ fg: c.textBright }}>{line}</text>}
                </For>
              </box>
              <text style={{ fg: c.textMuted }}>{'█ = present  ░ = absent'}</text>
            </Show>

            {/* ─── Provenance ─── */}
            <Show when={subTab() === 'provenance'}>
              <text style={{ fg: c.cyan }}>{'Provenance'}</text>
              <text style={{ fg: c.textMuted }}>{'Author vs AI contribution'}</text>
              <Show when={v.provenance} fallback={<text style={{ fg: c.textMuted }}>{'No provenance data'}</text>} keyed>
                {(p) => (
                  <box flexDirection="column">
                    <box marginTop={1}>
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
                    </box>
                    <text style={{ fg: c.green }}>{`🟢 Author: ${String(p.author + p.authorRevised)}`}</text>
                    <text style={{ fg: c.blue }}>{`🔵 AI: ${String(p.aiDrafted + p.aiRevised + p.aiEdited + p.aiModified)}`}</text>
                    <text style={{ fg: c.textMuted }}>{`Total: ${String(p.totalLines)} lines`}</text>
                  </box>
                )}
              </Show>
            </Show>

            {/* ─── Cognitive Load ─── */}
            <Show when={subTab() === 'cognitive'}>
              <text style={{ fg: c.cyan }}>{'Cognitive Load'}</text>
              <text style={{ fg: c.textMuted }}>{'Reader cognitive load per chapter'}</text>
              <box marginTop={1}>
                <text style={{ fg: c.yellow }}>
                  {cognitiveLoadSparkline(v.cognitiveLoad)}
                </text>
              </box>
              <text style={{ fg: c.textMuted }}>{'▁ low · ▄ med · █ high'}</text>
            </Show>

            {/* ─── Escalation Curve ─── */}
            <Show when={subTab() === 'escalation'}>
              <text style={{ fg: c.cyan }}>{'Escalation Curve'}</text>
              <text style={{ fg: c.textMuted }}>{'Tension across story beats'}</text>
              <box marginTop={1} flexDirection="column">
                <For each={escalationCurve(v.escalation)}>
                  {(line) => <text style={{ fg: c.red }}>{line}</text>}
                </For>
              </box>
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}
