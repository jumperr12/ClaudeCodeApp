import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { interpolate } from 'flubber'
import { LiquidMetal } from '@paper-design/shaders-react'

// Spark (the app logo) as a path, and a small circle "dot" in the same 0..24 viewBox.
const STAR =
  'M12 1.5c.4 3.4 1.3 5.6 2.9 7.1 1.6 1.6 3.8 2.5 7.1 2.9-3.4.4-5.6 1.3-7.1 2.9-1.6 1.6-2.5 3.8-2.9 7.1-.4-3.4-1.3-5.6-2.9-7.1-1.6-1.6-3.8-2.5-7.1-2.9 3.4-.4 5.6-1.3 7.1-2.9C10.7 7.1 11.6 4.9 12 1.5z'
const DOT =
  'M12 10.4C12.88 10.4 13.6 11.12 13.6 12C13.6 12.88 12.88 13.6 12 13.6C11.12 13.6 10.4 12.88 10.4 12C10.4 11.12 11.12 10.4 12 10.4Z'

// Star as a white-on-transparent SVG data URI — used as the LiquidMetal mask image.
const STAR_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#fff' d='${STAR}'/></svg>`
  )

/** CSS mask (data URI) for the morphing blob, with a "goo" filter so it reads as liquid. */
function maskUrl(d: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>` +
    `<defs><filter id='g'>` +
    `<feGaussianBlur in='SourceGraphic' stdDeviation='0.9' result='b'/>` +
    `<feColorMatrix in='b' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10'/>` +
    `</filter></defs>` +
    `<path d='${d}' fill='#fff' filter='url(#g)'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const SIZE = 240

export default function LiquidSparkIntro({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [mask, setMask] = useState(() => maskUrl(DOT))
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // dot → star morph
    const mixer = interpolate(DOT, STAR, { maxSegmentLength: 2 })
    let raf = 0
    const start = performance.now()
    const DURATION = 1500
    const ease = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / DURATION)
      setMask(maskUrl(mixer(ease(t))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // hold, then fade out
    const leave = setTimeout(() => setLeaving(true), 2200)
    // hard safety: never trap the app behind the splash
    const done = setTimeout(onDone, 3200)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(leave)
      clearTimeout(done)
    }
  }, [onDone])

  const maskStyle = {
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain'
  } as const

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg cursor-pointer"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => leaving && onDone()}
      onClick={() => setLeaving(true)}
      title="Click to skip"
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* soft accent glow behind */}
        <div className="absolute inset-0 rounded-full intro-glow" />

        {/* morphing liquid-metal spark */}
        <div className="absolute inset-0" style={maskStyle}>
          {/* fallback fill (accent) — guarantees a colored shape even if WebGL is subtle */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 40% 34%, #ffd9c7, var(--color-accent) 46%, var(--color-accent-soft) 82%)'
            }}
          />
          {/* real liquid metal (Paper Shaders — zero-dependency, no three.js) */}
          <LiquidMetal
            width={SIZE}
            height={SIZE}
            image={STAR_IMG}
            colorBack="#00000000"
            colorTint="#ffe3d3"
            repetition={3}
            softness={0.3}
            shiftRed={0.35}
            shiftBlue={0.35}
            distortion={0.08}
            contour={0.5}
            speed={1.2}
            scale={0.62}
            fit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* wordmark */}
      <motion.div
        className="absolute bottom-[22%] text-bright font-bold tracking-wide"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        Claude Code Desktop
      </motion.div>
    </motion.div>
  )
}
