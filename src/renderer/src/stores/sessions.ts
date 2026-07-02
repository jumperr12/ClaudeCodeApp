import { create } from 'zustand'
import { supportsUltracode } from '@shared/types'
import type {
  EffortLevel,
  PermissionDecision,
  PermissionMode,
  PermissionRequestPayload,
  SessionEventEnvelope
} from '@shared/types'
import { createTab, nextId, reduceSdkMessage, type TabState } from '@/lib/chat'
import { useSettingsStore } from './settings'

let tabCounter = 0
const newTabId = (): string => `tab${++tabCounter}-${Date.now()}`

interface SessionsState {
  tabs: TabState[]
  activeTabId: string
  /** FIFO queues of pending permission requests, per tab. */
  permissionQueues: Record<string, PermissionRequestPayload[]>

  addTab: () => string
  closeTab: (tabId: string) => void
  setActive: (tabId: string) => void
  openFolder: (tabId: string, cwd: string, resume?: string) => Promise<void>
  sendPrompt: (tabId: string, text: string) => Promise<void>
  interrupt: (tabId: string) => Promise<void>
  cyclePermissionMode: (tabId: string) => Promise<void>
  setPermissionMode: (tabId: string, mode: PermissionMode) => Promise<void>
  setModel: (tabId: string, model: string) => Promise<void>
  setEffort: (tabId: string, effort: EffortLevel) => Promise<void>
  setUltracode: (tabId: string, enabled: boolean) => Promise<void>
  respondPermission: (tabId: string, decision: PermissionDecision) => Promise<void>
  handleSessionEvent: (envelope: SessionEventEnvelope) => void
  handlePermissionRequest: (payload: PermissionRequestPayload) => void
  handlePermissionResolved: (payload: { requestId: string; tabId: string }) => void
  clearChat: (tabId: string) => Promise<void>
}

const MODE_CYCLE: PermissionMode[] = ['default', 'acceptEdits', 'plan', 'bypassPermissions']

function patchTab(tabs: TabState[], tabId: string, fn: (t: TabState) => TabState): TabState[] {
  return tabs.map((t) => (t.id === tabId ? fn(t) : t))
}

export const useSessionsStore = create<SessionsState>((set, get) => {
  const initialTab = createTab(newTabId(), 'claude-opus-4-8', 'default', 'high')
  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,
    permissionQueues: {},

    addTab: () => {
      const s = useSettingsStore.getState().settings
      const tab = createTab(
        newTabId(),
        s?.model ?? 'claude-opus-4-8',
        s?.defaultPermissionMode ?? 'default',
        s?.defaultEffort ?? 'high'
      )
      set((st) => ({ tabs: [...st.tabs, tab], activeTabId: tab.id }))
      return tab.id
    },

    closeTab: (tabId) => {
      void window.api.closeSession(tabId)
      void window.api.gitUnsubscribe(tabId)
      set((st) => {
        const tabs = st.tabs.filter((t) => t.id !== tabId)
        const queues = { ...st.permissionQueues }
        delete queues[tabId]
        let active = st.activeTabId
        if (active === tabId) active = tabs[tabs.length - 1]?.id ?? ''
        if (tabs.length === 0) {
          const s = useSettingsStore.getState().settings
          const fresh = createTab(
            newTabId(),
            s?.model ?? 'claude-opus-4-8',
            s?.defaultPermissionMode ?? 'default',
            s?.defaultEffort ?? 'high'
          )
          return { tabs: [fresh], activeTabId: fresh.id, permissionQueues: queues }
        }
        return { tabs, activeTabId: active, permissionQueues: queues }
      })
    },

    setActive: (tabId) => set({ activeTabId: tabId }),

    openFolder: async (tabId, cwd, resume) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab) return
      const title = cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          cwd,
          title,
          status: 'connecting',
          items: resume
            ? [{ kind: 'info', id: nextId(), text: `Wznawianie sesji ${resume.slice(0, 8)}…`, tone: 'normal' }]
            : []
        }))
      }))
      await window.api.createSession(tabId, {
        cwd,
        model: tab.model,
        permissionMode: tab.permissionMode,
        effort: tab.effort,
        resume
      })
      await window.api.gitSubscribe(tabId, cwd)
      void useSettingsStore.getState().update({ lastCwd: cwd })
    },

    sendPrompt: async (tabId, raw) => {
      const text = raw.trim()
      if (!text) return
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || !tab.cwd) return

      // local slash commands
      if (text === '/clear') {
        await get().clearChat(tabId)
        return
      }
      if (text.startsWith('/model')) {
        const model = text.split(/\s+/)[1]
        if (model) {
          const ok = await window.api.setModel(tabId, model)
          set((st) => ({
            tabs: patchTab(st.tabs, tabId, (t) => ({
              ...t,
              model: ok ? model : t.model,
              items: [
                ...t.items,
                {
                  kind: 'info',
                  id: nextId(),
                  text: ok ? `Model zmieniony na ${model}` : `Nie udało się zmienić modelu na ${model}`,
                  tone: ok ? 'normal' : 'error'
                }
              ]
            }))
          }))
        }
        return
      }

      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          status: 'working',
          items: [...t.items, { kind: 'user', id: nextId(), text }]
        }))
      }))
      await window.api.sendMessage(tabId, text)
    },

    interrupt: async (tabId) => {
      await window.api.interrupt(tabId)
    },

    cyclePermissionMode: async (tabId) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab) return
      const idx = MODE_CYCLE.indexOf(tab.permissionMode)
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]
      await get().setPermissionMode(tabId, next)
    },

    setPermissionMode: async (tabId, mode) => {
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({ ...t, permissionMode: mode }))
      }))
      await window.api.setPermissionMode(tabId, mode)
    },

    setModel: async (tabId, model) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || tab.model === model) return
      // If a session is already live, ask the SDK to switch; otherwise just record
      // the choice so the next createSession/openFolder uses it.
      const ok = tab.sdkSessionId ? await window.api.setModel(tabId, model) : true
      // ultracode requires an xhigh-capable model — turn it off if switching away
      if (ok && tab.ultracode && !supportsUltracode(model)) {
        if (tab.sdkSessionId) void window.api.setUltracode(tabId, false)
      }
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          model: ok ? model : t.model,
          ultracode: ok && !supportsUltracode(model) ? false : t.ultracode,
          items: ok
            ? [...t.items, { kind: 'info', id: nextId(), text: `Model: ${model}`, tone: 'normal' }]
            : [...t.items, { kind: 'info', id: nextId(), text: `Nie udało się zmienić modelu na ${model}`, tone: 'error' }]
        }))
      }))
    },

    setEffort: async (tabId, effort) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || tab.effort === effort) return
      // Live change if a session exists; otherwise it applies at next createSession.
      const ok = tab.sdkSessionId ? await window.api.setEffort(tabId, effort) : true
      // moving effort off xhigh turns ultracode off (it's an xhigh mode)
      if (ok && tab.ultracode && effort !== 'xhigh' && tab.sdkSessionId) {
        void window.api.setUltracode(tabId, false)
      }
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          effort: ok ? effort : t.effort,
          ultracode: ok && effort !== 'xhigh' ? false : t.ultracode,
          items: ok
            ? [...t.items, { kind: 'info', id: nextId(), text: `Effort: ${effort}`, tone: 'normal' }]
            : t.items
        }))
      }))
    },

    setUltracode: async (tabId, enabled) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || tab.ultracode === enabled) return
      if (enabled && !supportsUltracode(tab.model)) return
      const ok = tab.sdkSessionId ? await window.api.setUltracode(tabId, enabled) : true
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          ultracode: ok ? enabled : t.ultracode,
          // ultracode implies xhigh effort
          effort: ok && enabled ? 'xhigh' : t.effort,
          items: ok
            ? [
                ...t.items,
                {
                  kind: 'info',
                  id: nextId(),
                  text: enabled ? 'Ultracode: włączony (xhigh + workflows)' : 'Ultracode: wyłączony',
                  tone: 'normal'
                }
              ]
            : t.items
        }))
      }))
    },

    respondPermission: async (tabId, decision) => {
      const queue = get().permissionQueues[tabId] ?? []
      const current = queue[0]
      if (!current) return
      set((st) => ({
        permissionQueues: { ...st.permissionQueues, [tabId]: (st.permissionQueues[tabId] ?? []).slice(1) }
      }))
      await window.api.respondPermission(current.requestId, decision)
    },

    handleSessionEvent: (envelope) => {
      set((st) => ({
        tabs: patchTab(st.tabs, envelope.tabId, (t) => reduceSdkMessage(t, envelope.message))
      }))
      // refresh git after tools that may have touched the working tree
      const msg = envelope.message
      if (msg.type === 'user' || msg.type === 'result') {
        void window.api.gitRefresh(envelope.tabId)
      }
    },

    handlePermissionRequest: (payload) => {
      set((st) => ({
        permissionQueues: {
          ...st.permissionQueues,
          [payload.tabId]: [...(st.permissionQueues[payload.tabId] ?? []), payload]
        }
      }))
    },

    handlePermissionResolved: ({ requestId, tabId }) => {
      // covers external resolution (abort / session close) — drop from queue if still there
      set((st) => ({
        permissionQueues: {
          ...st.permissionQueues,
          [tabId]: (st.permissionQueues[tabId] ?? []).filter((p) => p.requestId !== requestId)
        }
      }))
    },

    clearChat: async (tabId) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || !tab.cwd) return
      await window.api.closeSession(tabId)
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          items: [],
          costUsd: 0,
          contextTokens: 0,
          sdkSessionId: undefined,
          status: 'connecting'
        }))
      }))
      await window.api.createSession(tabId, {
        cwd: tab.cwd,
        model: tab.model,
        permissionMode: tab.permissionMode,
        effort: tab.effort
      })
    }
  }
})

export function useActiveTab(): TabState | undefined {
  return useSessionsStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
}
