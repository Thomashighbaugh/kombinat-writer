/**
 * Kombinat Writer — Hub Menu Router Tool
 *
 * Provides menu/route/list actions for the /kombinat command system.
 * The TUI plugin handles interactive menu selection; this tool handles
 * spec resolution and retrieval for the agent.
 */

import { tool } from "@opencode-ai/plugin"
import {
  loadHub,
  loadSubcommandSpecFull,
  loadAllSubcommandLabels,
} from "./hub-data.js"

const VALID_ACTIONS = ['menu', 'route', 'list'] as const

export default tool({
  description: "Kombinat Writer hub menu router. Use 'menu' to get subcommand options, 'route' to get full spec for a selected subcommand, 'list' to list all labels.",
  args: {
    action: tool.schema.string().describe(
      `Action: 'menu' returns menu JSON, 'route' returns full subcommand spec, 'list' lists all labels. Valid: ${VALID_ACTIONS.join(', ')}`
    ),
    subcommand: tool.schema.string().optional().describe("Subcommand label to route to (for 'route' action)"),
  },
  async execute(args, context) {
    if (!VALID_ACTIONS.includes(args.action as typeof VALID_ACTIONS[number])) {
      return JSON.stringify({ error: `Invalid action '${args.action}'. Valid: ${VALID_ACTIONS.join(', ')}` })
    }

    const hubName = "kombinat"

    switch (args.action) {
      case 'list': {
        const labels = loadAllSubcommandLabels(hubName)
        return JSON.stringify({ hub: hubName, subcommands: labels })
      }

      case 'menu': {
        const hub = loadHub(hubName)
        if (!hub) return JSON.stringify({ error: `Hub '${hubName}' not found` })
        return JSON.stringify({
          hub: hub.name,
          description: hub.description,
          options: hub.subcommands.map(s => ({
            label: s.label,
            description: s.description
          }))
        })
      }

      case 'route': {
        if (!args.subcommand) {
          return JSON.stringify({ error: "subcommand argument required for route action" })
        }
        const { spec, rulesContent, relatedSkillMeta } = loadSubcommandSpecFull(hubName, args.subcommand)
        if (!spec) {
          return JSON.stringify({
            error: `Unknown subcommand '${args.subcommand}' for ${hubName}`,
            available: loadAllSubcommandLabels(hubName)
          })
        }
        return JSON.stringify({
          hub: hubName,
          subcommand: spec.label,
          subDescription: spec.description,
          reminder: spec.reminder,
          detailedDescription: spec.detailedDescription,
          tools: spec.tools || null,
          rules: spec.rules || null,
          rulesContent: rulesContent.length > 0 ? rulesContent : null,
          relatedSkills: spec.relatedSkills || null,
          relatedSkillMeta: relatedSkillMeta.length > 0 ? relatedSkillMeta : null,
          examples: spec.examples || null,
          warnings: spec.warnings || null
        })
      }

      default:
        return JSON.stringify({ error: `Unknown action: ${args.action}` })
    }
  }
})