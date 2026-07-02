import { MODELS, PERMISSION_MODES, type PermissionMode } from '@shared/types'
import type { TabState } from '@/lib/chat'
import { useSessionsStore } from '@/stores/sessions'

export default function StatusBar({ tab }: { tab: TabState }): React.JSX.Element {
  const setPermissionMode = useSessionsStore((s) => s.setPermissionMode)
  const setModel = useSessionsStore((s) => s.setModel)
  const contextPct = Math.min(100, Math.round((tab.contextTokens / tab.contextLimit) * 100))
  const knownModel = MODELS.find((m) => tab.model.includes(m.id))?.id ?? tab.model

  return (
    <div className="h-7 shrink-0 border-t border-border bg-bg flex items-center gap-4 px-3 text-[11px] text-muted select-none">
      <span className="truncate max-w-[280px]" title={tab.cwd ?? ''}>
        📁 {tab.cwd ?? 'brak projektu'}
      </span>
      <select
        value={knownModel}
        onChange={(e) => void setModel(tab.id, e.target.value)}
        className="bg-transparent border-none outline-none text-fg hover:text-accent cursor-pointer"
        title="Model agenta (dla tej zakładki)"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id} className="bg-panel text-fg">
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={tab.permissionMode}
        onChange={(e) => void setPermissionMode(tab.id, e.target.value as PermissionMode)}
        className="bg-transparent border-none outline-none text-muted hover:text-fg cursor-pointer"
        title="Tryb uprawnień"
      >
        {PERMISSION_MODES.map((m) => (
          <option key={m.id} value={m.id} className="bg-panel text-fg">
            {m.label}
          </option>
        ))}
      </select>
      <div className="ml-auto flex items-center gap-3">
        {tab.costUsd > 0 && <span title="Koszt sesji">${tab.costUsd.toFixed(4)}</span>}
        <div className="flex items-center gap-1.5" title={`Kontekst: ~${tab.contextTokens.toLocaleString('pl-PL')} tokenów`}>
          <span>kontekst</span>
          <div className="w-24 h-1.5 bg-panel2 rounded overflow-hidden">
            <div
              className={`h-full transition-all ${
                contextPct > 85 ? 'bg-bad' : contextPct > 60 ? 'bg-warn' : 'bg-good'
              }`}
              style={{ width: `${contextPct}%` }}
            />
          </div>
          <span>{contextPct}%</span>
        </div>
        <span className={tab.status === 'working' ? 'text-accent' : 'text-dim'}>
          {tab.status === 'working' ? '● pracuje' : tab.status === 'connecting' ? '● łączenie' : '○ gotowy'}
        </span>
      </div>
    </div>
  )
}
