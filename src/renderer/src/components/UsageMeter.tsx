import { useEffect, useState } from 'react'
import type { PlanUsage, UsageWindow } from '@shared/types'
import Icon from './Icon'
import { useSessionsStore, useActiveTab } from '@/stores/sessions'
import { useUiStore } from '@/stores/ui'

function resetIn(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return 'resets soon'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `resets in ${h > 0 ? `${h}h ` : ''}${m}m`
}

function barColor(pct: number): string {
  // saturated thresholds (kept local so the rest of the UI stays muted)
  return pct > 85 ? '#f0483e' : pct > 60 ? '#f5b820' : '#35c94a'
}

/**
 * Status-bar usage meter. Prefers the REAL claude.ai plan 5-hour utilization
 * (same data as Claude Code's /usage); falls back to a local rolling estimate
 * for API-key sessions where plan limits don't apply.
 */
export default function UsageMeter(): React.JSX.Element | null {
  const tab = useActiveTab()
  const hasSession = !!tab?.sdkSessionId
  const tabId = tab?.id
  const liveCost = useSessionsStore((s) => s.tabs.reduce((a, t) => a + t.costUsd, 0))
  const setUi = useUiStore((s) => s.set)

  const [plan, setPlan] = useState<PlanUsage | null>(null)
  const [local, setLocal] = useState<UsageWindow | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      let p: PlanUsage | null = null
      if (hasSession && tabId) {
        p = await window.api.planUsage(tabId).catch(() => null)
      }
      if (cancelled) return
      setPlan(p)
      // fall back to local estimate when plan limits aren't available
      if (!p?.available) {
        const w = await window.api.usageWindow(5).catch(() => null)
        if (!cancelled) setLocal(w)
      }
    }
    void load()
    const interval = setInterval(() => void load(), 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [hasSession, tabId, liveCost])

  // --- real plan usage (subscription) ---
  const five = plan?.available ? plan.fiveHour : null
  if (five && five.utilization !== null) {
    const pct = Math.max(0, Math.min(100, Math.round(five.utilization)))
    const seven = plan?.sevenDay
    return (
      <button
        onClick={() => setUi({ dashboardOpen: true })}
        className="flex items-center gap-1.5 text-dim hover:text-fg transition-colors"
        title={
          `${plan?.subscriptionType ?? ''} plan limit — 5h window: ${pct}% (${resetIn(five.resetsAt)})` +
          (seven && seven.utilization !== null
            ? `\n7-day window: ${Math.round(seven.utilization)}% (${resetIn(seven.resetsAt)})`
            : '') +
          '\nFrom your claude.ai plan (same as /usage in Claude Code).'
        }
      >
        <Icon
          name="gauge"
          size={16}
          style={{ color: barColor(pct), filter: `drop-shadow(0 0 2.5px ${barColor(pct)}55)` }}
        />
        <span className="tabular-nums">5h</span>
        <div className="w-16 h-1.5 bg-panel2 rounded overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: barColor(pct), boxShadow: `0 0 4px ${barColor(pct)}66` }}
          />
        </div>
        <span className="tabular-nums text-fg">{pct}%</span>
        {five.resetsAt && <span className="text-dim">· {resetIn(five.resetsAt)}</span>}
      </button>
    )
  }

  // --- local fallback estimate (API-key mode / no plan limits) ---
  const buckets = local?.buckets ?? []
  const max = Math.max(0.0001, ...buckets)
  const cost = local?.costUsd ?? 0
  const turns = local?.turns ?? 0

  return (
    <button
      onClick={() => setUi({ dashboardOpen: true })}
      className="flex items-center gap-1.5 text-dim hover:text-fg transition-colors"
      title={`This app's usage over the last 5h (local estimate): $${cost.toFixed(4)} · ${turns} turns.\nPlan limit unavailable in this mode (API key or no live session).`}
    >
      <Icon name="gauge" size={16} className="text-accent/80" />
      <span className="tabular-nums">5h</span>
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
