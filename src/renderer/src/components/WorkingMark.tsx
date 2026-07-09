import { useEffect, useState } from 'react'
import LiquidSpark from './LiquidSpark'

/**
 * Compact status-bar "working" indicator: a small spinning accent→cyan→violet
 * gradient ring with the LiquidSpark on top, plus an elapsed-seconds counter.
 */
export default function WorkingMark(): React.JSX.Element {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = Date.now()
    setElapsed(0)
    const t = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500)
    return () => clearInterval(t)
  }, [])

  return (
    <span className="flex items-center gap-1.5 text-accent">
      <span className="relative h-4 w-4 inline-block shrink-0">
        <span className="wm-orb absolute inset-0 rounded-full" />
        <span className="absolute inset-0 grid place-items-center">
          <LiquidSpark size={11} speed={2.4} />
        </span>
      </span>
      <span className="tabular-nums">working · {elapsed}s</span>
    </span>
  )
}
