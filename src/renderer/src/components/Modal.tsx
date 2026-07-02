import { useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  title: string
  onClose: () => void
  width?: string
  children: React.ReactNode
}

export default function Modal({ title, onClose, width = '640px', children }: Props): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-panel border border-border rounded-lg shadow-2xl flex flex-col max-h-[85vh]"
        style={{ width, maxWidth: '92vw' }}
      >
        <div className="px-4 py-3 border-b border-border flex items-center">
          <span className="text-bright font-semibold">{title}</span>
          <button className="ml-auto text-dim hover:text-fg px-1" onClick={onClose} title="Zamknij (Esc)">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  )
}
