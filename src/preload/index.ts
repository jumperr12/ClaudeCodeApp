import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { RendererApi } from '@shared/api'
import type {
  AppSettings,
  CostRecord,
  CreateSessionOptions,
  FileDiffPayload,
  GitStatusPayload,
  HistoryEntry,
  PermissionDecision,
  PermissionMode,
  PermissionRequestPayload,
  PlanUsage,
  SessionEventEnvelope,
  SuperpromptChunk,
  SuperpromptRequest,
  UsageWindow
} from '@shared/types'

function subscribe<T>(channel: string) {
  return (cb: (payload: T) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: T): void => cb(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

const api: RendererApi = {
  // sessions
  createSession: (tabId: string, opts: CreateSessionOptions): Promise<void> =>
    ipcRenderer.invoke('session:create', tabId, opts),
  sendMessage: (tabId: string, text: string): Promise<void> =>
    ipcRenderer.invoke('session:send', tabId, text),
  interrupt: (tabId: string): Promise<void> => ipcRenderer.invoke('session:interrupt', tabId),
  closeSession: (tabId: string): Promise<void> => ipcRenderer.invoke('session:close', tabId),
  setPermissionMode: (tabId: string, mode: PermissionMode): Promise<void> =>
    ipcRenderer.invoke('session:setPermissionMode', tabId, mode),
  setModel: (tabId: string, model: string): Promise<boolean> =>
    ipcRenderer.invoke('session:setModel', tabId, model),
  planUsage: (tabId: string): Promise<PlanUsage> => ipcRenderer.invoke('session:planUsage', tabId),
  onSessionEvent: subscribe<SessionEventEnvelope>('session:event'),

  // permissions
  onPermissionRequest: subscribe<PermissionRequestPayload>('permission:request'),
  onPermissionResolved:
    subscribe<{ requestId: string; tabId: string; decision: PermissionDecision }>('permission:resolved'),
  respondPermission: (requestId: string, decision: PermissionDecision): Promise<void> =>
    ipcRenderer.invoke('permission:respond', requestId, decision),

  // git
  gitSubscribe: (tabId: string, cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:subscribe', tabId, cwd),
  gitUnsubscribe: (tabId: string): Promise<void> => ipcRenderer.invoke('git:unsubscribe', tabId),
  gitRefresh: (tabId: string): Promise<void> => ipcRenderer.invoke('git:refresh', tabId),
  gitFileDiff: (cwd: string, filePath: string): Promise<FileDiffPayload> =>
    ipcRenderer.invoke('git:fileDiff', cwd, filePath),
  onGitStatus: subscribe<{ tabId: string; status: GitStatusPayload }>('git:status'),

  // superprompt
  superpromptGenerate: (req: SuperpromptRequest): Promise<void> =>
    ipcRenderer.invoke('superprompt:generate', req),
  superpromptCancel: (requestId: string): Promise<void> =>
    ipcRenderer.invoke('superprompt:cancel', requestId),
  onSuperpromptChunk: subscribe<SuperpromptChunk>('superprompt:chunk'),

  // history
  historyList: (cwd: string): Promise<HistoryEntry[]> => ipcRenderer.invoke('history:list', cwd),
  historySearch: (cwd: string, q: string): Promise<HistoryEntry[]> =>
    ipcRenderer.invoke('history:search', cwd, q),

  // settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:update', partial),
  setApiKey: (key: string | null): Promise<void> => ipcRenderer.invoke('settings:setApiKey', key),

  // costs
  costList: (): Promise<CostRecord[]> => ipcRenderer.invoke('costs:list'),
  usageWindow: (hours: number): Promise<UsageWindow> => ipcRenderer.invoke('costs:usageWindow', hours),

  // misc
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickFolder'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url)
}

contextBridge.exposeInMainWorld('api', api)
