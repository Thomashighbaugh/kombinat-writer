/** @jsxImportSource @opentui/solid */
import { For, Show, createMemo, createSignal } from 'solid-js'
import type { SidebarState, GateRunResult } from '../hooks/use-project-state.js'
import { statusIcon, statusColor, truncate, BOLD } from '../utils/format.js'
import { c } from '../utils/colors.js'

const GATE_LIST = [
  { id: 'outline', name: 'Outline Gate', category: 'Structure' },
  { id: 'pre-draft', name: 'Pre-Draft Gate', category: 'Drafting' },
  { id: 'post-draft', name: 'Post-Draft Gate', category: 'Drafting' },
  { id: 'revision-verify', name: 'Revision Verify', category: 'Revision' },
  { id: 'continuity-check', name: 'Continuity Check', category: 'Consistency' },
  { id: 'non-negotiables', name: 'Non-Negotiables', category: 'Constraints' },
] as const

/**
 * Quality Gates tab. Uses a <select> dropdown for gate actions (which fires
 * real ITEM_SELECTED events — unlike <box on:select> which is a dead listener).
 *
 * The <select> is styled as an inline action picker. The last run result for
 * each gate is displayed below as a compact list.
 */
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
    if (running()) return
    setRunning(true)
    try {
      await props.state.runAllGates()
    } finally {
      setRunning(false)
    }
  }

  const handleRunSingle = async (gateId: string) => {
    if (running()) return
    setRunning(true)
    try {
      await props.state.runSingleGate(gateId)
      setSelectedGate(gateId)
    } finally {
      setRunning(false)
    }
  }

  // Build select options: Run All + individual gates
  const selectOptions = () => [
    { name: '▶ Run All Gates', value: '__all__', description: 'Run all quality gates in sequence' },
    ...GATE_LIST.map(g => {
      const r = gateResults()[g.id]
      const prefix = r ? statusIcon(r.status) + ' ' : '○ '
      // Use status color if we have a result
      return { name: prefix + g.name, value: g.id, description: g.category }
    }),
  ]

  return (
    <box flexDirection="column">
      <text style={{ fg: c.header, attributes: BOLD }}>{'── Quality Gates ──'}</text>

      {/* ─── Gate action selector (actually clickable) ─────────────── */}
      <select
        options={selectOptions()}
        onSelect={(_i: number, opt: { value?: string } | null) => {
          if (!opt?.value) return
          if (opt.value === '__all__') {
            handleRunAll()
          } else {
            handleRunSingle(opt.value)
          }
        }}
      />

      {/* ─── Running indicator ──────────────────────────────────────── */}
      <Show when={running()}>
        <text style={{ fg: c.warn }}>{'⟳ Running...'}</text>
      </Show>

      {/* ─── Last result summary per gate ────────────────────────────── */}
      <For each={GATE_LIST}>
        {(gateDef) => {
          const result = () => gateResults()[gateDef.id]
          return (
            <Show when={result()}>
              <box flexDirection="row" paddingLeft={1} marginTop={1}>
                <text style={{ fg: statusColor(result()!.status) }}>
                  {statusIcon(result()!.status)}
                </text>
                <text style={{ fg: c.text }}>{' ' + result()!.gateName}</text>
                <text style={{ fg: c.textMuted }}>
                  {result()!.detail ? ' — ' + truncate(result()!.detail, 100) : ''}
                </text>
              </box>
            </Show>
          )
        }}
      </For>

      {/* ─── Detail View ──────────────────────────────────────────────── */}
      <Show when={selectedDetail()} keyed>
        {(detail: GateRunResult) => (
          <box marginTop={1} flexDirection="column">
            <text style={{ fg: c.header, attributes: BOLD }}>{'── Details ──'}</text>
            <text style={{ fg: statusColor(detail.status), attributes: BOLD }}>
              {`${statusIcon(detail.status)} ${detail.gateName}`}
            </text>
            <text style={{ fg: c.text }}>
              {truncate(detail.detail, 200)}
            </text>
            <Show when={detail.fixHint}>
              <text style={{ fg: c.warn }}>
                {`Fix: ${truncate(detail.fixHint!, 150)}`}
              </text>
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}
