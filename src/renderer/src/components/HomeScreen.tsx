import { useEffect, useMemo, useState } from 'react'
import { modelLabel, type HistoryEntry } from '@shared/types'
import Icon from './Icon'
import LiquidSpark from './LiquidSpark'
import { useSessionsStore } from '@/stores/sessions'
import { useSettingsStore } from '@/stores/settings'
import type { TabState } from '@/lib/chat'

const fmtTokens = (n?: number): string =>
  n === undefined ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n)

function relDate(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return `Today ${time}`
  if (d.toDateString() === yest.toDateString()) return `Yesterday ${time}`
  return `${d.toLocaleDateString('en-US')} ${time}`
}

export default function HomeScreen({ tab }: { tab: TabState }): React.JSX.Element {
  const openFolder = useSessionsStore((s) => s.openFolder)
  const lastCwd = useSettingsStore((s) => s.settings?.lastCwd ?? null)
  const [sessions, setSessions] = useState<HistoryEntry[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false
    void window.api.historyListAll(120).then((s) => !cancelled && setSessions(s))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const list = sessions ?? []
    const query = q.trim().toLowerCase()
    if (!query) return list
    return list.filter(
      (e) =>
        e.firstPrompt.toLowerCase().includes(query) ||
        (e.project ?? '').toLowerCase().includes(query) ||
        (e.model ?? '').toLowerCase().includes(query)
    )
  }, [sessions, q])

  const pick = async (): Promise<void> => {
    const folder = await window.api.pickFolder()
    if (folder) await openFolder(tab.id, folder)
  }

  const resume = (e: HistoryEntry): void => {
    if (e.cwd) void openFolder(tab.id, e.cwd, e.sessionId)
  }

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="px-6 pt-6 pb-3 flex items-center gap-3 shrink-0">
        <LiquidSpark size={24} />
        <div>
          <div className="text-bright text-lg font-bold leading-tight">Claude Code Desktop</div>
          <div className="text-dim text-[12px]">Your sessions — click to resume</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastCwd && (
            <button
              onClick={() => void openFolder(tab.id, lastCwd)}
              className="text-muted hover:text-fg text-[12px] border border-border hover:border-accent rounded px-3 py-1.5 max-w-[240px] truncate"
              title={lastCwd}
            >
              Last: {lastCwd.split(/[\\/]/).filter(Boolean).pop()}
            </button>
          )}
          <button
            onClick={() => void pick()}
            className="bg-accent hover:bg-accent-soft text-bg font-bold rounded px-4 py-1.5 flex items-center gap-1.5"
          >
            <Icon name="folder" size={15} /> New session
          </button>
        </div>
      </div>

      {/* search */}
      <div className="px-6 pb-2 shrink-0">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sessions (content, project, model)…"
          className="w-full bg-panel2 border border-border rounded px-3 py-1.5 outline-none text-bright placeholder:text-dim focus:border-accent text-[13px]"
        />
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-[900px] mx-auto">
          {sessions === null ? (
            <div className="text-dim py-8 text-center">
              <span className="shimmer">Loading sessions…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-dim py-8 text-center">
              {sessions.length === 0
                ? 'No saved sessions. Open a project to get started.'
                : 'No results for this query.'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((e) => (
                <button
                  key={e.sessionId}
                  onClick={() => resume(e)}
                  disabled={!e.cwd}
                  className="w-full text-left border border-border hover:border-accent rounded-lg p-3 bg-panel/60 hover:bg-panel disabled:opacity-50 group transition-colors"
                  title={e.cwd ? `Resume in: ${e.cwd}` : 'No project path in transcript'}
                >
                  <div className="text-fg text-[13.5px] line-clamp-1 group-hover:text-bright">{e.firstPrompt}</div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-dim flex-wrap">
                    {e.project && (
                      <span className="flex items-center gap-1 text-muted">
                        <Icon name="folder" size={11} /> {e.project}
                      </span>
                    )}
                    <span>{relDate(e.mtime)}</span>
                    {e.model && (
                      <span className="px-1.5 py-0.5 rounded bg-panel2 border border-border text-muted">
                        {modelLabel(e.model)}
                      </span>
                    )}
                    <span
                      className="flex items-center gap-1"
                      title="Processed tokens: input + generated + cache writes. Cache reads (the same context re-read on every one of hundreds of requests) are excluded, since they inflate the total many times over."
                    >
                      <Icon name="gauge" size={11} /> {fmtTokens(e.tokens)} tok
                    </span>
                    {e.turns !== undefined && e.turns > 0 && <span>· {e.turns} turns</span>}
                    {e.costUsd !== undefined && e.costUsd >= 0.0005 && (
                      <span
                        className="text-muted"
                        title="Estimate at API list prices (cache reads ×0.1). On a subscription it's included in the plan — you don't pay per token."
                      >
                        ~${e.costUsd < 1 ? e.costUsd.toFixed(3) : e.costUsd.toFixed(2)} <span className="text-dim">(API)</span>
                      </span>
                    )}
                    <span className="ml-auto text-accent opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <Icon name="refresh" size={11} /> resume
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
