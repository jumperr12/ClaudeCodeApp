import { useState } from 'react'
import { availableEffortLevels, supportsUltracode, type EffortLevel } from '@shared/types'
import Icon from './Icon'
import { useSessionsStore } from '@/stores/sessions'
import type { TabState } from '@/lib/chat'

type Stop = { id: EffortLevel | 'ultracode'; label: string }

/** Vivid, high-energy colour for Ultracode — distinct from the app's terracotta accent. */
const ULTRA = '#7c5cff'
const ULTRA_SOFT = '#a888ff'

/**
 * "Effort" control styled after Claude Code: a single Faster→Smarter slider
 * whose top stop is Ultracode (for xhigh-capable models). App-accent themed.
 * Renders as a status-bar chip that opens a popover with the slider.
 */
export default function EffortControl({ tab }: { tab: TabState }): React.JSX.Element {
  const setEffort = useSessionsStore((s) => s.setEffort)
  const setUltracode = useSessionsStore((s) => s.setUltracode)
  const [open, setOpen] = useState(false)

  const ultraOk = supportsUltracode(tab.model)
  const levels = availableEffortLevels(tab.model)
  const stops: Stop[] = ultraOk
    ? [...levels, { id: 'ultracode', label: 'Ultracode' }]
    : levels.map((e) => ({ id: e.id, label: e.label }))

  const idx = tab.ultracode ? stops.length - 1 : Math.max(0, stops.findIndex((s) => s.id === tab.effort))
  const current = stops[idx]
  const isUltra = current.id === 'ultracode'
  const pct = stops.length > 1 ? (idx / (stops.length - 1)) * 100 : 0

  const pick = (i: number): void => {
    const stop = stops[i]
    if (stop.id === 'ultracode') {
      void setUltracode(tab.id, true)
    } else {
      if (tab.ultracode) void setUltracode(tab.id, false)
      void setEffort(tab.id, stop.id)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-panel2 ${
          isUltra ? 'font-semibold' : 'text-muted hover:text-fg'
        }`}
        style={isUltra ? { color: ULTRA_SOFT } : undefined}
        title="Effort — from Faster to Smarter (far right: Ultracode)"
      >
        {isUltra ? <Icon name="sparkles" size={12} /> : <Icon name="gauge" size={12} />}
        <span className="whitespace-nowrap">{isUltra ? 'Ultracode' : `effort: ${current.label}`}</span>
        <Icon name="chevronDown" size={10} className="opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-panel border border-border rounded-lg shadow-2xl p-3.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-bright font-semibold text-[14px]">Effort</span>
              <span
                className="text-[14px] font-semibold"
                style={{ color: isUltra ? ULTRA_SOFT : 'var(--color-fg)' }}
              >
                {current.label}
              </span>
              <Icon
                name="help"
                size={14}
                className="ml-auto text-dim hover:text-fg"
                title={
                  'Higher effort = the model thinks longer and more thoroughly (Smarter); lower = faster (Faster).\n' +
                  'Ultracode (Opus 4.7/4.8, Fable 5 only): xhigh + dynamic workflow orchestration.'
                }
              />
            </div>

            <div className="flex justify-between text-dim text-[11px] mb-1">
              <span>Faster</span>
              <span>Smarter</span>
            </div>

            {/* slider — thick track, rounded-rectangle thumb */}
            <div className="relative h-7 select-none">
              {/* track */}
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 rounded-lg border border-border overflow-hidden"
                style={{ background: 'var(--color-panel2)' }}
              >
                {/* faster→smarter wash (subtle) */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: ultraOk
                      ? `linear-gradient(to right, transparent 30%, color-mix(in srgb, var(--color-accent) 22%, transparent) 70%, color-mix(in srgb, ${ULTRA} 55%, transparent))`
                      : 'linear-gradient(to right, transparent 40%, color-mix(in srgb, var(--color-accent) 22%, transparent))'
                  }}
                />
                {/* stop dots (interior positions) */}
                {stops.map((s, i) => {
                  if (i === 0 || i === stops.length - 1) return null
                  const ultraDot = s.id === 'ultracode'
                  return (
                    <div
                      key={s.id}
                      className="absolute top-1/2 w-[3px] h-[3px] rounded-full"
                      style={{
                        left: `${(i / (stops.length - 1)) * 100}%`,
                        transform: 'translate(-50%,-50%)',
                        background: ultraDot ? ULTRA : 'var(--color-muted)',
                        opacity: 0.65
                      }}
                    />
                  )
                })}
                {/* ultracode end marker */}
                {ultraOk && !isUltra && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 right-2 w-[7px] h-[7px] rounded-full"
                    style={{ background: ULTRA, boxShadow: `0 0 6px ${ULTRA}` }}
                  />
                )}
              </div>
              {/* thumb: rounded rectangle (inset so it stays within the track at both ends) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-6 w-7 rounded-md pointer-events-none transition-[left,box-shadow]"
                style={{
                  left: `calc(${pct}% - ${(pct / 100) * 28}px)`,
                  background: isUltra ? ULTRA_SOFT : 'var(--color-bright)',
                  boxShadow: isUltra ? `0 0 0 1px ${ULTRA}, 0 0 12px ${ULTRA}` : '0 1px 3px rgba(0,0,0,0.5)'
                }}
              />
              <input
                type="range"
                min={0}
                max={stops.length - 1}
                step={1}
                value={idx}
                onChange={(e) => pick(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Effort"
              />
            </div>

            {/* stop labels */}
            <div className="flex justify-between mt-2 text-[11px]">
              {stops.map((s, i) => {
                const active = i === idx
                const ultra = s.id === 'ultracode'
                return (
                  <button
                    key={s.id}
                    onClick={() => pick(i)}
                    className={`px-0.5 ${active ? 'font-semibold' : 'text-dim hover:text-fg'}`}
                    style={active ? { color: ultra ? ULTRA_SOFT : 'var(--color-fg)' } : ultra ? { color: ULTRA_SOFT, opacity: 0.75 } : undefined}
                  >
                    {ultra ? 'ultra' : s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
