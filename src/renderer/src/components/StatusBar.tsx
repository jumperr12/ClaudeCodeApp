import { MODEL_FAMILIES, PERMISSION_MODES, modelLabel, type PermissionMode } from '@shared/types'
import type { TabState } from '@/lib/chat'
import Icon from './Icon'
import InlineSelect from './InlineSelect'
import EffortSlider from './EffortSlider'
import UsageMeter from './UsageMeter'
import { useSessionsStore } from '@/stores/sessions'

export default function StatusBar({ tab }: { tab: TabState }): React.JSX.Element {
  const setPermissionMode = useSessionsStore((s) => s.setPermissionMode)
  const setModel = useSessionsStore((s) => s.setModel)
  const setEffort = useSessionsStore((s) => s.setEffort)
  const contextPct = Math.min(100, Math.round((tab.contextTokens / tab.contextLimit) * 100))
  const modeLabel = PERMISSION_MODES.find((m) => m.id === tab.permissionMode)?.label ?? tab.permissionMode

  return (
    <div className="h-7 shrink-0 border-t border-border bg-bg flex items-center gap-4 px-3 text-[11px] text-muted select-none">
      <span className="truncate max-w-[240px] flex items-center gap-1.5" title={tab.cwd ?? ''}>
        <Icon name="folder" size={13} className="shrink-0" /> {tab.cwd ?? 'brak projektu'}
      </span>

      {/* model — every version, grouped by family */}
      <InlineSelect
        value={tab.model}
        onChange={(id) => void setModel(tab.id, id)}
        label={modelLabel(tab.model)}
        title="Model agenta (dla tej zakładki)"
      >
        {MODEL_FAMILIES.map((fam) => (
          <optgroup key={fam.family} label={fam.label} className="bg-panel text-fg">
            {fam.versions.map((v) => (
              <option key={v.id} value={v.id} className="bg-panel text-fg">
                {v.label}
                {v.legacy ? ' (legacy)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </InlineSelect>

      {/* effort */}
      <EffortSlider value={tab.effort} onChange={(e) => void setEffort(tab.id, e)} />

      {/* permission mode */}
      <InlineSelect
        value={tab.permissionMode}
        onChange={(m) => void setPermissionMode(tab.id, m as PermissionMode)}
        label={<span className="text-muted">{modeLabel}</span>}
        title="Tryb uprawnień (Shift+Tab)"
      >
        {PERMISSION_MODES.map((m) => (
          <option key={m.id} value={m.id} className="bg-panel text-fg">
            {m.label}
          </option>
        ))}
      </InlineSelect>

      <div className="ml-auto flex items-center gap-3">
        <UsageMeter />
        {tab.costUsd > 0 && <span title="Koszt sesji">${tab.costUsd.toFixed(4)}</span>}
        <div
          className="flex items-center gap-1.5"
          title={`Kontekst: ~${tab.contextTokens.toLocaleString('pl-PL')} tokenów`}
        >
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
