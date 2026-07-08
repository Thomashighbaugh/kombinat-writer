/**
 * Formatting utilities for sidebar rendering.
 * ANSI color helpers, bar charts, truncation.
 */

import { createTextAttributes } from '@opentui/core'

/** Truncates text to maxLen, appending ellipsis if truncated. */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

/** Pads text to width with trailing spaces. */
export function padRight(text: string, width: number): string {
  if (text.length >= width) return text
  return text + ' '.repeat(width - text.length)
}

/** Pads text to width with leading spaces. */
export function padLeft(text: string, width: number): string {
  if (text.length >= width) return text
  return ' '.repeat(width - text.length) + text
}

/** Renders a horizontal progress bar with filled (█) and empty (░) blocks. */
export function bar(value: number, max: number, width: number = 10): string {
  const filled = Math.round((value / max) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Bold text attributes bitmask — use as `attributes: BOLD` in style props */
export const BOLD = createTextAttributes({ bold: true })
/** Dim text attributes bitmask. */
export const DIM = createTextAttributes({ dim: true })

/** Maps an internal phase key to a human-readable label. */
export function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    'not-started': 'Not Started',
    constitute: 'Constitute',
    specify: 'Specify',
    clarify: 'Clarify',
    research: 'Research',
    outline: 'Outline',
    'task-manager': 'Tasks',
    draft: 'Draft',
    critique: 'Critique',
    revise: 'Revise',
    edit: 'Edit',
    review: 'Review',
    publish: 'Publish',
    complete: 'Complete',
  }
  return labels[phase] || phase
}

/** Maps an internal state key to a human-readable label. */
export function stateLabel(state: string): string {
  const labels: Record<string, string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    'active-writing': 'Active Writing',
    'revision-cycle': 'Revision Cycle',
    editing: 'Editing',
    review: 'Review',
    publishing: 'Publishing',
    complete: 'Complete',
  }
  return labels[state] || state
}

/** Returns the status icon character (✓, ✗, ⚠) for a gate status. */
export function statusIcon(status: 'pass' | 'block' | 'warn'): string {
  switch (status) {
    case 'pass': return '✓'
    case 'block': return '✗'
    case 'warn': return '⚠'
  }
}

/** Returns the terminal color name for a gate status. */
export function statusColor(status: 'pass' | 'block' | 'warn'): string {
  switch (status) {
    case 'pass': return 'green'
    case 'block': return 'red'
    case 'warn': return 'yellow'
  }
}