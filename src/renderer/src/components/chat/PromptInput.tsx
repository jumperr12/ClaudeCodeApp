import { useEffect, useRef, useState } from 'react'
import { PERMISSION_MODES, modelLabel } from '@shared/types'
import { useSessionsStore } from '@/stores/sessions'
import { useUiStore } from '@/stores/ui'
import Icon from '../Icon'
import type { TabState } from '@/lib/chat'

export default function PromptInput({ tab }: { tab: TabState }): React.JSX.Element {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const sendPrompt = useSessionsStore((s) => s.sendPrompt)
  const interrupt = useSessionsStore((s) => s.interrupt)
  const cycleMode = useSessionsStore((s) => s.cyclePermissionMode)
  const draftInsert = useUiStore((s) => s.draftInsert)
  const consumeDraft = useUiStore((s) => s.consumeDraft)

  // superprompt widget inserts its output here
  useEffect(() => {
    if (draftInsert !== null) {
      const d = consumeDraft()
      if (d !== null) {
        setValue(d)
        ref.current?.focus()
      }
    }
  }, [draftInsert, consumeDraft])

  // auto-resize
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 220) + 'px'
  }, [value])

  const submit = (): void => {
    const text = value
    if (!text.trim()) return
    setValue('')
    void sendPrompt(tab.id, text)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      void interrupt(tab.id)
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      void cycleMode(tab.id)
    }
  }

  const modeLabel = PERMISSION_MODES.find((m) => m.id === tab.permissionMode)?.label ?? tab.permissionMode
  const working = tab.status === 'working' || tab.status === 'connecting'

  return (
    <div className="border-t border-border bg-panel px-4 py-2">
      <div className="flex items-start gap-2">
        <span className="text-accent font-bold pt-1.5 select-none">&gt;</span>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          spellCheck={false}
          placeholder={working ? 'Claude is working… (Esc to interrupt)' : 'Message Claude… (/clear, /model)'}
          className="flex-1 bg-transparent resize-none outline-none text-bright placeholder:text-dim pt-1.5 leading-relaxed"
        />
      </div>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-dim">
        <button
          className="hover:text-fg flex items-center gap-1"
          title="Shift+Tab — change permission mode"
          onClick={() => void cycleMode(tab.id)}
        >
          <Icon name="chevrons" size={12} /> {modeLabel}
        </button>
        <span>{modelLabel(tab.model)}</span>
        <span className="ml-auto">
          Enter to send · Shift+Enter newline · Esc interrupt · Shift+Tab mode
        </span>
      </div>
    </div>
  )
}
