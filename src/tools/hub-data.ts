/**
 * Kombinat Writer — Hub Data Types & Loader
 *
 * Ported from the global OpenCode hub system. Provides the type system
 * and spec loader for the kombinat hub's TUI command menu.
 *
 * Self-contained: no dependencies on global config or project state.
 */

import * as fs from "fs"
import * as path from "path"
import { createRequire } from "module"
import { fileURLToPath } from "url"

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Types ───────────────────────────────────────────────────────────────

export interface HubSubcommand {
  label: string
  description: string
  reminder: string
  skill?: string
  agent?: string
  command?: string
  inline?: boolean
  phases?: string
}

export interface HubSubcommandSpec extends HubSubcommand {
  detailedDescription: string
  tools?: string[]
  rules?: string[]
  relatedSkills?: string[]
  examples?: Array<{ input: string; approach: string }>
  warnings?: string[]
}

export interface HubDefinition {
  name: string
  description: string
  subcommands: HubSubcommand[]
}

export interface DelegationInfo {
  type: 'skill' | 'agent' | 'command' | 'inline'
  target: string | undefined
}

// ─── Delegation ──────────────────────────────────────────────────────────

export function getDelegation(sub: HubSubcommand): DelegationInfo {
  const types = ['skill', 'agent', 'command', 'inline'] as const
  const set = types.filter(t => !!sub[t as keyof HubSubcommand])
  if (set.length === 0) return { type: 'inline', target: undefined }
  const type = set[0] as 'skill' | 'agent' | 'command' | 'inline'
  return { type, target: sub[type as keyof HubSubcommand] as string | undefined }
}

// ─── Hub File Registry ───────────────────────────────────────────────────
// Kombinat writer is self-contained. All hub files live in tools/hubs/kombinat/.

const HUBS_DIR = path.join(__dirname, "hubs")

export const HUB_FILE_MAP: Record<string, string> = {
  "kombinat": path.join(HUBS_DIR, "kombinat"),
}

export function loadHub(name: string): HubDefinition | null {
  const hubDir = HUB_FILE_MAP[name]
  if (!hubDir) return null
  try {
    const mod = require(hubDir)
    // The index.ts exports { subcommands: HubSubcommand[], specs: HubSubcommandSpec[] }
    // We need the hub definition. For kombinat, we'll construct it.
    const specs = mod.specs || []
    const subcommands: HubSubcommand[] = specs.map((s: HubSubcommandSpec) => ({
      label: s.label, description: s.description, reminder: s.reminder,
      skill: s.skill, agent: s.agent, command: s.command, inline: s.inline, phases: s.phases
    }))
    return {
      name,
      description: "Professional book writing workflow — fiction, non-fiction, and mixed projects",
      subcommands
    }
  } catch (e) {
    return null
  }
}

// ─── Subcommand Spec Loader ──────────────────────────────────────────────

const SUBCOMMAND_DIR_MAP: Record<string, string> = {
  "kombinat": "kombinat",
}

export function loadSubcommandSpec(hubName: string, subLabel: string): HubSubcommandSpec | null {
  const dir = SUBCOMMAND_DIR_MAP[hubName]
  if (!dir) return null

  const file = path.join(HUBS_DIR, dir, subLabel)
  try {
    const mod = require(file)
    return (mod.default || mod.spec) as HubSubcommandSpec
  } catch {
    return null
  }
}

export function loadSubcommandSpecFull(hubName: string, subLabel: string): {
  spec: HubSubcommandSpec | null
  rulesContent: Array<{ name: string; content: string }>
  relatedSkillMeta: Array<{ name: string; path: string; description: string }>
} {
  const spec = loadSubcommandSpec(hubName, subLabel)
  if (!spec) return { spec: null, rulesContent: [], relatedSkillMeta: [] }

  const rulesContent: Array<{ name: string; content: string }> = []
  const relatedSkillMeta: Array<{ name: string; path: string; description: string }> = []

  // Rules are in the kombinat-writer project's rules/ directory
  if (spec.rules && spec.rules.length > 0) {
    const rulesDir = path.join(__dirname, '..', '..', 'rules')
    for (const ruleName of spec.rules) {
      const rulePath = path.join(rulesDir, `${ruleName}.md`)
      try {
        if (fs.existsSync(rulePath)) {
          rulesContent.push({ name: ruleName, content: fs.readFileSync(rulePath, 'utf-8') })
        }
      } catch {}
    }
  }

  // Related skills are in the kombinat-writer project's skills/ directory
  if (spec.relatedSkills && spec.relatedSkills.length > 0) {
    const skillsDir = path.join(__dirname, '..', '..', 'skills')
    for (const skillName of spec.relatedSkills) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md')
      try {
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, 'utf-8')
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
          if (fmMatch) {
            const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m)
            relatedSkillMeta.push({
              name: skillName,
              path: skillPath,
              description: descMatch ? descMatch[1].trim() : ''
            })
          }
        }
      } catch {}
    }
  }

  return { spec, rulesContent, relatedSkillMeta }
}

export function loadAllSubcommandLabels(hubName: string): string[] {
  const hub = loadHub(hubName)
  return hub ? hub.subcommands.map(s => s.label) : []
}
