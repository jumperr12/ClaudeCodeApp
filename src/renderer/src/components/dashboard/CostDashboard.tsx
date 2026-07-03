import { useEffect, useState } from 'react'
import type { CostRecord } from '@shared/types'
import Modal from '../Modal'
import Icon from '../Icon'
import { useUiStore } from '@/stores/ui'

export default function CostDashboard(): React.JSX.Element {
  const setUi = useUiStore((s) => s.set)
  const [records, setRecords] = useState<CostRecord[] | null>(null)

  useEffect(() => {
    void window.api.costList().then(setRecords)
  }, [])

  const close = (): void => setUi({ dashboardOpen: false })

  // daily aggregation for the bar chart (last 14 days present in data)
  const byDate = new Map<string, number>()
  for (const r of records ?? []) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.costUsd)
  const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-14)
  const maxDay = Math.max(0.0001, ...days.map(([, v]) => v))
  const total = (records ?? []).reduce((acc, r) => acc + r.costUsd, 0)
  const totalIn = (records ?? []).reduce((acc, r) => acc + r.inputTokens, 0)
  const totalOut = (records ?? []).reduce((acc, r) => acc + r.outputTokens, 0)

  return (
    <Modal title={<><Icon name="chart" size={16} /> Cost & token dashboard</>} onClose={close} width="820px">
      {records === null ? (
        <div className="text-dim">
          <span className="shimmer">Calculating…</span>
        </div>
      ) : records.length === 0 ? (
        <div className="text-dim py-4">
          No data yet — costs appear after the first completed turns. On a subscription login the
          amounts are estimates.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Total cost', `$${total.toFixed(2)}`],
              ['Input tokens', totalIn.toLocaleString('en-US')],
              ['Output tokens', totalOut.toLocaleString('en-US')]
            ].map(([label, value]) => (
              <div key={label} className="bg-panel2 border border-border rounded p-3">
                <div className="text-dim text-[11px]">{label}</div>
                <div className="text-bright text-lg font-bold">{value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-dim text-[11px] uppercase tracking-wider mb-2">Daily cost</div>
            <div className="flex items-end gap-1.5 h-28">
              {days.map(([date, v]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1" title={`${date}: $${v.toFixed(3)}`}>
                  <div
                    className="w-full bg-accent/70 hover:bg-accent rounded-t transition-colors"
                    style={{ height: `${Math.max(3, (v / maxDay) * 100)}%` }}
                  />
                  <div className="text-dim text-[9px]">{date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-dim text-[11px] uppercase tracking-wider mb-2">Per project</div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-dim text-left">
                  <th className="py-1 font-normal">Date</th>
                  <th className="font-normal">Project</th>
                  <th className="text-right font-normal">Turns</th>
                  <th className="text-right font-normal">Input</th>
                  <th className="text-right font-normal">Output</th>
                  <th className="text-right font-normal">Cost</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 50).map((r) => (
                  <tr key={`${r.date}|${r.project}`} className="border-t border-border">
                    <td className="py-1 text-muted">{r.date}</td>
                    <td className="text-fg">{r.project}</td>
                    <td className="text-right text-muted">{r.turns}</td>
                    <td className="text-right text-muted">{r.inputTokens.toLocaleString('en-US')}</td>
                    <td className="text-right text-muted">{r.outputTokens.toLocaleString('en-US')}</td>
                    <td className="text-right text-bright">${r.costUsd.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
