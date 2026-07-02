import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Spark } from '../Icon'
import type { ChatItem, TabState } from '@/lib/chat'

const GENERIC = ['Pracuję', 'Przetwarzam', 'Kombinuję', 'Działam']

function basename(p: string): string {
  return p.split(/[\\/]/).filter(Boolean).pop() ?? p
}

/** Describe what Claude is doing right now, from the tail of the item list. */
function currentActivity(items: ChatItem[]): string | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    if (it.kind === 'tool') {
      if (it.done) return null // last tool finished — probably composing the reply
      const inp = it.input ?? {}
      if (it.name === 'Bash' && typeof inp.command === 'string') {
        return `Bash: ${String(inp.command).split(/\s+/)[0]}`
      }
      if (typeof inp.file_path === 'string') return `${it.name}(${basename(inp.file_path)})`
      if (typeof inp.pattern === 'string') return `${it.name}: ${inp.pattern}`
      return it.name
    }
    if (it.kind === 'thinking' && it.streaming) return 'Myślę'
    if (it.kind === 'text' && it.streaming) return 'Generuję odpowiedź'
    if (it.kind === 'text' || it.kind === 'user' || it.kind === 'result') return null
  }
  return null
}

export default function WorkingIndicator({ tab }: { tab: TabState }): React.JSX.Element {
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

  const connecting = tab.status === 'connecting'
  const activity = connecting ? 'Łączenie z Claude Code' : currentActivity(tab.items) ?? GENERIC[genIdx]

  return (
    <div className="border-t border-border bg-panel/60 px-4 py-1.5">
      <div className="flex items-center gap-2.5 text-[12px]">
        <motion.span
          className="text-accent inline-flex"
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{
            rotate: { repeat: Infinity, duration: 2.2, ease: 'linear' },
            scale: { repeat: Infinity, duration: 1.1 }
          }}
        >
          <Spark size={14} />
        </motion.span>
        <span className="text-fg font-medium">
          <span className="shimmer">{activity}</span>
          <span className="text-dim">…</span>
        </span>
        <span className="text-dim tabular-nums">{elapsed}s</span>
        <span className="ml-auto text-dim text-[11px]">Esc aby przerwać</span>
      </div>
      {/* indeterminate progress bar */}
      <div className="relative h-[3px] mt-1.5 w-full bg-panel2 rounded overflow-hidden">
        <motion.div
          className="absolute top-0 h-full w-1/3 rounded"
          style={{ background: 'var(--color-accent)' }}
          animate={{ left: ['-35%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.15, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}
