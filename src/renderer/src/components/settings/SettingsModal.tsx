import { useState } from 'react'
import {
  EFFORT_LEVELS,
  MODEL_FAMILIES,
  MODEL_FAMILY_ORDER,
  familyDef,
  PERMISSION_MODES,
  type EffortLevel,
  type ModelFamily,
  type PermissionMode
} from '@shared/types'
import Modal from '../Modal'
import Icon from '../Icon'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

export default function SettingsModal(): React.JSX.Element {
  const { settings, update, setApiKey } = useSettingsStore()
  const setUi = useUiStore((s) => s.set)
  const [keyDraft, setKeyDraft] = useState('')
  const [keySaved, setKeySaved] = useState(false)

  const close = (): void => setUi({ settingsOpen: false })
  if (!settings) return <></>

  const saveKey = async (): Promise<void> => {
    await setApiKey(keyDraft.trim() || null)
    setKeyDraft('')
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 1500)
  }

  const label = 'text-muted text-[12px] mb-1'
  const select = 'w-full bg-panel2 border border-border rounded px-3 py-1.5 text-fg outline-none focus:border-accent'

  const setVersion = (family: ModelFamily, id: string): void => {
    void update({ familyVersions: { ...settings.familyVersions, [family]: id } })
  }

  // family selector chips (used for agent + superprompt default family)
  const FamilyChips = ({
    value,
    onPick
  }: {
    value: ModelFamily
    onPick: (f: ModelFamily) => void
  }): React.JSX.Element => (
    <div className="flex gap-1.5">
      {MODEL_FAMILY_ORDER.map((f) => (
        <button
          key={f}
          onClick={() => onPick(f)}
          className={`flex-1 border rounded px-2 py-1.5 text-[12px] ${
            value === f ? 'border-accent bg-accent/10 text-bright' : 'border-border text-muted hover:text-fg'
          }`}
          title={familyDef(f).versions.find((v) => v.id === settings.familyVersions[f])?.label}
        >
          {familyDef(f).label}
        </button>
      ))}
    </div>
  )

  return (
    <Modal title={<><Icon name="settings" size={16} /> Ustawienia</>} onClose={close} width="560px">
      <div className="space-y-5">
        <div>
          <div className={label}>Uwierzytelnianie</div>
          <div className="flex gap-2">
            {(
              [
                ['subscription', 'Subskrypcja Claude (logowanie z CLI)'],
                ['apiKey', 'Klucz API Anthropic']
              ] as const
            ).map(([mode, text]) => (
              <button
                key={mode}
                onClick={() => void update({ authMode: mode })}
                className={`flex-1 border rounded px-3 py-2 text-[12px] text-left ${
                  settings.authMode === mode
                    ? 'border-accent bg-accent/10 text-bright'
                    : 'border-border text-muted hover:text-fg'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
          {settings.authMode === 'subscription' && (
            <div className="text-dim text-[11px] mt-1.5">
              Używa logowania Claude Code (uruchom <code className="text-accent">claude /login</code> w
              terminalu, jeśli jeszcze nie jesteś zalogowany).
            </div>
          )}
          {settings.authMode === 'apiKey' && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder={settings.hasApiKey ? '•••••• (klucz zapisany — wpisz nowy, aby zmienić)' : 'sk-ant-…'}
                  className="flex-1 bg-panel2 border border-border rounded px-3 py-1.5 outline-none text-bright placeholder:text-dim focus:border-accent"
                />
                <button
                  onClick={() => void saveKey()}
                  className="bg-accent hover:bg-accent-soft text-bg font-bold rounded px-3 flex items-center justify-center min-w-[64px]"
                >
                  {keySaved ? <Icon name="check" size={16} /> : 'Zapisz'}
                </button>
              </div>
              <div className="text-dim text-[11px]">
                Klucz jest szyfrowany systemowo (DPAPI) — nigdy nie trafia na dysk jawnym tekstem.
                {settings.hasApiKey && (
                  <button className="text-bad ml-2 hover:underline" onClick={() => void setApiKey(null)}>
                    usuń klucz
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className={label}>Wersje modeli (domyślnie najnowsza; suwak w prawo = starsza/legacy)</div>
          <div className="space-y-2.5">
            {MODEL_FAMILIES.map((fam) => {
              const currentId = settings.familyVersions[fam.family]
              const idx = Math.max(0, fam.versions.findIndex((v) => v.id === currentId))
              const current = fam.versions[idx]
              const single = fam.versions.length === 1
              return (
                <div key={fam.family} className="bg-panel2 border border-border rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-bright font-semibold text-[13px] w-16">{fam.label}</span>
                    <span className="text-fg text-[12px]">{current.label}</span>
                    {current.legacy && (
                      <span className="text-[10px] uppercase tracking-wider text-warn border border-warn/40 rounded px-1">
                        legacy
                      </span>
                    )}
                    <span className="ml-auto text-dim text-[11px] truncate max-w-[180px]">{fam.note}</span>
                  </div>
                  {!single && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-dim text-[10px] w-16">najnowsza</span>
                      <input
                        type="range"
                        min={0}
                        max={fam.versions.length - 1}
                        step={1}
                        value={idx}
                        onChange={(e) => setVersion(fam.family, fam.versions[Number(e.target.value)].id)}
                        className="flex-1"
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <span className="text-dim text-[10px] w-10 text-right">starsza</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className={label}>Domyślny model agenta (nowe sesje)</div>
          <FamilyChips value={settings.modelFamily} onPick={(f) => void update({ modelFamily: f })} />
        </div>

        <div>
          <div className={label}>Model superprompta</div>
          <FamilyChips value={settings.superpromptFamily} onPick={(f) => void update({ superpromptFamily: f })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={label}>Domyślny tryb uprawnień</div>
            <select
              value={settings.defaultPermissionMode}
              onChange={(e) => void update({ defaultPermissionMode: e.target.value as PermissionMode })}
              className={select}
            >
              {PERMISSION_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className={label}>Domyślny effort</div>
            <select
              value={settings.defaultEffort}
              onChange={(e) => void update({ defaultEffort: e.target.value as EffortLevel })}
              className={select}
            >
              {EFFORT_LEVELS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
