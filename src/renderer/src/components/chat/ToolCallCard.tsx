import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ChatItem } from '@/lib/chat'
import Icon from '../Icon'

type ToolItem = Extract<ChatItem, { kind: 'tool' }>

function summarize(name: string, input: Record<string, unknown> | null): string {
  if (!input) return '…'
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  switch (name) {
    case 'Bash':
      return str(input.command).split('\n')[0].slice(0, 90)
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return str(input.file_path).split(/[\\/]/).slice(-2).join('/')
    case 'Glob':
      return str(input.pattern)
    case 'Grep':
      return str(input.pattern).slice(0, 60)
    case 'Task':
      return str(input.description) || str(input.prompt).slice(0, 60)
    case 'WebFetch':
      return str(input.url).slice(0, 70)
    case 'WebSearch':
      return str(input.query).slice(0, 70)
    case 'TodoWrite':
      return 'todo list update'
    default: {
      const firstString = Object.values(input).find((v) => typeof v === 'string')
      return typeof firstString === 'string' ? firstString.slice(0, 60) : ''
    }
  }
}

const MAX_RESULT_CHARS = 4000

export default function ToolCallCard({ item }: { item: ToolItem }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [showFullResult, setShowFullResult] = useState(false)

  const stateColor = !item.done
    ? 'var(--color-accent)'
    : item.isError
      ? 'var(--color-bad)'
      : 'var(--color-good)'
  const dotClass = !item.done ? 'text-accent' : item.isError ? 'text-bad' : 'text-good'

  const result = item.result ?? ''
  const truncated = !showFullResult && result.length > MAX_RESULT_CHARS

  return (
    <div
      className="my-1.5 rounded-md border border-border bg-panel2/60 overflow-hidden"
      style={{ borderLeft: `3px solid ${stateColor}` }}
    >
      <button
        className="flex items-center gap-2 text-left w-full px-2.5 py-1.5 hover:bg-panel2 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {!item.done ? (
          <motion.span
            className={`${dotClass} inline-flex shrink-0`}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ repeat: Infinity, duration: 1.1 }}
          >
            <Icon name="dot" size={9} />
          </motion.span>
        ) : (
          <span className={`${dotClass} inline-flex shrink-0`}>
            <Icon name={item.isError ? 'x' : 'check'} size={12} />
          </span>
        )}
        <span className="text-bright font-semibold shrink-0">{item.name}</span>
        <span className="text-muted truncate text-[12.5px]">{summarize(item.name, item.input)}</span>
        {item.done && item.isError && (
          <span className="text-bad text-[11px] shrink-0 uppercase tracking-wide">error</span>
        )}
        <Icon
          name="chevronDown"
          size={13}
          className={`ml-auto shrink-0 text-dim transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-2.5 pb-2 pt-1 space-y-1.5 border-t border-border bg-bg/40">
          {item.input && (
            <pre className="text-[11.5px] text-fg whitespace-pre-wrap break-all max-h-48 overflow-y-auto bg-bg border border-border rounded p-2">
              {item.name === 'Bash' && typeof item.input.command === 'string'
                ? item.input.command
                : JSON.stringify(item.input, null, 2)}
            </pre>
          )}
          {item.done && result && (
            <pre
              className={`text-[11.5px] whitespace-pre-wrap break-all max-h-80 overflow-y-auto bg-bg border border-border rounded p-2 ${
                item.isError ? 'text-bad' : 'text-fg'
              }`}
            >
              {truncated ? result.slice(0, MAX_RESULT_CHARS) : result}
            </pre>
          )}
          {truncated && (
            <button className="text-accent text-[11px] hover:underline" onClick={() => setShowFullResult(true)}>
              show all ({Math.round(result.length / 1000)}k chars)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
