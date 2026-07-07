/**
 * Chart rendering utilities — box-drawing characters for terminal visualizations.
 * Pacing heartbeat, thread matrix heatmap, provenance bar, cognitive load sparkline, escalation curve.
 */

import { bar } from './format.js'

/**
 * Pacing heartbeat — vertical bars showing intensity per chapter.
 * Returns an array of strings (one per line) for a mini chart.
 */
export function pacingChart(data: { chapter: number; intensity: number }[], width: number = 30, height: number = 5): string[] {
  if (data.length === 0) return ['─'.repeat(width)]
  const lines: string[] = []
  const maxIntensity = Math.max(...data.map(d => d.intensity), 1)
  for (let row = height; row >= 1; row--) {
    const threshold = (row / height) * maxIntensity
    let line = ''
    for (let i = 0; i < Math.min(data.length, width); i++) {
      line += data[i].intensity >= threshold ? '│' : ' '
    }
    lines.push(line)
  }
  // baseline
  lines.push('─'.repeat(Math.min(data.length, width)))
  return lines
}

/**
 * Thread matrix heatmap — chapters x threads showing presence (█) or absence (░).
 */
export function threadMatrix(
  threads: { threadId: string; threadName: string; chapters: number[] }[],
  totalChapters: number,
  maxThreads: number = 8
): string[] {
  if (threads.length === 0) return ['No thread data']
  const lines: string[] = []
  const colWidth = Math.max(2, Math.floor(40 / Math.min(threads.length, maxThreads)))

  // header
  let header = '    '
  for (let c = 1; c <= Math.min(totalChapters, 20); c++) {
    header += (c % 10 === 0 ? String(c / 10) : ' ')
  }
  lines.push(header)
  header = '    '
  for (let c = 1; c <= Math.min(totalChapters, 20); c++) {
    header += String(c % 10)
  }
  lines.push(header)

  for (const t of threads.slice(0, maxThreads)) {
    const name = t.threadName.slice(0, 12).padEnd(12)
    let row = name + ' '
    for (let c = 1; c <= Math.min(totalChapters, 20); c++) {
      row += t.chapters.includes(c) ? '█' : '░'
    }
    lines.push(row)
  }
  return lines
}

/**
 * Provenance bar — horizontal stacked bar showing author vs AI contribution.
 */
export function provenanceBar(summary: {
  author: number
  aiDrafted: number
  aiRevised: number
  aiEdited: number
  aiModified: number
  authorRevised: number
}): string {
  const total = summary.author + summary.aiDrafted + summary.aiRevised + summary.aiEdited + summary.aiModified + summary.authorRevised
  if (total === 0) return '─'.repeat(30)
  const width = 30
  const authorPct = ((summary.author + summary.authorRevised) / total) * width
  const aiPct = ((summary.aiDrafted + summary.aiRevised + summary.aiEdited + summary.aiModified) / total) * width
  return (
    '🟢'.repeat(Math.round(authorPct)) +
    '🔵'.repeat(Math.round(aiPct)) +
    '░'.repeat(Math.max(0, width - Math.round(authorPct) - Math.round(aiPct)))
  )
}

/**
 * Cognitive load sparkline — unicode block characters showing load per chapter.
 */
export function cognitiveLoadSparkline(data: { chapter: number; load: number }[], width: number = 30): string {
  if (data.length === 0) return '─'.repeat(width)
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  const maxLoad = Math.max(...data.map(d => d.load), 1)
  let line = ''
  for (let i = 0; i < Math.min(data.length, width); i++) {
    const idx = Math.floor((data[i].load / maxLoad) * (blocks.length - 1))
    line += blocks[Math.min(idx, blocks.length - 1)]
  }
  return line
}

/**
 * Escalation curve — tension across story beats.
 */
export function escalationCurve(data: { beat: number; tension: number }[], width: number = 30, height: number = 5): string[] {
  if (data.length === 0) return ['─'.repeat(width)]
  const lines: string[] = []
  const maxTension = Math.max(...data.map(d => d.tension), 1)
  const stepWidth = width / data.length

  for (let row = height; row >= 1; row--) {
    const threshold = (row / height) * maxTension
    let line = ''
    let prevAbove = false
    for (let i = 0; i < width; i++) {
      const dataIdx = Math.floor(i / stepWidth)
      const d = data[Math.min(dataIdx, data.length - 1)]
      const above = d.tension >= threshold
      if (above && prevAbove) line += '█'
      else if (above) line += '╱'
      else if (i > 0 && prevAbove) line += '╲'
      else line += ' '
      prevAbove = above
    }
    lines.push(line)
  }
  lines.push('─'.repeat(width))
  return lines
}