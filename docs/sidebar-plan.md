# Kombinat Writer Sidebar — Implementation Plan

## Architecture

OpenCode's TUI provides three sidebar slots that plugins can render into:

| Slot             | Props                        | Purpose                           |
| ---------------- | ---------------------------- | --------------------------------- |
| `sidebar_title`  | `{ session_id, title }`       | Header — project name, phase, progress |
| `sidebar_content`| `{ session_id }`             | Main body — tabbed views               |
| `sidebar_footer` | `{ session_id }`             | Footer — quick stats, gate status     |

The sidebar plugin registers components into these slots via `api.slots.register()`. Rendering uses `@opentui/solid` (SolidJS JSX in the terminal — not browser HTML, but JSX components rendered to the terminal via OpenTui's rendering engine).

**Plugin file**: `src/plugins/kombinat-sidebar.tsx`
**Plugin type**: `TuiPluginModule` (from `@opencode-ai/plugin/tui`)
**Registration**: Via `api.slots.register()` in the plugin entry point

---

## Sidebar Layout

```
┌─────────────────────────────────────────────┐
│  sidebar_title slot                          │
│  ┌─────────────────────────────────────────┐ │
│  │ Kombinat Writer                         │ │
│  │ "The Last Summons"  · Fiction           │ │
│  │ Phase: DRAFT  ·  Ch 7/24  ·  48.2k wds │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  sidebar_content slot                        │
│  ┌─────────────────────────────────────────┐ │
│  │ [1]Dashboard [2]Gates [3]Diff [4]Viz   │ │ ← tab bar
│  ├─────────────────────────────────────────┤ │
│  │                                         │ │
│  │  (tab content renders here)             │ │
│  │                                         │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│  sidebar_footer slot                         │
│  ┌─────────────────────────────────────────┐ │
│  │ Gates: ✓ 8  ✗ 1  ⚠ 2  |  Veto: \|  │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Tabs (sidebar_content)

The sidebar has 4 tabs, switchable via number keys `1`–`4` or arrow navigation. Each tab is a SolidJS component.

### Tab 1: Dashboard (`<DashboardTab />`)

Shows the current project state, active phase, and phase preview.

```
┌─────────────────────────────────────────┐
│  PROJECT STATUS                         │
│                                         │
│  Track:      Fiction                    │
│  Chapters:   12/24 (50%)                │
│  Words:      48,200 / ~80,000          │
│  Phase:      DRAFT                     │
│  Batch:      Ch 7-12 (6 chapters)      │
│  Est. time:  ~36 min                   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  PHASE PREVIEW                          │
│                                         │
│  Chapters: 7, 8, 9, 10, 11, 12         │
│  Gates to run:                          │
│    pre-draft  post-draft  prose-quality │
│    echo  beat-arc  non-negotiables      │
│                                         │
│  Context to load:                       │
│    constitution.md  specification.md    │
│    outline/  knowledge/  tracking/      │
│    style-sheet/  awareness maps         │
│                                         │
│  [▶ Start Phase]  [✕ Cancel]           │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  AUTHORIAL INTENT                       │
│                                         │
│  > Make chapter 7 feel claustrophobic   │
│  [or type "generic" for default]        │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  PROVENANCE                             │
│                                         │
│  Author: 38%  ████████░░░░░░░░░░░░     │
│  AI:      62%  ██████████████░░░░░░░░   │
│  AI-mod:  12%                           │
└─────────────────────────────────────────┘
```

**Data sources**:
- `project-state.ts` → track, chapter count, word count, phase
- `phase-preview.ts` → `buildDraftPreview()` / `buildRevisePreview()` / `buildEditPreview()`
- `authorial-intent.ts` → `loadLatestIntent()` or `captureIntent()`
- `provenance.ts` → `aggregateProvenance()` across all chapters

**SolidJS components**:
- `<ProjectStatus />` — reads `book/track.json`, scans `book/content/`
- `<PhasePreview />` — renders `formatPreviewForDisplay()` output
- `<IntentInput />` — text input via `api.ui.DialogPrompt` or inline
- `<ProvenanceBar />` — horizontal bar chart using box-drawing chars

---

### Tab 2: Gates (`<GatesTab />`)

Shows quality gate results as visual cards — green (pass), red (block), yellow (warning).

```
┌─────────────────────────────────────────┐
│  QUALITY GATES                           │
│                                         │
│  ┌───────────┐ ┌───────────┐ ┌─────────┐│
│  │ ✓ PRE     │ │ ✓ POST    │ │ ✓ ECHO  ││
│  │ DRAFT     │ │ DRAFT     │ │         ││
│  │ 13/13     │ │ XML OK    │ │ 0 echo  ││
│  └───────────┘ └───────────┘ └─────────┘│
│                                         │
│  ┌───────────┐ ┌───────────┐ ┌─────────┐│
│  │ ✗ PROSE   │ │ ✓ BEAT    │ │ ✓ NON   ││
│  │ QUALITY   │ │ ARC       │ │ NEGOT   ││
│  │ 4.2/1000  │ │ arc OK    │ │ 0 viol  ││
│  └───────────┘ └───────────┘ └─────────┘│
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ✗ PROSE QUALITY — BLOCK          │  │
│  │                                   │  │
│  │ Metric: Filter word density       │  │
│  │ Value:  4.2/1000 words            │  │
│  │ Limit:  3.0/1000 words            │  │
│  │                                   │  │
│  │ Examples:                          │  │
│  │  L12: "very slowly" → "crept"     │  │
│  │  L34: "just walked" → "strode"    │  │
│  │  L56: "really wanted" → "needed"   │  │
│  │                                   │  │
│  │ Fix: Replace filter words with     │  │
│  │ stronger verbs. See prose-quality  │  │
│  │ scorecard.                         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [R] Run All Gates  [V] Verify Single  │
└─────────────────────────────────────────┘
```

**Data sources**:
- `quality-gates.ts` → `runGate()` for each gate type
- All 26 gate types listed in `verify.ts`

**SolidJS components**:
- `<GateCard />` — single gate result (pass/fail/warn, icon, summary)
- `<GateDetail />` — expanded view of a blocking gate (evidence, examples, fix)
- `<GateGrid />` — grid of `<GateCard />` components
- `<GateActions />` — "Run All" / "Verify Single" buttons

**Interactions**:
- `Enter` on a gate card → expand to `<GateDetail />`
- `R` → run all gates (calls `runGate()` for each type)
- `V` → dialog prompt for gate name, then run that gate

---

### Tab 3: Diff (`<DiffTab />`)

Side-by-side or unified diff for revise/edit passes. Shows hunks with approve/reject/veto actions.

```
┌─────────────────────────────────────────┐
│  DIFF VIEWER — Chapter 7, Edit Pass     │
│  Pass: line-edit  |  Hunk 2/8           │
│                                         │
│  ┌──────────────┬──────────────────────┐ │
│  │ BEFORE       │ AFTER                │ │
│  │              │                      │ │
│  │ Mira walked  │ Mira crept forward,  │ │
│  │  slowly      │  shoulders hunched   │ │
│  │  through the │  against the narrow  │ │
│  │  corridor.   │  walls.              │ │
│  │              │                      │ │
│  │ She was      │ Fear tasted like     │ │
│  │  afraid.     │  copper.             │ │
│  └──────────────┴──────────────────────┘ │
│                                         │
│  Severity: should-consider              │
│  Rationale: Replaced telling with       │
│  showing. Tightened "walked slowly"     │
│  → "crept" (stronger verb).             │
│                                         │
│  [✓ Approve] [✗ Reject] [| Veto]       │
│  [✓ Approve All] [✗ Reject All]        │
│                                         │
│  Veto reason (optional):                │
│  [________________________________]     │
│                                         │
│  ─────────────────────────────────────  │
│  Progress: 2/8 hunks reviewed           │
│  Approved: 1  Rejected: 0  Pending: 6  │
└─────────────────────────────────────────┘
```

**Data sources**:
- `diff-approval.ts` → `generateDiff()`, `approveHunk()`, `rejectHunk()`, `approveAll()`
- `severity-tiers.ts` → tier classification for each hunk's suggestion
- `veto-system.ts` → `parseVetoInput()`, `recordVeto()`
- `feedback-memory.ts` → `logRejection()` when veto has reason

**SolidJS components**:
- `<DiffViewer />` — side-by-side before/after rendering
- `<HunkNavigator />` — navigate between hunks (prev/next, counter)
- `<HunkActions />` — approve/reject/veto buttons
- `<VetoInput />` — text input for veto reason (appears when `|` pressed)
- `<DiffProgress />` — progress bar showing reviewed/total hunks

**Interactions**:
- `Enter` → approve current hunk
- `Backspace` or `r` → reject current hunk
- `|` → open veto input
- `A` → approve all pending
- `↑`/`↓` → navigate between hunks
- `Tab` → toggle before/after focus

---

### Tab 4: Visualizations (`<VizTab />`)

Data visualizations rendered as terminal graphics (box-drawing characters, ANSI colors).

```
┌─────────────────────────────────────────┐
│  VISUALIZATIONS                          │
│                                         │
│  [1]Pacing [2]Threads [3]Engagement     │
│  [4]Provenance [5]Cognitive Load        │
│                                         │
│  ── Pacing Heartbeat ─────────────────  │
│                                         │
│  10 │     ╱╲      ╱╲╱╲                  │
│   8 │    ╱  ╲    ╱      ╲                │
│   6 │   ╱    ╲  ╱        ╲               │
│   4 │  ╱      ╲╱          ╲              │
│   2 │ ╱                    ╲             │
│   0 └─────────────────────────           │
│     1  2  3  4  5  6  7  8  9 10 11 12   │
│              Chapters                    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ── Thread Matrix ─────────────────────  │
│                                         │
│  Thread          Ch1 Ch2 Ch3 Ch4 Ch5    │
│  Summons         ███ ██  ░   ░   ░      │
│  Theron's past   ░   ███ ██  █   ░      │
│  Mira's betrayal ░   ░   ███ ██  █      │
│  The Trial       ░   ░   ░   ███ ██     │
│                                         │
│  ███ = active  ██ = mentioned  ░ = idle │
│                                         │
│  ⚠ Dropped: "Summons" — no activity      │
│    after Ch2                             │
│  ⚠ Over-concentrated: Ch4 has 4 active   │
│    threads (cognitive load risk)         │
└─────────────────────────────────────────┘
```

**Data sources**:
- `beat-arc.ts` → emotional beat arc per chapter (pacing heartbeat)
- `thread-matrix.ts` → thread activity matrix (heatmap)
- `provenance.ts` → author vs AI percentage per chapter (provenance bar)
- `cognitive-load.ts` → character/thread/question count per chapter
- `escalation-curve.ts` → stakes escalation over chapters

**SolidJS components**:
- `<PacingChart />` — line chart using box-drawing chars (╱ ╲ ╴ ╵)
- `<ThreadMatrix />` — heatmap table with █ blocks for activity levels
- `<ProvenanceChart />` — stacked horizontal bar per chapter
- `<CognitiveLoadChart />` — bar chart of load per chapter
- `<VizSubTabs />` — sub-tab navigation (1-5)

**Interactions**:
- `1`–`5` → switch visualization sub-tab
- `↑`/`↓` → scroll if chart overflows

---

## Sidebar Title (`<SidebarTitle />`)

Renders into the `sidebar_title` slot. Always visible.

```
┌─────────────────────────────────────────┐
│ Kombinat Writer                         │
│ "The Last Summons"  ·  Fiction          │
│ Phase: DRAFT  ·  Ch 7/24  ·  48.2k wds  │
└─────────────────────────────────────────┘
```

**Data sources**:
- `project-state.ts` → `detectProjectState()` for track, chapter count, word count, current phase

**Props**: `{ session_id, title }` — `title` is overridden with the book title from `book/track.json` or `book/constitution.md`

---

## Sidebar Footer (`<SidebarFooter />`)

Renders into the `sidebar_footer` slot. Always visible. Shows quick stats and keybinds.

```
┌─────────────────────────────────────────┐
│ Gates: ✓ 8  ✗ 1  ⚠ 2  |  Veto: |  Help: ?│
└─────────────────────────────────────────┘
```

**Data sources**:
- Aggregated gate status (pass/block/warn counts)
- Keybind hints

---

## Keybinds

| Key | Action |
|-----|--------|
| `1`–`4` | Switch sidebar tab (Dashboard, Gates, Diff, Viz) |
| `?` | Show help overlay (all keybinds) |
| `Enter` | Context-aware action (approve hunk, expand gate, start phase) |
| `r` | Context-aware reject (reject hunk, run gate) |
| `\|` | Veto (opens veto reason input) |
| `↑`/`↓` | Navigate within tab (hunks, gates, chart scroll) |
| `Tab` | Cycle forward through tabs |
| `Shift+Tab` | Cycle backward through tabs |
| `A` | In Diff tab: approve all pending hunks |
| `R` | In Gates tab: run all gates |
| `g` | In any tab: go to Gates tab |
| `d` | In any tab: go to Diff tab |
| `v` | In any tab: go to Viz tab |
| `h` | In any tab: go to Dashboard tab |

---

## Plugin Registration

```typescript
// src/plugins/kombinat-sidebar.tsx

import type { TuiPluginModule, TuiPluginApi, TuiPluginMeta } from '@opencode-ai/plugin/tui'
import { createSignal, createMemo, For, Show, Switch, Match } from 'solid-js'

// Import Kombinat lib files for data
import { detectProjectState } from '../lib/project-state.js'
import { runGate } from '../lib/quality-gates.js'
import { buildDraftPreview, buildRevisePreview, buildEditPreview } from '../lib/phase-preview.js'
import { loadLatestIntent, captureIntent, GENERIC_INTENT } from '../lib/authorial-intent.js'
import { generateDiff, approveHunk, rejectHunk, approveAll, formatDiffForDisplay } from '../lib/diff-approval.js'
import { loadProvenance, aggregateProvenance, formatManuscriptProvenance } from '../lib/provenance.js'
import { parseVetoInput, recordVeto, loadVetoLog } from '../lib/veto-system.js'
import { loadPreferences, logRejection } from '../lib/feedback-memory.js'
import { loadConstraints, checkConstraints } from '../lib/creative-constraints.js'

// Tab state
type Tab = 'dashboard' | 'gates' | 'diff' | 'viz'
const [activeTab, setActiveTab] = createSignal<Tab>('dashboard')

// Components
function SidebarTitle(props: { session_id: string; title: string }) { ... }
function SidebarContent(props: { session_id: string }) { ... }
function SidebarFooter(props: { session_id: string }) { ... }

function DashboardTab() { ... }
function GatesTab() { ... }
function DiffTab() { ... }
function VizTab() { ... }

// Plugin entry
const tui: TuiPluginModule['tui'] = async (api: TuiPluginApi, _o, _m: TuiPluginMeta) => {
  // Register keybinds for tab switching
  api.keybind.create({
    'kombinat.tab1': '1',
    'kombinat.tab2': '2',
    'kombinat.tab3': '3',
    'kombinat.tab4': '4',
    'kombinat.veto': '|',
    'kombinat.help': '?',
  })

  // Register sidebar slots
  api.slots.register({
    slots: {
      'sidebar_title': (props) => <SidebarTitle {...props} />,
      'sidebar_content': (props) => <SidebarContent {...props} />,
      'sidebar_footer': (props) => <SidebarFooter {...props} />,
    },
    render: () => null,  // Slot registration, no standalone render
  })

  // Register command for opening sidebar focus
  api.command.register(() => [
    {
      title: 'Kombinat: Focus Sidebar',
      value: 'kombinat:focus-sidebar',
      keybind: 'ctrl+k',
      onSelect: () => {
        api.ui.toast({ title: 'Kombinat', message: 'Sidebar active — use 1-4 to switch tabs' })
      },
    },
  ])
}

const plugin: TuiPluginModule = {
  id: 'kombinat-sidebar',
  tui,
}

export default plugin
```

---

## File Structure

```
kombinat-writer/
├── src/
│   ├── plugins/
│   │   ├── kombinat-sidebar.tsx          # Plugin entry point
│   │   ├── components/
│   │   │   ├── sidebar-title.tsx          # <SidebarTitle />
│   │   │   ├── sidebar-content.tsx        # <SidebarContent /> (tab router)
│   │   │   ├── sidebar-footer.tsx         # <SidebarFooter />
│   │   │   ├── dashboard-tab.tsx          # <DashboardTab />
│   │   │   ├── gates-tab.tsx              # <GatesTab />
│   │   │   ├── diff-tab.tsx               # <DiffTab />
│   │   │   ├── viz-tab.tsx                # <VizTab />
│   │   │   ├── gate-card.tsx              # <GateCard />
│   │   │   ├── gate-detail.tsx            # <GateDetail />
│   │   │   ├── diff-viewer.tsx            # <DiffViewer />
│   │   │   ├── hunk-navigator.tsx         # <HunkNavigator />
│   │   │   ├── pacing-chart.tsx           # <PacingChart />
│   │   │   ├── thread-matrix.tsx          # <ThreadMatrix />
│   │   │   ├── provenance-bar.tsx         # <ProvenanceBar />
│   │   │   └── provenance-dashboard.tsx   # <ProvenanceDashboard />
│   │   ├── hooks/
│   │   │   ├── use-project-state.ts       # Reactive project state
│   │   │   ├── use-gate-results.ts        # Gate execution + caching
│   │   │   ├── use-diff-state.ts          # Diff hunk state
│   │   │   └── use-keybinds.ts            # Keybind registration
│   │   └── utils/
│   │       ├── chart-rendering.ts         # Box-drawing chart helpers
│   │       └── format.ts                  # Terminal formatting helpers
│   └── lib/                               # (existing 40 lib files)
```

---

## Data Flow

```
 ┌──────────────┐    reads     ┌──────────────────┐
 │  book/       │ ◄────────── │  Kombinat Libs   │
 │  track.json  │              │  (40 .ts files)  │
 │  content/    │              │                  │
 │  outline/    │              │  - project-state │
 │  critique/   │              │  - quality-gates │
 │  revisions/  │              │  - diff-approval │
 │  etc.        │              │  - provenance    │
 └──────────────┘              │  - phase-preview │
                               │  - beat-arc      │
                               │  - thread-matrix │
                               │  - etc.          │
                               └────────┬─────────┘
                                        │ function calls
                                        ▼
                               ┌──────────────────┐
                               │  SolidJS Hooks   │
                               │                  │
                               │  useProjectState │
                               │  useGateResults  │
                               │  useDiffState    │
                               └────────┬─────────┘
                                        │ reactive signals
                                        ▼
                               ┌──────────────────┐
                               │  Components      │
                               │                  │
                               │  <DashboardTab/> │
                               │  <GatesTab/>     │
                               │  <DiffTab/>      │
                               │  <VizTab/>       │
                               └────────┬─────────┘
                                        │ JSX render
                                        ▼
                               ┌──────────────────┐
                               │  OpenTui Renderer │
                               │  (terminal output)│
                               └──────────────────┘
```

The sidebar components call Kombinat's lib functions directly (synchronous file reads via `fs-extra`). SolidJS signals provide reactivity — when a gate runs or a hunk is approved, the signal updates and the UI re-renders.

For agent operations (drafting, critique, revision), the sidebar sends commands to OpenCode via `api.client.tui.appendPrompt({ text: '/kombinat draft' })` — the same mechanism the existing hubs-tui plugin uses.

---

## Build Order

### Phase 1: Plugin Scaffold + Title + Footer
1. Create `src/plugins/kombinat-sidebar.tsx` — plugin entry, slot registration, keybind setup
2. Create `src/components/sidebar-title.tsx` — project name, phase, progress bar
3. Create `src/components/sidebar-footer.tsx` — gate status counts, keybind hints
4. Create `src/hooks/use-project-state.ts` — reads `book/track.json`, scans content dir
5. Test: sidebar appears in OpenCode with static title/footer

### Phase 2: Dashboard Tab
6. Create `src/components/dashboard-tab.tsx` — project status, phase preview, provenance bar
7. Create `src/components/sidebar-content.tsx` — tab router (1-4 switching)
8. Create `src/hooks/use-keybinds.ts` — tab switching keybinds
9. Test: Dashboard tab renders, phase preview loads from `phase-preview.ts`

### Phase 3: Gates Tab
10. Create `src/components/gates-tab.tsx` — gate grid, run all, verify single
11. Create `src/components/gate-card.tsx` — individual gate result card
12. Create `src/components/gate-detail.tsx` — expanded blocking gate view
13. Create `src/hooks/use-gate-results.ts` — calls `runGate()`, caches results
14. Test: Gates tab shows all 26 gates, can run gates, blocking gates expand with evidence

### Phase 4: Diff Tab
15. Create `src/components/diff-tab.tsx` — diff viewer, hunk navigation, progress
16. Create `src/components/diff-viewer.tsx` — side-by-side before/after rendering
17. Create `src/components/hunk-navigator.tsx` — prev/next hunk, counter
18. Create `src/hooks/use-diff-state.ts` — manages hunk approval/rejection state
19. Integrate veto: `|` key opens veto reason input, calls `recordVeto()`
20. Integrate feedback memory: rejected hunks with reasons call `logRejection()`
21. Test: Diff tab loads diffs from `diff-approval.ts`, approve/reject/veto works

### Phase 5: Visualizations Tab
22. Create `src/components/viz-tab.tsx` — sub-tab navigation (1-5)
23. Create `src/components/pacing-chart.tsx` — line chart from `beat-arc.ts`
24. Create `src/components/thread-matrix.tsx` — heatmap from `thread-matrix.ts`
25. Create `src/components/provenance-dashboard.tsx` — manuscript provenance from `provenance.ts`
26. Create `src/utils/chart-rendering.ts` — box-drawing chart helpers (╱ ╲ █ ░)
27. Test: All 5 visualizations render from lib data

### Phase 6: Integration + Polish
28. Wire agent commands: "Start Phase" button → `api.client.tui.appendPrompt({ text: '/kombinat draft' })`
29. Wire intent input: capture intent → save via `authorial-intent.ts` → pass to OpenCode command
30. Add gate auto-refresh: listen to `api.event` for file changes, re-run gates
31. Add provenance auto-refresh: listen for content file changes, update provenance bar
32. Theme integration: use `api.theme.current` colors for all components
33. Final test: full sidebar workflow in OpenCode

---

## Dependencies

| Package | Purpose | Already in hubs-tui? |
|---------|---------|---------------------|
| `@opencode-ai/plugin` | TUI plugin types | Yes |
| `@opentui/solid` | SolidJS JSX terminal rendering | Yes |
| `solid-js` | Reactivity (signals, memos) | Yes |
| `fs-extra` | File I/O (used by lib files) | Yes (in kombinat-writer) |

No new dependencies needed — the plugin uses the same stack as the existing `hubs-tui` plugin.

---

## Installer Update

The installer (`bin/install.mjs`) needs to be updated to copy the plugin:

1. Copy `src/plugins/kombinat-sidebar.tsx` and `src/plugins/components/` to `.opencode/plugins/kombinat-sidebar/`
2. Register the plugin in `opencode.jsonc` (if per-project plugin loading is supported)
3. OR: install as a global TUI plugin via `api.plugins.install()`

The exact registration mechanism depends on whether OpenCode supports per-project TUI plugins (the user noted earlier that per-project TUI plugins had issues — this needs verification during Phase 1).

---

## Key Design Decisions

1. **Direct lib calls, not API** — The sidebar calls Kombinat's 40 lib files directly as functions. No HTTP API, no subprocess. Fast, type-safe, no network overhead.

2. **Agent ops via prompt injection** — When the author clicks "Start Phase", the sidebar injects `/kombinat draft` into OpenCode's prompt via `api.client.tui.appendPrompt()`. OpenCode's agent handles the actual drafting. This reuses the existing 26 specs without reimplementation.

3. **SolidJS signals for reactivity** — `createSignal()` for tab state, gate results, diff hunks. When a gate runs or a hunk is approved, the signal updates and the UI re-renders instantly.

4. **Box-drawing charts** — All visualizations use Unicode box-drawing characters (╱ ╲ ╴ ╵ █ ░ ▌ ▐) with ANSI colors from `api.theme.current`. No external chart library — the terminal is the canvas.

5. **4 tabs, not 8 panels** — The 8 HITL features are grouped into 4 tabs by function: Dashboard (phase preview, intent, provenance), Gates (all 26 gates), Diff (diff approval, veto, feedback memory), Viz (visualizations). This keeps the sidebar focused.

6. **Veto key (`|`) works everywhere** — In any tab, pressing `|` opens the veto input for the currently focused suggestion (gate, hunk, or critique item).