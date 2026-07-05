import { useEffect, useState } from 'react'
import TitleBar from './components/TitleBar'
import LiquidSparkIntro from './components/LiquidSparkIntro'
import StatusBar from './components/StatusBar'
import ChatView from './components/chat/ChatView'
import GitHubPanel from './components/github/GitHubPanel'
import SuperpromptModal from './components/superprompt/SuperpromptModal'
import HistoryModal from './components/history/HistoryModal'
import CostDashboard from './components/dashboard/CostDashboard'
import SettingsModal from './components/settings/SettingsModal'
import Modal from './components/Modal'
import DiffCard from './components/diff/DiffCard'
import { useSessionsStore, useActiveTab } from './stores/sessions'
import { useSettingsStore } from './stores/settings'
import { useGitStore } from './stores/git'
import { useSuperpromptStore } from './stores/superprompt'
import { useUiStore } from './stores/ui'

export default function App(): React.JSX.Element {
  const activeTab = useActiveTab()
  const ui = useUiStore()
  const [intro, setIntro] = useState(true)

  // wire IPC listeners once
  useEffect(() => {
    void useSettingsStore.getState().load()
    const s = useSessionsStore.getState()
    const unsubs = [
      window.api.onSessionEvent((env) => useSessionsStore.getState().handleSessionEvent(env)),
      window.api.onPermissionRequest((p) => useSessionsStore.getState().handlePermissionRequest(p)),
      window.api.onPermissionResolved((p) => useSessionsStore.getState().handlePermissionResolved(p)),
      window.api.onGitStatus(({ tabId, status }) => useGitStore.getState().setStatus(tabId, status)),
      window.api.onSuperpromptChunk((c) => useSuperpromptStore.getState().handleChunk(c))
    ]
    void s // initial store touch
    return () => unsubs.forEach((u) => u())
  }, [])

  // apply default model/permission mode from settings to the very first tab
  const settings = useSettingsStore((st) => st.settings)
  useEffect(() => {
    if (!settings) return
    const st = useSessionsStore.getState()
    const first = st.tabs[0]
    if (st.tabs.length === 1 && first && !first.cwd) {
      useSessionsStore.setState({
        tabs: [
          {
            ...first,
            model: settings.model,
            permissionMode: settings.defaultPermissionMode,
            effort: settings.defaultEffort
          }
        ]
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.model, settings?.defaultPermissionMode, settings?.defaultEffort])

  if (!activeTab) return <div className="h-full" />

  return (
    <div className="h-full flex flex-col bg-bg">
      {intro && <LiquidSparkIntro onDone={() => setIntro(false)} />}
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0">
          <ChatView tab={activeTab} />
        </div>
        {ui.gitPanelOpen && <GitHubPanel tab={activeTab} />}
      </div>
      <StatusBar tab={activeTab} />

      {ui.superpromptOpen && <SuperpromptModal />}
      {ui.historyOpen && <HistoryModal />}
      {ui.dashboardOpen && <CostDashboard />}
      {ui.settingsOpen && <SettingsModal />}
      {ui.fileDiff && (
        <Modal
          title={`Diff: ${ui.fileDiff.filePath} (robocze vs HEAD)`}
          onClose={() => ui.set({ fileDiff: null })}
          width="88vw"
        >
          <DiffCard diff={ui.fileDiff} height="62vh" />
        </Modal>
      )}
    </div>
  )
}
