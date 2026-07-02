import { memo } from 'react'
import type { ChatItem } from '@/lib/chat'
import Markdown from './Markdown'
import ThinkingBlock from './ThinkingBlock'
import ToolCallCard from './ToolCallCard'

function MessageItemInner({ item }: { item: ChatItem }): React.JSX.Element | null {
  switch (item.kind) {
    case 'user':
      return (
        <div className="flex gap-2 my-2">
          <span className="text-accent select-none font-bold">&gt;</span>
          <div className="whitespace-pre-wrap text-bright">{item.text}</div>
        </div>
      )
    case 'text':
      return (
        <div className="my-1.5">
          <Markdown text={item.text} />
          {item.streaming && <span className="caret" />}
        </div>
      )
    case 'thinking':
      return (
        <ThinkingBlock
          text={item.text}
          streaming={item.streaming}
          startedAt={item.startedAt}
          durationMs={item.durationMs}
        />
      )
    case 'tool':
      return <ToolCallCard item={item} />
    case 'result':
      return (
        <div className="my-1 text-[11.5px] text-dim flex items-center gap-2">
          <span className={item.ok ? 'text-good' : 'text-bad'}>{item.ok ? '✔' : '✖'}</span>
          <span>
            {item.ok ? 'Zakończono' : 'Zakończono z błędem'}
            {item.durationMs !== undefined ? ` · ${(item.durationMs / 1000).toFixed(1)}s` : ''}
            {item.costUsd !== undefined ? ` · $${item.costUsd.toFixed(4)}` : ''}
          </span>
        </div>
      )
    case 'info':
      return (
        <div className={`my-1 text-[11.5px] ${item.tone === 'error' ? 'text-bad' : 'text-dim'}`}>
          {item.text}
        </div>
      )
    default:
      return null
  }
}

export default memo(MessageItemInner)
