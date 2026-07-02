import { useEffect, useRef, useState } from 'react'

/**
 * Reveals `text` progressively at a steady character cadence while `streaming`,
 * so chunky SDK deltas read like real-time typing. Catches up quickly if a large
 * chunk arrives at once, and snaps to the full text the moment streaming ends.
 */
export function useTypewriter(text: string, streaming: boolean, cps = 190): string {
  const [shownLen, setShownLen] = useState(streaming ? 0 : text.length)
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => {
    if (!streaming) {
      setShownLen(textRef.current.length)
      return
    }
    let raf = 0
    let prev = 0
    const loop = (t: number): void => {
      if (!prev) prev = t
      const dt = t - prev
      prev = t
      setShownLen((len) => {
        const target = textRef.current.length
        if (len >= target) return len
        const gap = target - len
        // steady base speed, but accelerate when far behind so we never lag much
        const base = Math.max(1, Math.floor((dt / 1000) * cps))
        const step = gap > 300 ? Math.ceil(gap / 6) : base
        return Math.min(target, len + step)
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [streaming, cps])

  if (!streaming) return text
  return text.slice(0, shownLen)
}
