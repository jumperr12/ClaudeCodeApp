import {
  MODEL_FAMILY_ORDER,
  familyDef,
  familyOf,
  modelLabel,
  newestModelId,
  PERMISSION_MODES,
  type ModelFamily,
  type PermissionMode
} from '@shared/types'
import type { TabState } from '@/lib/chat'
import Icon from './Icon'
import UsageMeter from './UsageMeter'
import { useSessionsStore } from '@/stores/sessions'
import { useSettingsStore } from '@/stores/settings'

export default function StatusBar({ tab }: { tab: TabState }): React.JSX.Element {
  const setPermissionMode = useSessionsStore((s) => s.setPermissionMode)
  const setModel = useSessionsStore((s) => s.setModel)
  const familyVersions = useSettingsStore((s) => s.settings?.familyVersions)
  const contextPct = Math.min(100, Math.round((tab.contextTokens / tab.contextLimit) * 100))
  const currentFamily: ModelFamily = familyOf(tab.model) ?? 'opus'

  const pickFamily = (family: ModelFamily): void => {
    const id = familyVersions?.[family] ?? newestModelId(family)
    void setModel(tab.id, id)
  }

  return (
    <div className="h-7 shrink-0 border-t border-border bg-bg flex items-center gap-4 px-3 text-[11px] text-muted select-none">
      <span className="truncate max-w-[280px] flex items-center gap-1.5" title={tab.cwd ?? ''}>
        <Icon name="folder" size={13} className="shrink-0" /> {tab.cwd ?? 'brak projektu'}
      </span>
      <select
        value={currentFamily}
        onChange={(e) => pickFamily(e.target.value as ModelFamily)}
        className="bg-transparent border-none outline-none text-fg hover:text-accent cursor-pointer"
        title={`Model: ${modelLabel(tab.model)} (klasa dla tej zakładki; wersję ustawisz w Ustawieniach)`}
      >
        {MODEL_FAMILY_ORDER.map((f) => (
          <option key={f} value={f} className="bg-panel text-fg">
            {familyDef(f).label}
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
        <UsageMeter />
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
        <span className={`flex items-center gap-1.5 ${tab.status === 'working' ? 'text-accent' : 'text-dim'}`}>
          <Icon name={tab.status === 'idle' || tab.status === 'empty' ? 'circle' : 'dot'} size={9} />
          {tab.status === 'working' ? 'pracuje' : tab.status === 'connecting' ? 'łączenie' : 'gotowy'}
        </span>
      </div>
    </div>
  )
}
