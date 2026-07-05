import { useId } from 'react'
import type { CSSProperties } from 'react'

const STAR =
  'M12 1.5c.4 3.4 1.3 5.6 2.9 7.1 1.6 1.6 3.8 2.5 7.1 2.9-3.4.4-5.6 1.3-7.1 2.9-1.6 1.6-2.5 3.8-2.9 7.1-.4-3.4-1.3-5.6-2.9-7.1-1.6-1.6-3.8-2.5-7.1-2.9 3.4-.4 5.6-1.3 7.1-2.9C10.7 7.1 11.6 4.9 12 1.5z'

/**
 * Lightweight "liquid metal" Spark logo — the star filled with an animated
 * metallic gradient (a sheen that slowly sweeps around). Pure SVG, so it stays
 * crisp at any size and can be used in many places without spawning WebGL
 * contexts (unlike the full LiquidMetal shader used on the splash).
 */
export default function LiquidSpark({
  size = 16,
  className,
  style,
  speed = 5
}: {
  size?: number
  className?: string
  style?: CSSProperties
  /** seconds per sheen rotation */
  speed?: number
}): React.JSX.Element {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  const gid = `ls-${raw}`
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fdeee6" />
          <stop offset="26%" stopColor="#eaa07c" />
          <stop offset="50%" stopColor="#d97757" />
          <stop offset="74%" stopColor="#a5502f" />
          <stop offset="100%" stopColor="#f4bb9f" />
          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from="0 0.5 0.5"
            to="360 0.5 0.5"
            dur={`${speed}s`}
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${gid})`} />
    </svg>
  )
}
