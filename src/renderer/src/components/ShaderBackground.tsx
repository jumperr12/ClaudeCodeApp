import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react'

type SGProps = React.ComponentProps<typeof ShaderGradient>

export type BgPreset = 'off' | 'ember' | 'dusk' | 'molten' | 'charcoal'

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
  grain: 'on',
  grainBlending: 0.38,
  brightness: 1.1,
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
  ember: { ...BASE, type: 'waterPlane', color1: '#161512', color2: '#b4643f', color3: '#d97757', uSpeed: 0.08, uStrength: 1.3, uDensity: 1.3 },
  dusk: { ...BASE, type: 'plane', color1: '#12110f', color2: '#26231d', color3: '#d97757', uSpeed: 0.06, uStrength: 1.0, uDensity: 1.1 },
  molten: { ...BASE, type: 'sphere', color1: '#0f0e0c', color2: '#a5502f', color3: '#e08a5e', uSpeed: 0.1, uStrength: 0.9, uDensity: 1.4, cDistance: 3.2 },
  charcoal: { ...BASE, type: 'waterPlane', color1: '#161512', color2: '#2e2b25', color3: '#3a3630', uSpeed: 0.05, uStrength: 1.1, uDensity: 1.2 }
}

/**
 * Subtle animated gradient background (shadergradient / three.js). Sits behind
 * content, non-interactive, with a dark scrim so text stays legible.
 */
export default function ShaderBackground({
  preset,
  opacity = 0.55
}: {
  preset: BgPreset
  opacity?: number
}): React.JSX.Element | null {
  if (preset === 'off') return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div style={{ position: 'absolute', inset: 0, opacity }}>
        <ShaderGradientCanvas style={{ width: '100%', height: '100%' }} pointerEvents="none" pixelDensity={2}>
          <ShaderGradient {...PRESETS[preset]} />
        </ShaderGradientCanvas>
      </div>
      {/* scrim for legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(22,21,18,0.35), rgba(22,21,18,0.82))'
        }}
      />
    </div>
  )
}
