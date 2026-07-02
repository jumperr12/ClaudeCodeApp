import { motion } from 'framer-motion'
import { Spark } from './Icon'
import { useSessionsStore } from '@/stores/sessions'
import { useSettingsStore } from '@/stores/settings'
import type { TabState } from '@/lib/chat'

export default function WelcomeScreen({ tab }: { tab: TabState }): React.JSX.Element {
  const openFolder = useSessionsStore((s) => s.openFolder)
  const lastCwd = useSettingsStore((s) => s.settings?.lastCwd ?? null)

  const pick = async (): Promise<void> => {
    const folder = await window.api.pickFolder()
    if (folder) await openFolder(tab.id, folder)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 select-none">
      <motion.div
        className="text-accent"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
      >
        <Spark size={64} />
      </motion.div>
      <div className="text-bright text-xl font-bold">Claude Code Desktop</div>
      <div className="text-muted text-sm max-w-md text-center">
        Wybierz folder projektu, aby rozpocząć sesję. Wszystkie funkcje Claude Code — z lepszym
        widokiem kodu, panelem GitHuba i superpromptami.
      </div>
      <button
        onClick={() => void pick()}
        className="bg-accent hover:bg-accent-soft text-bg font-bold rounded px-5 py-2 transition-colors"
      >
        Otwórz folder projektu…
      </button>
      {lastCwd && (
        <button onClick={() => void openFolder(tab.id, lastCwd)} className="text-muted hover:text-fg text-[12px]">
          Ostatnio: <span className="text-accent">{lastCwd}</span>
        </button>
      )}
    </div>
  )
}
