/**
 * Formatting utilities for sidebar rendering.
 * ANSI color helpers, bar charts, truncation.
 */

import { createTextAttributes } from '@opentui/core'

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

export function padRight(text: string, width: number): string {
  if (text.length >= width) return text
  return text + ' '.repeat(width - text.length)
}

export function padLeft(text: string, width: number): string {
  if (text.length >= width) return text
  return ' '.repeat(width - text.length) + text
}

export function bar(value: number, max: number, width: number = 10): string {
  const filled = Math.round((value / max) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Bold text attributes bitmask — use as `attributes: BOLD` in style props */
export const BOLD = createTextAttributes({ bold: true })
export const DIM = createTextAttributes({ dim: true })

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

export function statusIcon(status: 'pass' | 'block' | 'warn'): string {
  switch (status) {
    case 'pass': return '✓'
    case 'block': return '✗'
    case 'warn': return '⚠'
  }
}

export function statusColor(status: 'pass' | 'block' | 'warn'): string {
  switch (status) {
    case 'pass': return 'green'
    case 'block': return 'red'
    case 'warn': return 'yellow'
  }
}