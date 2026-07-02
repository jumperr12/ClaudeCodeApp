import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Spark } from '../Icon'

const STATUS_WORDS = [
  'Myślę',
  'Analizuję',
  'Kombinuję',
  'Rozważam',
  'Dedukuję',
  'Główkuję',
  'Przetwarzam',
  'Rozgryzam'
]

interface Props {
  text: string
  streaming: boolean
  startedAt: number
  durationMs?: number
}

export default function ThinkingBlock({ text, streaming, startedAt, durationMs }: Props): React.JSX.Element {
  const [wordIdx, setWordIdx] = useState(() => Math.floor(Math.random() * STATUS_WORDS.length))
  const [elapsed, setElapsed] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!streaming) return
    const wordTimer = setInterval(() => setWordIdx((i) => (i + 1) % STATUS_WORDS.length), 2600)
    const clockTimer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 500)
    return () => {
      clearInterval(wordTimer)
      clearInterval(clockTimer)
    }
  }, [streaming, startedAt])

  // keep the live preview pinned to the newest thinking lines
  useEffect(() => {
    if (streaming && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [text, streaming])

  const seconds = streaming ? elapsed : Math.round((durationMs ?? 0) / 1000)
  const hasText = text.trim().length > 0

  return (
    <div className="my-1">
      <button
        className="flex items-center gap-2 text-left w-full group"
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? 'Zwiń myślenie' : 'Rozwiń myślenie'}
      >
        <motion.span
          className="text-accent inline-flex"
          animate={streaming ? { rotate: 360, scale: [1, 1.25, 1] } : { rotate: 0, scale: 1 }}
          transition={
            streaming
              ? { rotate: { repeat: Infinity, duration: 2.4, ease: 'linear' }, scale: { repeat: Infinity, duration: 1.2 } }
              : { duration: 0.3 }
          }
        >
          <Spark size={14} />
        </motion.span>
        {streaming ? (
          <span className="shimmer font-semibold">{STATUS_WORDS[wordIdx]}…</span>
        ) : (
          <span className="text-muted">Przemyślane</span>
        )}
        <span className="text-dim text-[11px]">
          {seconds > 0 ? `${seconds}s` : ''}
          {hasText ? ` · ${expanded ? 'zwiń' : 'pokaż tok myślenia'}` : ''}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {hasText && (streaming || expanded) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              ref={bodyRef}
              className={`ml-5 mt-1 border-l-2 border-border pl-3 text-muted italic whitespace-pre-wrap text-[12px] leading-relaxed ${
                streaming && !expanded ? 'max-h-28 overflow-hidden' : 'max-h-80 overflow-y-auto'
              }`}
              style={
                streaming && !expanded
                  ? { maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%)' }
                  : undefined
              }
            >
              {text}
              {streaming && <span className="caret" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
