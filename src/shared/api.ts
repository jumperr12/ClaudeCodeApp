import type {
  AppSettings,
  CostRecord,
  CreateSessionOptions,
  EffortLevel,
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
} from './types'

export type Unsubscribe = () => void

/** The API exposed to the renderer on window.api (implemented in src/preload). */
export interface RendererApi {
  createSession(tabId: string, opts: CreateSessionOptions): Promise<void>
  sendMessage(tabId: string, text: string): Promise<void>
  interrupt(tabId: string): Promise<void>
  closeSession(tabId: string): Promise<void>
  setPermissionMode(tabId: string, mode: PermissionMode): Promise<void>
  setModel(tabId: string, model: string): Promise<boolean>
  planUsage(tabId: string): Promise<PlanUsage>
  setEffort(tabId: string, effort: EffortLevel): Promise<boolean>
  setUltracode(tabId: string, enabled: boolean): Promise<boolean>
  onSessionEvent(cb: (payload: SessionEventEnvelope) => void): Unsubscribe

  onPermissionRequest(cb: (payload: PermissionRequestPayload) => void): Unsubscribe
  onPermissionResolved(
    cb: (payload: { requestId: string; tabId: string; decision: PermissionDecision }) => void
  ): Unsubscribe
  respondPermission(requestId: string, decision: PermissionDecision): Promise<void>

  gitSubscribe(tabId: string, cwd: string): Promise<void>
  gitUnsubscribe(tabId: string): Promise<void>
  gitRefresh(tabId: string): Promise<void>
  gitFileDiff(cwd: string, filePath: string): Promise<FileDiffPayload>
  onGitStatus(cb: (payload: { tabId: string; status: GitStatusPayload }) => void): Unsubscribe

  superpromptGenerate(req: SuperpromptRequest): Promise<void>
  superpromptCancel(requestId: string): Promise<void>
  onSuperpromptChunk(cb: (payload: SuperpromptChunk) => void): Unsubscribe

  historyList(cwd: string): Promise<HistoryEntry[]>
  historySearch(cwd: string, q: string): Promise<HistoryEntry[]>
  historyListAll(limit?: number): Promise<HistoryEntry[]>
  historyTranscript(
    cwd: string,
    sessionId: string
  ): Promise<{ type: string; message: Record<string, unknown> }[]>

  getSettings(): Promise<AppSettings>
  updateSettings(partial: Partial<AppSettings>): Promise<AppSettings>
  setApiKey(key: string | null): Promise<void>

  costList(): Promise<CostRecord[]>
  usageWindow(hours: number): Promise<UsageWindow>

  pickFolder(): Promise<string | null>
  openExternal(url: string): Promise<void>
}
