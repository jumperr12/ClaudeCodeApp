import { useEffect, useState } from 'react'
import type { UsageWindow } from '@shared/types'
import Icon from './Icon'
import { useSessionsStore } from '@/stores/sessions'
import { useUiStore } from '@/stores/ui'

/**
 * Rolling 5-hour usage meter for the status bar. Local estimate from the app's
 * own completed turns (the real subscription quota isn't exposed by the API).
 */
export default function UsageMeter(): React.JSX.Element {
  const [usage, setUsage] = useState<UsageWindow | null>(null)
  // sum of live session costs — changes whenever a turn completes → triggers refetch
  const liveCost = useSessionsStore((s) => s.tabs.reduce((a, t) => a + t.costUsd, 0))
  const setUi = useUiStore((s) => s.set)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      void window.api.usageWindow(5).then((u) => !cancelled && setUsage(u))
    }
    load()
    const interval = setInterval(load, 60_000) // advance the rolling window
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [liveCost])

  const buckets = usage?.buckets ?? []
  const max = Math.max(0.0001, ...buckets)
  const cost = usage?.costUsd ?? 0
  const turns = usage?.turns ?? 0

  return (
    <button
      onClick={() => setUi({ dashboardOpen: true })}
      className="flex items-center gap-1.5 text-dim hover:text-fg transition-colors"
      title={`Zużycie z ostatnich 5h (lokalny szacunek): $${cost.toFixed(4)} · ${turns} tur · ${(usage?.tokens ?? 0).toLocaleString('pl-PL')} tokenów.\nKliknij, aby otworzyć dashboard. To nie jest oficjalny limit subskrypcji.`}
    >
      <Icon name="gauge" size={13} className="text-accent/80" />
      <span className="tabular-nums">5h</span>
      {/* sparkline */}
      <svg width="46" height="14" viewBox="0 0 46 14" className="overflow-visible">
        {buckets.map((v, i) => {
          const w = 46 / buckets.length
          const h = Math.max(1, (v / max) * 14)
          return (
            <rect
              key={i}
              x={i * w + 0.5}
              y={14 - h}
              width={Math.max(1, w - 1)}
              height={h}
              rx={0.5}
              style={{ fill: v > 0 ? 'var(--color-accent)' : 'var(--color-panel2)', fillOpacity: v > 0 ? 0.85 : 1 }}
            />
          )
        })}
      </svg>
      <span className="tabular-nums text-fg">${cost.toFixed(2)}</span>
      <span className="text-dim">· {turns}</span>
    </button>
  )
}
