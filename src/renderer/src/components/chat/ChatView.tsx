import { useEffect, useRef } from 'react'
import type { TabState } from '@/lib/chat'
import MessageItem from './MessageItem'
import PromptInput from './PromptInput'
import PermissionModal from './PermissionModal'
import HomeScreen from '../HomeScreen'
import Icon from '../Icon'
import { useSessionsStore } from '@/stores/sessions'
import { useUiStore } from '@/stores/ui'

export default function ChatView({ tab }: { tab: TabState }): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const pending = useSessionsStore((s) => s.permissionQueues[tab.id]?.[0] ?? null)

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [tab.items])

  if (!tab.cwd) return <HomeScreen tab={tab} />

  const onScroll = (): void => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  const atStart = tab.items.length === 0

  return (
    <div className="flex flex-col h-full min-w-0 relative">
      {atStart && (
        <button
          onClick={() => useUiStore.getState().set({ superpromptOpen: true })}
          className="absolute top-3 right-4 z-10 flex items-center gap-1.5 text-[12px] text-muted hover:text-accent border border-border hover:border-accent rounded-full px-3 py-1 bg-panel/70 backdrop-blur transition-colors"
          title="Wygeneruj profesjonalny prompt (superprompt)"
        >
          <Icon name="sparkles" size={14} className="text-accent" /> Superprompt
        </button>
      )}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-3">
        <div className="max-w-[900px] mx-auto">
          {tab.items.map((item) => (
            <MessageItem key={item.id} item={item} />
          ))}
          {tab.status === 'connecting' && (
            <div className="text-dim text-[12px] my-2">
              <span className="shimmer">Łączenie z Claude Code…</span>
            </div>
          )}
        </div>
      </div>
      <PromptInput tab={tab} />
      {pending && <PermissionModal tab={tab} request={pending} />}
    </div>
  )
}
