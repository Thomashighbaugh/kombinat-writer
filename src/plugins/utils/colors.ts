/**
 * Sanatana Linux color scheme — applied to the Kombinat Writer sidebar.
 *
 * Author: Thomas Leon Highbaugh
 * Source: per the YAML provided by the user.
 *
 * Roles:
 *   - bg / bgStatus / bgSelect — backgrounds
 *   - muted / caret / fg / fgLight / fgBright — text
 *   - red / orange / yellow / green / cyan / blue / magenta / altGrey — accents
 */

export const colors = {
  bg: '#0c0c0c',
  bgStatus: '#1c1c1c',
  bgSelect: '#2c2c2c',
  muted: '#59575f',
  caret: '#8b888f',
  fg: '#bab6c0',
  fgLight: '#d9d5df',
  fgBright: '#f7f1ff',
  red: '#fc618d',
  orange: '#ff9e64',
  yellow: '#fce566',
  green: '#7dca99',
  cyan: '#59bbe5',
  blue: '#6b9ce8',
  magenta: '#948ae3',
  altGrey: '#555566',
} as const

export type ColorName = keyof typeof colors

/**
 * Maps each logical role used by sidebar components to a Sanatana color.
 * Components import this and use `c.x` instead of hard-coded strings.
 */
export const c = {
  // Backgrounds
  background: colors.bg,
  panel: colors.bgStatus,
  selection: colors.bgSelect,

  // Text — high to low prominence
  textBright: colors.fgBright,
  text: colors.fg,
  textLight: colors.fgLight,
  textMuted: colors.caret,
  comment: colors.muted,

  // Accent headers
  header: colors.cyan,
  subheader: colors.blue,

  // Semantic states
  pass: colors.green,
  block: colors.red,
  warn: colors.yellow,
  info: colors.cyan,
  error: colors.red,
  diffAdded: colors.green,
  diffRemoved: colors.red,
  alt: colors.altGrey,

  // Highlights
  accent: colors.magenta,
  orange: colors.orange,
} as const
