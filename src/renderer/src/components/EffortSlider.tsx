import { EFFORT_LEVELS, type EffortLevel } from '@shared/types'

/**
 * Compact 5-stop effort slider (low → max) styled with the app accent, matching
 * the model-version sliders in Settings.
 */
export default function EffortSlider({
  value,
  onChange,
  width = 76,
  showLabel = true
}: {
  value: EffortLevel
  onChange: (level: EffortLevel) => void
  width?: number
  showLabel?: boolean
}): React.JSX.Element {
  const idx = Math.max(0, EFFORT_LEVELS.findIndex((e) => e.id === value))

  return (
    <div className="flex items-center gap-1.5" title={`Poziom wysiłku (reasoning effort): ${value}`}>
      {showLabel && <span className="text-muted">effort</span>}
      <input
        type="range"
        min={0}
        max={EFFORT_LEVELS.length - 1}
        step={1}
        value={idx}
        onChange={(e) => onChange(EFFORT_LEVELS[Number(e.target.value)].id)}
        style={{ width, accentColor: 'var(--color-accent)' }}
        className="cursor-pointer align-middle"
      />
      <span className="text-fg tabular-nums w-10">{value}</span>
    </div>
  )
}
