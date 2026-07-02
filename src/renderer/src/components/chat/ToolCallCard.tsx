import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ChatItem } from '@/lib/chat'

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
      return 'aktualizacja listy zadań'
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

  const dotColor = !item.done
    ? 'text-accent'
    : item.isError
      ? 'text-bad'
      : 'text-good'

  const result = item.result ?? ''
  const truncated = !showFullResult && result.length > MAX_RESULT_CHARS

  return (
    <div className="my-0.5">
      <button
        className="flex items-baseline gap-1.5 text-left w-full hover:bg-panel rounded px-1 -mx-1"
        onClick={() => setExpanded((e) => !e)}
      >
        {!item.done ? (
          <motion.span
            className={dotColor}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ repeat: Infinity, duration: 1.1 }}
          >
            ⏺
          </motion.span>
        ) : (
          <span className={dotColor}>⏺</span>
        )}
        <span className="text-bright font-semibold">{item.name}</span>
        <span className="text-muted truncate">({summarize(item.name, item.input)})</span>
        {item.done && item.isError && <span className="text-bad text-[11px]">błąd</span>}
      </button>

      {expanded && (
        <div className="ml-4 mt-1 mb-1 border-l-2 border-border pl-3 space-y-1.5">
          {item.input && (
            <pre className="text-[11.5px] text-muted whitespace-pre-wrap break-all max-h-48 overflow-y-auto bg-panel rounded p-2">
              {item.name === 'Bash' && typeof item.input.command === 'string'
                ? item.input.command
                : JSON.stringify(item.input, null, 2)}
            </pre>
          )}
          {item.done && result && (
            <pre
              className={`text-[11.5px] whitespace-pre-wrap break-all max-h-80 overflow-y-auto bg-panel rounded p-2 ${
                item.isError ? 'text-bad' : 'text-fg'
              }`}
            >
              {truncated ? result.slice(0, MAX_RESULT_CHARS) : result}
            </pre>
          )}
          {truncated && (
            <button className="text-accent text-[11px] hover:underline" onClick={() => setShowFullResult(true)}>
              pokaż całość ({Math.round(result.length / 1000)}k znaków)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
