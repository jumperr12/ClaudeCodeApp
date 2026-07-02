import { useState } from 'react'
import { EFFORT_LEVELS, supportsUltracode, type EffortLevel } from '@shared/types'
import Icon from './Icon'
import { useSessionsStore } from '@/stores/sessions'
import type { TabState } from '@/lib/chat'

type Stop = { id: EffortLevel | 'ultracode'; label: string }

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
  const stops: Stop[] = ultraOk
    ? [...EFFORT_LEVELS, { id: 'ultracode', label: 'Ultracode' }]
    : EFFORT_LEVELS.map((e) => ({ id: e.id, label: e.label }))

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
          isUltra ? 'text-accent' : 'text-muted hover:text-fg'
        }`}
        title="Effort — od Faster do Smarter (prawy skraj: Ultracode)"
      >
        {isUltra ? <Icon name="sparkles" size={12} /> : <Icon name="gauge" size={12} />}
        <span className="whitespace-nowrap">{isUltra ? 'Ultracode' : `effort: ${current.label}`}</span>
        <Icon name="chevronDown" size={10} className="opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 z-50 w-64 bg-panel border border-border rounded-lg shadow-2xl p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-bright font-semibold text-[13px]">Effort</span>
              <span className={`text-[13px] font-semibold ${isUltra ? 'text-accent' : 'text-fg'}`}>
                {current.label}
              </span>
              <Icon
                name="alert"
                size={13}
                className="ml-auto text-dim"
                title={
                  'Wyższy effort = model myśli dłużej i dokładniej (Smarter), niższy = szybciej (Faster).\n' +
                  'Ultracode (tylko Opus 4.7/4.8, Fable 5): xhigh + dynamiczna orkiestracja workflow.'
                }
              />
            </div>

            <div className="flex justify-between text-dim text-[11px] mb-1">
              <span>Faster</span>
              <span>Smarter</span>
            </div>

            {/* slider */}
            <div className="relative h-5 select-none">
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full border border-border overflow-hidden"
                style={{
                  background:
                    'linear-gradient(to right, color-mix(in srgb, var(--color-accent) 12%, var(--color-panel2)), var(--color-accent))'
                }}
              >
                {/* dotted texture */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: 'radial-gradient(var(--color-bg) 0.5px, transparent 0.6px)',
                    backgroundSize: '5px 5px'
                  }}
                />
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-bright shadow-md ring-1 ring-black/30 pointer-events-none transition-[left]"
                style={{ left: `calc(${pct}% - 8px)` }}
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
            <div className="flex justify-between mt-1.5 text-[10px]">
              {stops.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => pick(i)}
                  className={`px-0.5 ${
                    i === idx ? (isUltra ? 'text-accent font-semibold' : 'text-fg font-semibold') : 'text-dim hover:text-fg'
                  }`}
                >
                  {s.id === 'ultracode' ? 'ultra' : s.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
