import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'

type SGProps = React.ComponentProps<typeof ShaderGradient>

// Fine monochrome film grain as a tiling SVG (feTurbulence) — crisp, blur-independent.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
)}")`

export type BgPreset = 'off' | 'ember' | 'dusk' | 'molten' | 'charcoal' | 'github'

export const BG_PRESETS: { key: BgPreset; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'ember', label: 'Ember' },
  { key: 'dusk', label: 'Dusk' },
  { key: 'molten', label: 'Molten' },
  { key: 'charcoal', label: 'Charcoal' }
]

// Shared framing; presets only vary type / colors / motion so they all sit nicely full-bleed.
const BASE: Partial<SGProps> = {
  control: 'props',
  animate: 'on',
  grain: 'off', // grain is added as a crisp CSS overlay so the blur below can't smear it
  brightness: 1.05,
  cDistance: 3.6,
  cAzimuthAngle: 180,
  cPolarAngle: 80,
  cameraZoom: 9.1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 50,
  rotationY: 0,
  rotationZ: -60
}

const PRESETS: Record<Exclude<BgPreset, 'off'>, Partial<SGProps>> = {
  // Warm but not neon — visible tint that still harmonizes with the dark UI.
  ember: { ...BASE, type: 'waterPlane', color1: '#161512', color2: '#5a3a2a', color3: '#b4643f', uSpeed: 0.08, uStrength: 1.3, uDensity: 1.3 },
  dusk: { ...BASE, type: 'plane', color1: '#131210', color2: '#26231d', color3: '#7a4c38', uSpeed: 0.06, uStrength: 1.0, uDensity: 1.1 },
  molten: { ...BASE, type: 'sphere', color1: '#100f0d', color2: '#4a2f22', color3: '#c06a42', uSpeed: 0.1, uStrength: 0.9, uDensity: 1.4, cDistance: 3.2 },
  charcoal: { ...BASE, type: 'waterPlane', color1: '#161512', color2: '#2e2b25', color3: '#463f36', uSpeed: 0.05, uStrength: 1.1, uDensity: 1.2 },
  // GitHub palette: dark canvas → green → blue (not in the home cycle; used by the GitHub panel)
  github: { ...BASE, type: 'waterPlane', color1: '#0d1117', color2: '#196c3a', color3: '#1f6feb', uSpeed: 0.07, uStrength: 1.2, uDensity: 1.3 }
}

/**
 * Subtle animated gradient background (shadergradient / three.js). Sits behind
 * content, non-interactive, with a dark scrim so text stays legible.
 */
export default function ShaderBackground({
  preset,
  opacity = 0.7
}: {
  preset: BgPreset
  opacity?: number
}): React.JSX.Element | null {
  if (preset === 'off') return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* blurred gradient — soft low-contrast wash (no hard blob edges) */}
      <div
        style={{
          position: 'absolute',
          inset: '-12%',
          opacity,
          filter: 'blur(36px) saturate(0.9)',
          transform: 'scale(1.15)'
        }}
      >
        <ShaderGradientCanvas style={{ width: '100%', height: '100%' }} pointerEvents="none" pixelDensity={1.5}>
          <ShaderGradient {...PRESETS[preset]} />
        </ShaderGradientCanvas>
      </div>

      {/* crisp fine film grain (independent of the blur) */}
      <div className="absolute inset-0" style={{ backgroundImage: GRAIN, opacity: 0.13, mixBlendMode: 'overlay' }} />

      {/* scrim: tint in the center, fade to the app bg at the edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 100% at 50% 34%, rgba(22,21,18,0.05), rgba(22,21,18,0.42) 60%, rgba(22,21,18,0.85) 100%)'
        }}
      />
    </div>
  )
}
