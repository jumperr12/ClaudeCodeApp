import { motion } from 'framer-motion'
import Icon from '../Icon'
import { useSessionsStore } from '@/stores/sessions'

export default function SessionTabs(): React.JSX.Element {
  const tabs = useSessionsStore((s) => s.tabs)
  const activeTabId = useSessionsStore((s) => s.activeTabId)
  const setActive = useSessionsStore((s) => s.setActive)
  const addTab = useSessionsStore((s) => s.addTab)
  const closeTab = useSessionsStore((s) => s.closeTab)

  return (
    <div className="flex items-center gap-1 no-drag overflow-x-auto max-w-[55vw]">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`group flex items-center gap-1.5 px-3 py-1 rounded-t cursor-pointer text-[12px] whitespace-nowrap border-b-2 ${
              active
                ? 'bg-panel text-bright border-accent'
                : 'text-muted hover:text-fg border-transparent hover:bg-panel/60'
            }`}
          >
            {tab.status === 'working' || tab.status === 'connecting' ? (
              <motion.span
                className="text-accent inline-flex"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Icon name="dot" size={8} />
              </motion.span>
            ) : (
              <span className="text-dim inline-flex">
                <Icon name="dot" size={8} />
              </span>
            )}
            <span className="max-w-[140px] truncate">{tab.title}</span>
            <button
              className="opacity-0 group-hover:opacity-100 text-dim hover:text-bad inline-flex"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              title="Zamknij sesję"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        )
      })}
      <button
        className="text-muted hover:text-accent px-2 text-[15px]"
        onClick={() => addTab()}
        title="Nowa sesja"
      >
        +
      </button>
    </div>
  )
}
