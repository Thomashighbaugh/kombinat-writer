import { createSignal, createMemo, onMount } from 'solid-js'
import { detectState, type ProjectState } from '../../lib/project-state.js'
import { runGate, type GateResult } from '../../lib/quality-gates.js'

export type Tab = 'dashboard' | 'gates' | 'diff' | 'viz'

export interface GateRunResult {
  gateId: string
  gateName: string
  category: string
  status: 'pass' | 'block' | 'warn'
  detail: string
  fixHint?: string
}

export interface SidebarState {
  projectRoot: string
  project: () => ProjectState | null
  refreshProject: () => void
  activeTab: () => Tab
  setActiveTab: (t: Tab) => void
  gateResults: () => Record<string, GateRunResult>
  runAllGates: () => Promise<void>
  runSingleGate: (gateId: string) => Promise<void>
  gateSummary: () => { passed: number; blocked: number; warnings: number; total: number }
  diffData: () => DiffData | null
  refreshDiff: () => void
  provenanceData: () => ProvenanceSummary | null
  refreshProvenance: () => void
  vizData: () => VizData | null
  refreshViz: () => void
  injectCommand: (cmd: string) => void
}

export interface DiffHunk {
  id: string
  startLine: number
  endLine: number
  before: string[]
  after: string[]
  status: 'pending' | 'approved' | 'rejected'
  severity?: string
}

export interface DiffData {
  file: string
  hunks: DiffHunk[]
  totalHunks: number
  approved: number
  rejected: number
  pending: number
}

export interface ProvenanceSummary {
  totalLines: number
  author: number
  aiDrafted: number
  aiRevised: number
  aiEdited: number
  aiModified: number
  authorRevised: number
  percentages: { author: number; ai: number }
}

export interface VizData {
  pacing: { chapter: number; intensity: number }[]
  threads: { threadId: string; threadName: string; chapters: number[] }[]
  provenance: ProvenanceSummary | null
  cognitiveLoad: { chapter: number; load: number }[]
  escalation: { beat: number; tension: number }[]
}

// ─── Singleton state signals ─────────────────────────────────────────────────

const [project, setProject] = createSignal<ProjectState | null>(null)
const [gateResults, setGateResults] = createSignal<Record<string, GateRunResult>>({})
const [diffData, setDiffData] = createSignal<DiffData | null>(null)
const [provenanceData, setProvenanceData] = createSignal<ProvenanceSummary | null>(null)
const [vizData, setVizData] = createSignal<VizData | null>(null)

// Reference to api.client.tui.appendPrompt — set by entry plugin
let injectFn: ((cmd: string) => void) | null = null
export function setInjector(fn: (cmd: string) => void) {
  injectFn = fn
}

const gateDefinitions = [
  { id: 'outline', name: 'Outline Gate', category: 'Structure' },
  { id: 'pre-draft', name: 'Pre-Draft Gate', category: 'Drafting' },
  { id: 'post-draft', name: 'Post-Draft Gate', category: 'Drafting' },
  { id: 'revision-verify', name: 'Revision Verify', category: 'Revision' },
  { id: 'continuity-check', name: 'Continuity Check', category: 'Consistency' },
  { id: 'non-negotiables', name: 'Non-Negotiables', category: 'Constraints' },
]

export function useProjectState(
  projectRoot: string,
  activeTab: () => Tab,
  setActiveTab: (t: Tab) => void
): SidebarState {
  const refreshProject = () => {
    try {
      const state = detectState(projectRoot)
      setProject(state)
    } catch (e) {
      setProject(null)
    }
  }

  const runSingleGate = async (gateId: string) => {
    const def = gateDefinitions.find(g => g.id === gateId)
    if (!def) return
    try {
      const result: GateResult = runGate(gateId as any, projectRoot)
      const status: 'pass' | 'block' | 'warn' = result.blocking.length > 0
        ? 'block'
        : result.warnings.length > 0
          ? 'warn'
          : 'pass'
      const detail = result.blocking.join('; ') || result.warnings.join('; ') || result.evidence.join('; ') || 'Passed'
      const fixHint = result.blocking[0] || result.warnings[0] || undefined
      setGateResults(prev => ({
        ...prev,
        [gateId]: { gateId, gateName: def.name, category: def.category, status, detail, fixHint },
      }))
    } catch (e) {
      setGateResults(prev => ({
        ...prev,
        [gateId]: {
          gateId,
          gateName: def.name,
          category: def.category,
          status: 'warn',
          detail: `Error: ${e instanceof Error ? e.message : String(e)}`,
        },
      }))
    }
  }

  const runAllGates = async () => {
    for (const def of gateDefinitions) {
      await runSingleGate(def.id)
    }
  }

  const gateSummary = createMemo(() => {
    const results = Object.values(gateResults())
    const passed = results.filter(r => r.status === 'pass').length
    const blocked = results.filter(r => r.status === 'block').length
    const warnings = results.filter(r => r.status === 'warn').length
    return { passed, blocked, warnings, total: results.length }
  })

  const refreshDiff = () => {
    try {
      // dynamic import to avoid pulling diff-approval heavy deps at startup
      // For now, set to null until user opens diff tab
      setDiffData(null)
    } catch {
      setDiffData(null)
    }
  }

  const refreshProvenance = () => {
    try {
      // Will be populated when provenance lib is called
      setProvenanceData(null)
    } catch {
      setProvenanceData(null)
    }
  }

  const refreshViz = () => {
    try {
      setVizData(null)
    } catch {
      setVizData(null)
    }
  }

  const injectCommand = (cmd: string) => {
    if (injectFn) injectFn(cmd)
  }

  onMount(() => {
    refreshProject()
  })

  return {
    projectRoot,
    project,
    refreshProject,
    activeTab,
    setActiveTab,
    gateResults,
    runAllGates,
    runSingleGate,
    gateSummary,
    diffData,
    refreshDiff,
    provenanceData,
    refreshProvenance,
    vizData,
    refreshViz,
    injectCommand,
  }
}