import SessionTabs from './tabs/SessionTabs'
import { useUiStore } from '@/stores/ui'

export default function TitleBar(): React.JSX.Element {
  const setUi = useUiStore((s) => s.set)
  const toggleGitPanel = useUiStore((s) => s.toggleGitPanel)
  const gitPanelOpen = useUiStore((s) => s.gitPanelOpen)

  const btn = 'no-drag text-muted hover:text-bright px-2 py-0.5 rounded hover:bg-panel2 text-[13px]'

  return (
    <div className="drag h-10 flex items-center gap-3 px-3 border-b border-border bg-bg select-none shrink-0">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-accent">✳</span>
        <span className="text-bright font-bold">Claude Code</span>
        <span className="text-dim">Desktop</span>
      </div>
      <SessionTabs />
      <div className="ml-auto flex items-center gap-1 mr-[140px]">
        <button className={btn} title="Historia sesji" onClick={() => setUi({ historyOpen: true })}>
          🕘
        </button>
        <button className={btn} title="Dashboard kosztów" onClick={() => setUi({ dashboardOpen: true })}>
          📊
        </button>
        <button
          className={`${btn} ${gitPanelOpen ? 'text-accent' : ''}`}
          title="Panel GitHub"
          onClick={toggleGitPanel}
        >

        </button>
        <button className={btn} title="Ustawienia" onClick={() => setUi({ settingsOpen: true })}>
          ⚙
        </button>
      </div>
    </div>
  )
}
