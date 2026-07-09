/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo, createSignal } from 'solid-js'
import type { SidebarState, GateRunResult } from '../hooks/use-project-state.js'
import { statusIcon, statusColor, truncate, BOLD } from '../utils/format.js'

const GATE_LIST = [
  { id: 'outline', name: 'Outline Gate', category: 'Structure' },
  { id: 'pre-draft', name: 'Pre-Draft Gate', category: 'Drafting' },
  { id: 'post-draft', name: 'Post-Draft Gate', category: 'Drafting' },
  { id: 'revision-verify', name: 'Revision Verify', category: 'Revision' },
  { id: 'continuity-check', name: 'Continuity Check', category: 'Consistency' },
  { id: 'non-negotiables', name: 'Non-Negotiables', category: 'Constraints' },
] as const

const CATEGORIES = ['Structure', 'Drafting', 'Revision', 'Consistency', 'Constraints'] as const

/** Renders the Quality Gates tab with per-category gate list, run-all control, and detail view. */
export function GatesTab(props: { state: SidebarState }) {
  const [selectedGate, setSelectedGate] = createSignal<string | null>(null)
  const [running, setRunning] = createSignal(false)
  const gateResults = props.state.gateResults

  const selectedDetail = createMemo(() => {
    const id = selectedGate()
    if (!id) return null
    return gateResults()[id] || null
  })

  const handleRunAll = async () => {
    setRunning(true)
    try {
      await props.state.runAllGates()
    } finally {
      setRunning(false)
    }
  }

  const handleRunSingle = async (gateId: string) => {
    setRunning(true)
    try {
      await props.state.runSingleGate(gateId)
      setSelectedGate(gateId)
    } finally {
      setRunning(false)
    }
  }

  return (
    <box flexDirection="column">
      <text style={{ fg: 'cyan', attributes: BOLD }}>{'── Quality Gates ──'}</text>

      <box marginTop={1}>
        <text
          style={{ fg: running() ? 'yellow' : 'green', attributes: BOLD }}
          on:select={() => handleRunAll()}
        >
          {running() ? '⟳ Running...' : '[R] Run All Gates'}
        </text>
      </box>

      <For each={CATEGORIES}>
        {(cat) => (
          <box flexDirection="column" marginTop={1}>
            <text style={{ fg: 'cyan' }}>{`─ ${cat} ─`}</text>
            <For each={GATE_LIST.filter(g => g.category === cat)}>
              {(gateDef) => {
                const result = () => gateResults()[gateDef.id]
                return (
                  <text
                    style={{ fg: result() ? statusColor(result()!.status) : 'gray' }}
                    on:select={() => handleRunSingle(gateDef.id)}
                  >
                    {result() ? `${statusIcon(result()!.status)} ${gateDef.name}` : `○ ${gateDef.name}`}
                  </text>
                )
              }}
            </For>
          </box>
        )}
      </For>

      {/* ─── Detail View ─── */}
      <Show when={selectedDetail()} keyed>
        {(detail: GateRunResult) => (
          <box marginTop={1} flexDirection="column">
            <text style={{ fg: 'cyan', attributes: BOLD }}>{'── Details ──'}</text>
            <text style={{ fg: statusColor(detail.status), attributes: BOLD }}>
              {`${statusIcon(detail.status)} ${detail.gateName}`}
            </text>
            <text style={{ fg: 'white' }}>
              {truncate(detail.detail, 200)}
            </text>
            <Show when={detail.fixHint}>
              <text style={{ fg: 'yellow' }}>
                {`Fix: ${truncate(detail.fixHint!, 150)}`}
              </text>
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}
