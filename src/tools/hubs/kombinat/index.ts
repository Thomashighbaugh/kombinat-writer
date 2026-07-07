/**
 * Kombinat Writer — Subcommand Registry
 *
 * All /kombinat subcommands are registered here. The first option ("Guided") is
 * the state-detection orchestrator. Remaining options are phase commands
 * and utilities in workflow order.
 */

import { HubSubcommand, HubSubcommandSpec } from "../../hub-data.js"

// Import all spec files
import guided from "./guided.js"
import constitute from "./constitute.js"
import specify from "./specify.js"
import clarify from "./clarify.js"
import research from "./research.js"
import outline from "./outline.js"
import taskManager from "./task-manager.js"
import draft from "./draft.js"
import critique from "./critique.js"
import revise from "./revise.js"
import edit from "./edit.js"
import review from "./review.js"
import publish from "./publish.js"
import cite from "./cite.js"
import track from "./track.js"
import timeline from "./timeline.js"
import meta from "./meta.js"
import drafter from "./drafter.js"
import verify from "./verify.js"
import resume from "./resume.js"
import cycle from "./cycle.js"
import pacingAudit from "./pacing-audit.js"
import hookReview from "./hook-review.js"
import readThrough from "./read-through.js"
import series from "./series.js"

// All specs — full detail available via hubMenu 'route'
export const specs: HubSubcommandSpec[] = [
  guided,
  constitute,
  specify,
  clarify,
  research,
  outline,
  taskManager,
  draft,
  critique,
  revise,
  edit,
  review,
  publish,
  cite,
  track,
  timeline,
  meta,
  drafter,
  verify,
  resume,
  cycle,
  pacingAudit,
  hookReview,
  readThrough,
  series,
]

// Identity slice for the TUI menu
export const subcommands: HubSubcommand[] = specs.map(s => ({
  label: s.label,
  description: s.description,
  reminder: s.reminder,
  skill: s.skill,
  agent: s.agent,
  command: s.command,
  inline: s.inline,
  phases: s.phases,
}))
