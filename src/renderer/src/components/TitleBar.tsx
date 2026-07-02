import SessionTabs from './tabs/SessionTabs'
import Icon, { Spark } from './Icon'
import { useUiStore } from '@/stores/ui'

export default function TitleBar(): React.JSX.Element {
  const setUi = useUiStore((s) => s.set)
  const toggleGitPanel = useUiStore((s) => s.toggleGitPanel)
  const gitPanelOpen = useUiStore((s) => s.gitPanelOpen)

  const btn =
    'no-drag text-muted hover:text-bright px-2 py-1 rounded hover:bg-panel2 flex items-center justify-center'

  return (
    <div className="drag h-10 flex items-center gap-3 px-3 border-b border-border bg-bg select-none shrink-0">
      <div className="flex items-center gap-2 text-[13px]">
        <Spark size={15} className="text-accent" />
        <span className="text-bright font-bold">Claude Code</span>
        <span className="text-dim">Desktop</span>
      </div>
      <SessionTabs />
      <div className="ml-auto flex items-center gap-1 mr-[140px]">
        <button className={btn} title="Historia sesji" onClick={() => setUi({ historyOpen: true })}>
          <Icon name="history" size={16} />
        </button>
        <button className={btn} title="Dashboard kosztów" onClick={() => setUi({ dashboardOpen: true })}>
          <Icon name="chart" size={16} />
        </button>
        <button
          className={`${btn} ${gitPanelOpen ? 'text-accent' : ''}`}
          title="Panel GitHub"
          onClick={toggleGitPanel}
        >
          <Icon name="git" size={16} />
        </button>
        <button className={btn} title="Ustawienia" onClick={() => setUi({ settingsOpen: true })}>
          <Icon name="settings" size={16} />
        </button>
      </div>
    </div>
  )
}
