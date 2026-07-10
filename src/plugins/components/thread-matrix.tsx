/** @jsxImportSource @opentui/solid */
import { For, Show } from 'solid-js'
import type { SidebarState } from '../hooks/use-project-state.js'
import { threadMatrix } from '../utils/chart-rendering.js'
import { c } from '../utils/colors.js'

/** Renders the thread matrix heatmap showing story thread presence per chapter. */
export function ThreadMatrixView(props: { state: SidebarState }) {
  const viz = props.state.vizData
  return (
    <Show
      when={viz()?.threads.length}
      fallback={<text style={{ fg: c.textMuted }}>{'No thread data — run /kombinat review'}</text>}
    >
      <box flexDirection="column">
        <text style={{ fg: c.cyan }}>{'Thread Matrix'}</text>
        <For each={threadMatrix(viz()!.threads, 20)}>
          {(line) => <text style={{ fg: c.textBright }}>{line}</text>}
        </For>
        <text style={{ fg: c.textMuted }}>{'█ = present  ░ = absent'}</text>
      </box>
    </Show>
  )
}
