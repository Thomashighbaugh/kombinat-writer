/** @jsxImportSource @opentui/solid */
/**
 * Kombinat Writer Sidebar — TUI Plugin Entry Point
 *
 * Registers:
 *   - `/kombinat` slash command → instant DialogSelect menu (no LLM delay)
 *   - 3 sidebar slots (title, content, footer) with 4 tabs
 *
 * Uses @opentui/solid for terminal rendering.
 * Calls Kombinat's lib files directly as functions.
 */

import type { TuiPlugin, TuiPluginApi, TuiPluginMeta, TuiDialogSelectOption } from '@opencode-ai/plugin/tui'
import { createSignal, onMount } from 'solid-js'
import { SidebarTitle } from './components/sidebar-title.js'
import { SidebarContent } from './components/sidebar-content.js'
import { SidebarFooter } from './components/sidebar-footer.js'
import { useKeybinds } from './hooks/use-keybinds.js'
import { useProjectState, setInjector, type Tab } from './hooks/use-project-state.js'

/** All 25 subcommands for the instant menu */
const KOMBINAT_SUBCOMMANDS = [
  { label: 'guided',          description: 'Assess project state and recommend next phase' },
  { label: 'constitute',     description: 'Establish creative or intellectual principles' },
  { label: 'specify',        description: 'Build story specification with premise stress-test' },
  { label: 'clarify',        description: 'Resolve specification ambiguities' },
  { label: 'research',       description: 'Active research — sources, annotation, literature review' },
  { label: 'outline',        description: 'Chapter structure, pacing, arc design' },
  { label: 'task-manager',   description: 'Break outline into tracked tasks' },
  { label: 'draft',           description: 'Batch draft (default) — all planned chapters or up to 6' },
  { label: 'critique',       description: 'Batch critique — modes: alpha, beta, peer, sensitivity, cold-read' },
  { label: 'revise',         description: 'Batch revise with revision-verify gate — --depth full for 3-pass' },
  { label: 'edit',           description: 'Three-pass editing: line-edit, copy-edit, proofread' },
  { label: 'review',         description: 'Broad project QA — continuity scan, structural analyses' },
  { label: 'cite',           description: 'Citation management — add, format, validate, bibliography' },
  { label: 'publish',       description: 'Export via pandoc — EPUB, DOCX, LaTeX, PDF, web' },
  { label: 'track',          description: 'Unified tracking — characters, plots, timelines, sources' },
  { label: 'timeline',       description: 'Chronological consistency verification' },
  { label: 'meta',           description: 'Bibliographic metadata management' },
  { label: 'drafter',       description: 'Loose draft jumpstart from raw ideas' },
  { label: 'verify',         description: 'Run quality gates on demand — voice, continuity, style' },
  { label: 'resume',         description: 'Resume interrupted session from checkpoint' },
  { label: 'cycle',          description: 'Batch editorial cycle — draft→critique→revise→edit→done' },
  { label: 'pacing-audit',   description: 'Analyze pacing distribution, find saggy sections' },
  { label: 'hook-review',    description: 'Check each chapter opening and closing hooks' },
  { label: 'read-through',   description: 'Full read-through — immersion audit, trust accounting' },
  { label: 'series',         description: 'Series infrastructure — init, sync, audit, register, status' },
] as const

const tui: TuiPlugin = async (api: TuiPluginApi, _o, _meta: TuiPluginMeta) => {
  const projectRoot = api.state.path.directory

  const [activeTab, setActiveTab] = createSignal<Tab>('dashboard')

  // Wire command injector so sidebar can inject /kombinat commands into the prompt
  setInjector((cmd: string) => {
    api.client.tui.appendPrompt({ text: cmd + ' ' }).catch(() => {})
  })

  const sidebarState = useProjectState(projectRoot, activeTab, setActiveTab)

  // Show a launch toast so the user knows the sidebar exists and how to use it.
  // NOTE: OpenCode has no plugin API to open/focus the sidebar programmatically.
  // The sidebar must be toggled with the built-in keybind (default <leader>b = Ctrl+X, B).
  // Once visible, 1-4 switch tabs.
  onMount(() => {
    api.ui.toast({
      title: 'Kombinat Writer',
      message: 'Sidebar ready — <leader>k cycles tabs, <leader>1-4 jumps, or /kombinat for the menu',
      duration: 8000,
      variant: 'info',
    })
  })

  // Register keybinds for tab switching (<leader>k cycles, <leader>1-4 jumps)
  useKeybinds(api, () => activeTab(), setActiveTab)

  // Register sidebar slots — slot renderers receive (ctx, props) where ctx has theme
  api.slots.register({
    slots: {
      'sidebar_title': (_ctx, props: { session_id: string; title: string }) =>
        <SidebarTitle {...props} state={sidebarState} />,

      'sidebar_content': (_ctx, props: { session_id: string }) =>
        <SidebarContent {...props} state={sidebarState} />,

      'sidebar_footer': (_ctx, props: { session_id: string }) =>
        <SidebarFooter {...props} state={sidebarState} />,
    },
  })

  // Register commands: instant /kombinat menu + sidebar focus
  if (api.command) {
    api.command.register(() => {
      const commands: Array<{
        title: string
        value: string
        description?: string
        category?: string
        keybind?: string
        slash?: { name: string; aliases?: string[] }
        onSelect?: () => void
      }> = [
        // ─── Instant /kombinat menu ────────────────────────────────────────
        // Shows a DialogSelect immediately — no LLM processing delay.
        // When the user picks a subcommand, it injects "/kombinat-router <subcommand> "
        // into the prompt and submits it, so the agent processes it via the
        // kombinat-router.md slash command (Case 2 — direct phase execution, no menu).
        {
          title: 'Kombinat: Phase Menu',
          value: 'kombinat',
          description: 'Open the instant Kombinat phase selection menu',
          category: 'Kombinat Writer',
          slash: { name: 'kombinat', aliases: ['kom'] },
          onSelect: () => {
            const DS = api.ui.DialogSelect
            const options: TuiDialogSelectOption<string>[] = KOMBINAT_SUBCOMMANDS.map(s => ({
              title: s.label,
              value: s.label,
              description: s.description,
            }))

            api.ui.dialog.setSize('large')
            api.ui.dialog.replace(() =>
              DS({
                title: 'Kombinat Writer — Select Phase',
                placeholder: 'Choose a phase...',
                options,
          onSelect: (sel: TuiDialogSelectOption<string>) => {
            api.ui.dialog.clear()
            const cmd = `/kombinat-router ${sel.value}`
            api.ui.toast({ title: 'Kombinat', message: `Routing to ${sel.value}` })
            // Inject the routing command into the prompt and submit.
            // The kombinat-router.md slash command handles direct phase execution
            // (Case 2), so the agent calls hubMenu route and executes the phase.
            api.client.tui.appendPrompt({ text: cmd + ' ' }).then(() => {
              // Auto-submit so the agent picks it up immediately
              setTimeout(() => {
                api.client.tui.appendPrompt({ text: '\n' }).catch(() => {})
              }, 100)
            }).catch(() => {})
          },
              })
            )
          },
        },

        // ─── Sidebar focus ─────────────────────────────────────────────────
        {
          title: 'Kombinat: Sidebar Help',
          value: 'kombinat:focus-sidebar',
          description: 'Show how to open and navigate the Kombinat Writer sidebar',
          keybind: 'ctrl+k',
          onSelect: () => {
            api.ui.toast({ title: 'Kombinat', message: '<leader>k cycles tabs · <leader>1-4 jumps · /kombinat for menu' })
          },
        },
      ]

      return commands
    })
  }
}

const plugin = { id: 'kombinat-sidebar', tui }
export default plugin