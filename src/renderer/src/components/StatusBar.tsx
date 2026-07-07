import { MODEL_FAMILIES, PERMISSION_MODES, modelLabel, type PermissionMode } from '@shared/types'
import type { TabState } from '@/lib/chat'
import { fmtTokens } from '@/lib/chat'
import Icon from './Icon'
import InlineSelect from './InlineSelect'
import EffortControl from './EffortControl'
import UsageMeter from './UsageMeter'
import { useSessionsStore } from '@/stores/sessions'

export default function StatusBar({ tab }: { tab: TabState }): React.JSX.Element {
  const setPermissionMode = useSessionsStore((s) => s.setPermissionMode)
  const setModel = useSessionsStore((s) => s.setModel)
  const contextPct = Math.min(100, Math.round((tab.contextTokens / tab.contextLimit) * 100))
  const modeLabel = PERMISSION_MODES.find((m) => m.id === tab.permissionMode)?.label ?? tab.permissionMode

  return (
    <div className="h-7 shrink-0 border-t border-border bg-bg flex items-center gap-4 px-3 pt-[3px] text-[11px] text-muted select-none [&_svg]:-translate-y-px">
      <span className="truncate max-w-[240px] flex items-center gap-1.5" title={tab.cwd ?? ''}>
        <Icon name="folder" size={13} className="shrink-0" /> {tab.cwd ?? 'no project'}
      </span>

      {/* model — every version, grouped by family */}
      <InlineSelect
        value={tab.model}
        onChange={(id) => void setModel(tab.id, id)}
        label={modelLabel(tab.model)}
        title="Agent model (for this tab)"
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

      {/* effort + ultracode */}
      <EffortControl tab={tab} />

      {/* permission mode */}
      <InlineSelect
        value={tab.permissionMode}
        onChange={(m) => void setPermissionMode(tab.id, m as PermissionMode)}
        label={<span className="text-muted">{modeLabel}</span>}
        title="Permission mode (Shift+Tab)"
      >
        {PERMISSION_MODES.map((m) => (
          <option key={m.id} value={m.id} className="bg-panel text-fg">
            {m.label}
          </option>
        ))}
      </InlineSelect>

      <div className="ml-auto flex items-center gap-3">
        <UsageMeter />
        {tab.sessionTokens > 0 && (
          <span
            className="tabular-nums"
            title={`Session tokens: ${tab.sessionTokens.toLocaleString('en-US')} (input+output+cache-write, excl. cache reads)`}
          >
            {fmtTokens(tab.sessionTokens)} tok
          </span>
        )}
        <div
          className="flex items-center gap-1.5"
          title={`Context: ~${tab.contextTokens.toLocaleString('en-US')} tokens`}
        >
          <span>context</span>
          <div className="w-24 h-1.5 bg-panel2 rounded overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${contextPct}%`,
                background: contextPct > 85 ? '#f0483e' : contextPct > 60 ? '#f5b820' : '#35c94a'
              }}
            />
          </div>
          <span>{contextPct}%</span>
        </div>
        <span className={`flex items-center gap-1.5 ${tab.status === 'working' ? 'text-accent' : 'text-dim'}`}>
          <Icon name={tab.status === 'idle' || tab.status === 'empty' ? 'circle' : 'dot'} size={9} />
          {tab.status === 'working' ? 'working' : tab.status === 'connecting' ? 'connecting' : 'ready'}
        </span>
      </div>
    </div>
  )
}
