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
  const base = `ls-b-${raw}`
  const spec = `ls-s-${raw}`
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden>
      <defs>
        {/* high-contrast metallic band that rotates around the star */}
        <linearGradient id={base} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fff6ef" />
          <stop offset="18%" stopColor="#f0a074" />
          <stop offset="40%" stopColor="#c85f3c" />
          <stop offset="55%" stopColor="#5f3320" />
          <stop offset="72%" stopColor="#c85f3c" />
          <stop offset="100%" stopColor="#fff0e6" />
          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from="0 0.5 0.5"
            to="360 0.5 0.5"
            dur={`${speed}s`}
            repeatCount="indefinite"
          />
        </linearGradient>
        {/* bright specular hotspot sweeping across */}
        <radialGradient id={spec} cx="0.5" cy="0.5" r="0.45" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            values="-0.55 -0.35; 0.55 0.35; -0.55 -0.35"
            dur={`${speed * 0.9}s`}
            repeatCount="indefinite"
          />
        </radialGradient>
      </defs>
      <path d={STAR} fill={`url(#${base})`} />
      <path d={STAR} fill={`url(#${spec})`} style={{ mixBlendMode: 'screen' }} />
    </svg>
  )
}
