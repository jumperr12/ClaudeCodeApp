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
  brightness: 0.85,
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
  // Muted, closer to the app's dark palette so the gradient tints rather than pops.
  ember: { ...BASE, type: 'waterPlane', color1: '#161512', color2: '#2f2620', color3: '#7c4a34', uSpeed: 0.08, uStrength: 1.3, uDensity: 1.3 },
  dusk: { ...BASE, type: 'plane', color1: '#131210', color2: '#1e1c18', color3: '#4c3a30', uSpeed: 0.06, uStrength: 1.0, uDensity: 1.1 },
  molten: { ...BASE, type: 'sphere', color1: '#100f0d', color2: '#2c2019', color3: '#6e4230', uSpeed: 0.1, uStrength: 0.9, uDensity: 1.4, cDistance: 3.2 },
  charcoal: { ...BASE, type: 'waterPlane', color1: '#161512', color2: '#22201b', color3: '#302c26', uSpeed: 0.05, uStrength: 1.1, uDensity: 1.2 }
}

/**
 * Subtle animated gradient background (shadergradient / three.js). Sits behind
 * content, non-interactive, with a dark scrim so text stays legible.
 */
export default function ShaderBackground({
  preset,
  opacity = 0.45
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
      {/* scrim: let the tint show in the center, fade to the app bg at the edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 100% at 50% 38%, rgba(22,21,18,0.15), rgba(22,21,18,0.6) 55%, rgba(22,21,18,0.92) 100%)'
        }}
      />
    </div>
  )
}
