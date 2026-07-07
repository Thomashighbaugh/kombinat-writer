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

type VizSubTab = 'pacing' | 'threads' | 'provenance' | 'cognitive' | 'escalation'

export function VizTab(props: { state: SidebarState }) {
  const [subTab, setSubTab] = createSignal<VizSubTab>('pacing')
  const viz = props.state.vizData

  return (
    <box flexDirection="column">
      <text style={{ fg: 'cyan', attributes: BOLD }}>── Visualizations ──</text>

      {/* Sub-tab selector */}
      <box marginTop={1} flexDirection="row">
        <text
          style={{ fg: subTab() === 'pacing' ? 'cyan' : 'gray' }}
          on:select={() => setSubTab('pacing')}
        >1:Pacing</text>
        <text>{' '}</text>
        <text
          style={{ fg: subTab() === 'threads' ? 'cyan' : 'gray' }}
          on:select={() => setSubTab('threads')}
        >2:Threads</text>
        <text>{' '}</text>
        <text
          style={{ fg: subTab() === 'provenance' ? 'cyan' : 'gray' }}
          on:select={() => setSubTab('provenance')}
        >3:Prov</text>
        <text>{' '}</text>
        <text
          style={{ fg: subTab() === 'cognitive' ? 'cyan' : 'gray' }}
          on:select={() => setSubTab('cognitive')}
        >4:Cog</text>
        <text>{' '}</text>
        <text
          style={{ fg: subTab() === 'escalation' ? 'cyan' : 'gray' }}
          on:select={() => setSubTab('escalation')}
        >5:Esc</text>
      </box>

      <Show
        when={viz()}
        fallback={
          <box marginTop={1}>
            <text style={{ fg: 'gray' }}>No visualization data.</text>
            <text style={{ fg: 'gray' }}>
              Run /kombinat verify or /kombinat review to generate data.
            </text>
          </box>
        }
        keyed
      >
        {(v) => (
          <box marginTop={1} flexDirection="column">
            {/* ─── Pacing ─── */}
            <Show when={subTab() === 'pacing'}>
              <text style={{ fg: 'cyan' }}>Pacing Heartbeat</text>
              <text style={{ fg: 'gray' }}>Chapter intensity over time</text>
              <box marginTop={1} flexDirection="column">
                <For each={pacingChart(v.pacing)}>
                  {(line) => <text style={{ fg: 'green' }}>{line}</text>}
                </For>
              </box>
            </Show>

            {/* ─── Thread Matrix ─── */}
            <Show when={subTab() === 'threads'}>
              <text style={{ fg: 'cyan' }}>Thread Matrix</text>
              <text style={{ fg: 'gray' }}>Story thread presence per chapter</text>
              <box marginTop={1} flexDirection="column">
                <For each={threadMatrix(v.threads, 20)}>
                  {(line) => <text style={{ fg: 'white' }}>{line}</text>}
                </For>
              </box>
              <text style={{ fg: 'gray' }}>█ = present  ░ = absent</text>
            </Show>

            {/* ─── Provenance ─── */}
            <Show when={subTab() === 'provenance'}>
              <text style={{ fg: 'cyan' }}>Provenance</text>
              <text style={{ fg: 'gray' }}>Author vs AI contribution</text>
              <Show when={v.provenance} fallback={<text style={{ fg: 'gray' }}>No provenance data</text>} keyed>
                {(p) => (
                  <box flexDirection="column">
                    <box marginTop={1}>
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
                    </box>
                    <text style={{ fg: 'green' }}>🟢 Author: {p.author + p.authorRevised}</text>
                    <text style={{ fg: 'blue' }}>🔵 AI: {p.aiDrafted + p.aiRevised + p.aiEdited + p.aiModified}</text>
                    <text style={{ fg: 'gray' }}>Total: {p.totalLines} lines</text>
                  </box>
                )}
              </Show>
            </Show>

            {/* ─── Cognitive Load ─── */}
            <Show when={subTab() === 'cognitive'}>
              <text style={{ fg: 'cyan' }}>Cognitive Load</text>
              <text style={{ fg: 'gray' }}>Reader cognitive load per chapter</text>
              <box marginTop={1}>
                <text style={{ fg: 'yellow' }}>
                  {cognitiveLoadSparkline(v.cognitiveLoad)}
                </text>
              </box>
              <text style={{ fg: 'gray' }}>▁ low · ▄ med · █ high</text>
            </Show>

            {/* ─── Escalation Curve ─── */}
            <Show when={subTab() === 'escalation'}>
              <text style={{ fg: 'cyan' }}>Escalation Curve</text>
              <text style={{ fg: 'gray' }}>Tension across story beats</text>
              <box marginTop={1} flexDirection="column">
                <For each={escalationCurve(v.escalation)}>
                  {(line) => <text style={{ fg: 'red' }}>{line}</text>}
                </For>
              </box>
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}