import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { PermissionRequestPayload } from '@shared/types'
import type { TabState } from '@/lib/chat'
import { useSessionsStore } from '@/stores/sessions'
import DiffCard from '../diff/DiffCard'

interface Props {
  tab: TabState
  request: PermissionRequestPayload
}

export default function PermissionModal({ tab, request }: Props): React.JSX.Element {
  const respond = useSessionsStore((s) => s.respondPermission)
  const [denyReason, setDenyReason] = useState('')
  const [showDenyInput, setShowDenyInput] = useState(false)

  const allow = (): void => void respond(tab.id, { kind: 'allow' })
  const allowAlways = (): void => void respond(tab.id, { kind: 'allowAlways' })
  const deny = (): void =>
    void respond(tab.id, { kind: 'deny', message: denyReason.trim() || undefined })

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (showDenyInput) return
      if (e.key === 'Enter') {
        e.preventDefault()
        allow()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowDenyInput(true)
      } else if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        allowAlways()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDenyInput, request.requestId])

  const isEdit = !!request.diff
  const title =
    request.title ??
    (isEdit
      ? `Claude chce zmodyfikować plik ${request.diff?.filePath}`
      : `Claude chce użyć narzędzia ${request.toolName}`)

  const inputPreview =
    request.toolName === 'Bash' && typeof request.input.command === 'string'
      ? String(request.input.command)
      : JSON.stringify(request.input, null, 2)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className={`bg-panel border border-border rounded-lg shadow-2xl flex flex-col ${
          isEdit ? 'w-[88vw] max-w-[1300px]' : 'w-[640px] max-w-[90vw]'
        }`}
      >
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <span className="text-warn">⚠</span>
          <span className="text-bright font-semibold">{title}</span>
          <span className="ml-auto text-dim text-[11px]">{request.toolName}</span>
        </div>

        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {isEdit && request.diff ? (
            <DiffCard diff={request.diff} height="52vh" />
          ) : (
            <pre className="text-[12px] text-fg whitespace-pre-wrap break-all bg-panel2 border border-border rounded p-3 max-h-72 overflow-y-auto">
              {inputPreview}
            </pre>
          )}
        </div>

        {showDenyInput && (
          <div className="px-4 pb-2">
            <input
              autoFocus
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') deny()
                if (e.key === 'Escape') setShowDenyInput(false)
              }}
              placeholder="Powód odrzucenia dla Claude (opcjonalnie) — Enter aby odrzucić"
              className="w-full bg-panel2 border border-border rounded px-3 py-2 outline-none text-bright placeholder:text-dim"
            />
          </div>
        )}

        <div className="px-4 py-3 border-t border-border flex items-center gap-2">
          <button
            onClick={allow}
            className="bg-accent hover:bg-accent-soft text-bg font-bold rounded px-4 py-1.5"
          >
            ✓ Zezwól <span className="opacity-70 font-normal">(Enter)</span>
          </button>
          <button
            onClick={allowAlways}
            className="border border-border hover:border-accent text-fg rounded px-4 py-1.5"
          >
            Zawsze zezwalaj <span className="text-dim">(A)</span>
          </button>
          <button
            onClick={() => (showDenyInput ? deny() : setShowDenyInput(true))}
            className="ml-auto border border-bad/50 hover:bg-bad/20 text-bad rounded px-4 py-1.5"
          >
            ✗ Odrzuć <span className="text-dim">(Esc)</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
