import { create } from 'zustand'
import { availableEffortLevels, supportsUltracode } from '@shared/types'
import type {
  EffortLevel,
  PermissionDecision,
  PermissionMode,
  PermissionRequestPayload,
  PromptFileRef,
  PromptImage,
  SessionEventEnvelope
} from '@shared/types'
import { createTab, nextId, reduceSdkMessage, type ChatItem, type TabState } from '@/lib/chat'
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
  sendPrompt: (
    tabId: string,
    text: string,
    images?: PromptImage[],
    files?: PromptFileRef[]
  ) => Promise<void>
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

/** Extract a human prompt from a transcript "user" message; undefined for tool-result msgs. */
function extractUserText(message: Record<string, unknown>): string | undefined {
  const content = message.content
  if (typeof content === 'string') return content.trim() ? content : undefined
  if (Array.isArray(content)) {
    if (content.some((b) => (b as { type?: string })?.type === 'tool_result')) return undefined
    const text = content
      .filter((b) => (b as { type?: string })?.type === 'text')
      .map((b) => (b as { text?: string }).text ?? '')
      .join('')
      .trim()
    return text || undefined
  }
  return undefined
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
            ? [{ kind: 'info', id: nextId(), text: `Loading session history ${resume.slice(0, 8)}…`, tone: 'normal' }]
            : []
        }))
      }))

      // Rebuild the prior conversation from the on-disk transcript so old messages
      // are visible (resume alone only reloads context, not the UI).
      if (resume) {
        try {
          const lines = await window.api.historyTranscript(cwd, resume)
          let scratch = createTab(tabId, tab.model, tab.permissionMode, tab.effort)
          for (const line of lines) {
            // Human prompts (type "user" with text, not tool_result) aren't emitted as
            // items by the reducer — in the live flow the store adds them on send. Add
            // them here so the rebuilt transcript shows the user's own messages.
            const humanText = line.type === 'user' ? extractUserText(line.message) : undefined
            if (humanText !== undefined) {
              scratch = { ...scratch, items: [...scratch.items, { kind: 'user', id: nextId(), text: humanText }] }
            } else {
              scratch = reduceSdkMessage(scratch, line as unknown as Record<string, unknown>)
            }
          }
          const items: ChatItem[] = [
            ...(lines.length >= 800
              ? [{ kind: 'info' as const, id: nextId(), text: 'Showing the most recent messages of this session.', tone: 'normal' as const }]
              : []),
            ...scratch.items,
            { kind: 'info' as const, id: nextId(), text: '— resumed; continue below —', tone: 'normal' as const }
          ]
          set((st) => ({
            tabs: patchTab(st.tabs, tabId, (t) => ({ ...t, items, contextTokens: scratch.contextTokens }))
          }))
        } catch {
          // non-fatal — resume without the rendered history
        }
      }

      await window.api.createSession(tabId, {
        cwd,
        model: tab.model,
        permissionMode: tab.permissionMode,
        effort: tab.effort,
        resume
      })
      await window.api.gitSubscribe(tabId, cwd)
      void useSettingsStore.getState().update({ lastCwd: cwd })
      // The Agent SDK connects lazily (it emits `init` only on the first message),
      // so don't sit in a perpetual "connecting" state — the app is ready for input.
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => (t.status === 'connecting' ? { ...t, status: 'idle' } : t))
      }))
    },

    sendPrompt: async (tabId, raw, images, files) => {
      const text = raw.trim()
      const imgs = images ?? []
      const fls = files ?? []
      const hasAttach = imgs.length > 0 || fls.length > 0
      if (!text && !hasAttach) return
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || !tab.cwd) return

      // local slash commands (only when it's a bare text command, no attachments)
      if (!hasAttach && text === '/clear') {
        await get().clearChat(tabId)
        return
      }
      if (!hasAttach && text.startsWith('/model')) {
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
                  text: ok ? `Model changed to ${model}` : `Failed to change model to ${model}`,
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
          items: [
            ...t.items,
            {
              kind: 'user',
              id: nextId(),
              text,
              images: imgs.length ? imgs : undefined,
              files: fls.length ? fls : undefined
            }
          ]
        }))
      }))
      await window.api.sendMessage(
        tabId,
        text,
        imgs.length ? imgs : undefined,
        fls.length ? fls : undefined
      )
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

    // These update state synchronously (optimistic) BEFORE the async SDK call.
    // Doing the await first let the controlled slider fight the user and read a
    // stale guard, spamming the chat with duplicate change lines.
    setModel: (tabId, model) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || tab.model === model) return Promise.resolve()
      const dropUltra = !supportsUltracode(model)
      // Clamp effort to what the new model accepts (e.g. xhigh/max → high on a
      // model that rejects them) so we never send an unsupported effort level.
      const levels = availableEffortLevels(model)
      const effort = levels.some((l) => l.id === tab.effort)
        ? tab.effort
        : levels[levels.length - 1].id
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          model,
          effort,
          ultracode: dropUltra ? false : t.ultracode
        }))
      }))
      if (tab.sdkSessionId) {
        void window.api.setModel(tabId, model)
        if (effort !== tab.effort) void window.api.setEffort(tabId, effort)
        if (dropUltra && tab.ultracode) void window.api.setUltracode(tabId, false)
      }
      return Promise.resolve()
    },

    setEffort: (tabId, effort) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || tab.effort === effort) return Promise.resolve()
      const dropUltra = effort !== 'xhigh'
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          effort,
          ultracode: dropUltra ? false : t.ultracode
        }))
      }))
      if (tab.sdkSessionId) {
        void window.api.setEffort(tabId, effort)
        if (dropUltra && tab.ultracode) void window.api.setUltracode(tabId, false)
      }
      return Promise.resolve()
    },

    setUltracode: (tabId, enabled) => {
      const tab = get().tabs.find((t) => t.id === tabId)
      if (!tab || tab.ultracode === enabled) return Promise.resolve()
      if (enabled && !supportsUltracode(tab.model)) return Promise.resolve()
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => ({
          ...t,
          ultracode: enabled,
          effort: enabled ? 'xhigh' : t.effort // ultracode implies xhigh
        }))
      }))
      if (tab.sdkSessionId) void window.api.setUltracode(tabId, enabled)
      return Promise.resolve()
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
          sessionTokens: 0,
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
      set((st) => ({
        tabs: patchTab(st.tabs, tabId, (t) => (t.status === 'connecting' ? { ...t, status: 'idle' } : t))
      }))
    }
  }
})

export function useActiveTab(): TabState | undefined {
  return useSessionsStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
}
