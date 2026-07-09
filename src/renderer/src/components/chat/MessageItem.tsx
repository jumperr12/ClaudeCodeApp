import { memo } from 'react'
import type { ChatItem } from '@/lib/chat'
import { fmtTokens } from '@/lib/chat'
import Markdown from './Markdown'
import ThinkingBlock from './ThinkingBlock'
import ToolCallCard from './ToolCallCard'
import Icon from '../Icon'
import { useTypewriter } from '@/lib/useTypewriter'

function StreamingText({ text, streaming }: { text: string; streaming: boolean }): React.JSX.Element {
  const shown = useTypewriter(text, streaming)
  return (
    <div className="my-1.5">
      <Markdown text={shown} />
      {streaming && <span className="caret" />}
    </div>
  )
}

function MessageItemInner({ item }: { item: ChatItem }): React.JSX.Element | null {
  switch (item.kind) {
    case 'user':
      return (
        <div className="flex gap-2 my-2">
          <span className="text-accent select-none font-bold">&gt;</span>
          <div className="min-w-0">
            {item.images && item.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1.5">
                {item.images.map((img, i) => (
                  <img
                    key={i}
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt={img.name ?? 'attachment'}
                    className="h-24 w-auto max-w-[240px] rounded-md border border-border object-cover"
                  />
                ))}
              </div>
            )}
            {item.text && <div className="whitespace-pre-wrap text-bright">{item.text}</div>}
          </div>
        </div>
      )
    case 'text':
      return <StreamingText text={item.text} streaming={item.streaming} />
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
          <Icon name={item.ok ? 'check' : 'x'} size={13} className={item.ok ? 'text-good' : 'text-bad'} />
          <span>
            {item.ok ? 'Done' : 'Finished with error'}
            {item.durationMs !== undefined ? ` · ${(item.durationMs / 1000).toFixed(1)}s` : ''}
            {item.tokens ? ` · ${fmtTokens(item.tokens)} tok` : ''}
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
