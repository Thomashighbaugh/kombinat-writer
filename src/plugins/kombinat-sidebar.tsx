/** @jsxImportSource @opentui/solid */
/**
 * Kombinat Writer Sidebar — TUI Plugin Entry Point
 *
 * Registers:
 *   - `/kombinat` slash command → instant DialogSelect menu
 *   - 3 sidebar slots (title, content, footer) — all four tabs (Dashboard,
 *     Gates, Diff, Viz) are rendered as a single scrollable column. No tabs.
 *     No keybinds. The user scrolls down through everything.
 */

import type { TuiPlugin, TuiPluginApi, TuiPluginMeta, TuiDialogSelectOption } from '@opencode-ai/plugin/tui'
import { onMount } from 'solid-js'
import { SidebarTitle } from './components/sidebar-title.js'
import { SidebarContent } from './components/sidebar-content.js'
import { SidebarFooter } from './components/sidebar-footer.js'
import { useProjectState, setInjector } from './hooks/use-project-state.js'

/** All 25 subcommands for the instant menu */
const KOMBINAT_SUBCOMMANDS = [
  { label: 'guided',          description: 'Assess project state and recommend next phase' },
  { label: 'manifest',     description: 'Establish creative or intellectual principles' },
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

  // Wire command injector so sidebar can inject /kombinat commands into the prompt.
  setInjector((cmd: string) => {
    api.client.tui.appendPrompt({ text: cmd + ' ' }).catch(() => {})
  })

  // Single sidebar state — no tab switching. All four sections stack vertically
  // and the user scrolls through them. The signature still accepts activeTab for
  // backward compatibility, but it's a no-op now.
  const noopSet = () => {}
  const sidebarState = useProjectState(projectRoot, () => 'dashboard', noopSet)

  onMount(() => {
    api.ui.toast({
      title: 'Kombinat Writer',
      message: 'Scroll sidebar for all sections · /kombinat for the menu',
      duration: 6000,
      variant: 'info',
    })
  })

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

  // Register commands: instant /kombinat menu only.
  if (api.command) {
    api.command.register(() => {
      const commands: Array<{
        title: string
        value: string
        description?: string
        category?: string
        slash?: { name: string; aliases?: string[] }
        onSelect?: () => void
      }> = [
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
                  api.client.tui.appendPrompt({ text: cmd + ' ' }).then(() => {
                    setTimeout(() => {
                      api.client.tui.appendPrompt({ text: '\n' }).catch(() => {})
                    }, 100)
                  }).catch(() => {})
                },
              })
            )
          },
        },
      ]
      return commands
    })
  }
}

const plugin = { id: 'kombinat-sidebar', tui, server: tui }
export default plugin
