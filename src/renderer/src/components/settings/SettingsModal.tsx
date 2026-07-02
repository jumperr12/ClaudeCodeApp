import { useState } from 'react'
import { MODELS, PERMISSION_MODES, type PermissionMode } from '@shared/types'
import Modal from '../Modal'
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

  return (
    <Modal title="⚙ Ustawienia" onClose={close} width="560px">
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
                  className="bg-accent hover:bg-accent-soft text-bg font-bold rounded px-3"
                >
                  {keySaved ? '✓' : 'Zapisz'}
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
          <div className={label}>Model agenta (nowe sesje)</div>
          <select value={settings.model} onChange={(e) => void update({ model: e.target.value })} className={select}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className={label}>Model superprompta</div>
          <select
            value={settings.superpromptModel}
            onChange={(e) => void update({ superpromptModel: e.target.value })}
            className={select}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className={label}>Domyślny tryb uprawnień (nowe sesje)</div>
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
      </div>
    </Modal>
  )
}
