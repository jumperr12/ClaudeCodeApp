import { useEffect, useState } from 'react'
import LiquidSpark from '../LiquidSpark'
import type { ChatItem, TabState } from '@/lib/chat'

const GENERIC = ['Working', 'Processing', 'Crunching', 'On it']

// Grainy noise overlay — same feTurbulence texture used across the app.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>"
)}")`

function basename(p: string): string {
  return p.split(/[\\/]/).filter(Boolean).pop() ?? p
}

/** Describe what Claude is doing right now, from the tail of the item list. */
function currentActivity(items: ChatItem[]): string | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    if (it.kind === 'tool') {
      if (it.done) return null
      const inp = it.input ?? {}
      if (it.name === 'Bash' && typeof inp.command === 'string') {
        return `Bash: ${String(inp.command).split(/\s+/)[0]}`
      }
      if (typeof inp.file_path === 'string') return `${it.name}(${basename(inp.file_path)})`
      if (typeof inp.pattern === 'string') return `${it.name}: ${inp.pattern}`
      return it.name
    }
    if (it.kind === 'thinking' && it.streaming) return 'Thinking'
    if (it.kind === 'text' && it.streaming) return 'Writing response'
    if (it.kind === 'text' || it.kind === 'user' || it.kind === 'result') return null
  }
  return null
}

/**
 * Bottom-right "thinking" indicator: a metallic LiquidSpark riding a spinning,
 * grainy accent→cyan→violet gradient orb with a soft pulsing glow. Replaces the
 * old full-width working strip; represents the same live-activity state.
 */
export default function WorkingOrb({ tab }: { tab: TabState }): React.JSX.Element {
  const [elapsed, setElapsed] = useState(0)
  const [genIdx, setGenIdx] = useState(0)

  useEffect(() => {
    const start = Date.now()
    setElapsed(0)
    const clock = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500)
    const words = setInterval(() => setGenIdx((i) => (i + 1) % GENERIC.length), 2400)
    return () => {
      clearInterval(clock)
      clearInterval(words)
    }
  }, [])

  const activity = currentActivity(tab.items) ?? GENERIC[genIdx]

  return (
    <div className="flex items-center gap-2.5">
      <div className="text-right leading-tight">
        <div className="shimmer text-[11.5px] font-medium">
          {activity}
          <span className="text-dim">…</span>
        </div>
        <div className="text-[10px] text-dim tabular-nums leading-tight">{elapsed}s · Esc to interrupt</div>
      </div>
      <div className="relative h-10 w-10 shrink-0">
        <div className="wo-glow absolute -inset-1.5 rounded-full" />
        <div className="wo-grad absolute inset-0 rounded-full" />
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundImage: GRAIN, mixBlendMode: 'overlay', opacity: 0.14 }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <LiquidSpark size={19} speed={2.6} />
        </div>
      </div>
    </div>
  )
}
