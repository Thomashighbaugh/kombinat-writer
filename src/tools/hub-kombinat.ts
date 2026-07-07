/**
 * Kombinat Writer — Hub Manifest
 *
 * Defines the /kombinat hub command's subcommand registry for the TUI menu system.
 */

import { HubDefinition } from "./hub-data.js"
import { subcommands } from "./hubs/kombinat/index.js"

const hub: HubDefinition = {
  name: "kombinat",
  description: "Professional book writing workflow — fiction, non-fiction, and mixed projects. Select a phase to begin or continue.",
  subcommands
}

export default hub
