import { useEffect, useState } from 'react'
import type { HistoryEntry } from '@shared/types'
import Modal from '../Modal'
import Icon from '../Icon'
import { useUiStore } from '@/stores/ui'
import { useActiveTab, useSessionsStore } from '@/stores/sessions'

export default function HistoryModal(): React.JSX.Element {
  const tab = useActiveTab()
  const setUi = useUiStore((s) => s.set)
  const addTab = useSessionsStore((s) => s.addTab)
  const openFolder = useSessionsStore((s) => s.openFolder)
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [query, setQuery] = useState('')
  const [cwd, setCwd] = useState<string | null>(tab?.cwd ?? null)

  useEffect(() => {
    if (!cwd) return
    let cancelled = false
    const run = async (): Promise<void> => {
      const res = query.trim()
        ? await window.api.historySearch(cwd, query)
        : await window.api.historyList(cwd)
      if (!cancelled) setEntries(res)
    }
    const t = setTimeout(() => void run(), query ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [cwd, query])

  const close = (): void => setUi({ historyOpen: false })

  const resume = async (entry: HistoryEntry): Promise<void> => {
    close()
    const tabId = addTab()
    await openFolder(tabId, entry.cwd, entry.sessionId)
  }

  const pickOther = async (): Promise<void> => {
    const folder = await window.api.pickFolder()
    if (folder) setCwd(folder)
  }

  return (
    <Modal title={<><Icon name="history" size={16} /> Historia sesji</>} onClose={close} width="760px">
      {!cwd ? (
        <div className="text-center py-6">
          <div className="text-muted mb-3">Wybierz folder projektu, aby zobaczyć jego sesje.</div>
          <button
            onClick={() => void pickOther()}
            className="bg-accent hover:bg-accent-soft text-bg font-bold rounded px-4 py-1.5"
          >
            Wybierz folder…
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj w treści sesji…"
              className="flex-1 bg-panel2 border border-border rounded px-3 py-1.5 outline-none text-bright placeholder:text-dim focus:border-accent"
            />
            <button onClick={() => void pickOther()} className="text-muted hover:text-fg text-[12px]">
              inny folder…
            </button>
          </div>
          <div className="text-dim text-[11px] truncate flex items-center gap-1.5">
            <Icon name="folder" size={12} /> {cwd}
          </div>
          {entries === null ? (
            <div className="text-dim py-4">
              <span className="shimmer">Czytanie historii…</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-dim py-4">Brak zapisanych sesji dla tego projektu.</div>
          ) : (
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {entries.map((e) => (
                <button
                  key={e.sessionId}
                  onClick={() => void resume(e)}
                  className="w-full text-left border border-border hover:border-accent rounded p-2.5 bg-panel2 group"
                  title="Kliknij, aby wznowić tę sesję w nowej zakładce"
                >
                  <div className="flex items-center gap-2 text-[11px] text-dim">
                    <span>{new Date(e.mtime).toLocaleString('pl-PL')}</span>
                    <span>· {(e.sizeBytes / 1024).toFixed(0)} KB</span>
                    <span className="ml-auto text-accent opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <Icon name="refresh" size={11} /> wznów
                    </span>
                  </div>
                  <div className="text-fg text-[12.5px] mt-0.5 line-clamp-2">{e.firstPrompt}</div>
                </button>
              ))}
            </div>
          )}
          <div className="text-dim text-[11px]">
            Sesje są współdzielone z CLI — sesję zaczętą w terminalu wznowisz tutaj i odwrotnie.
          </div>
        </div>
      )}
    </Modal>
  )
}
