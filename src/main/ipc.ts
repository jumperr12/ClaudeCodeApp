import { ipcMain, dialog, shell, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import type {
  AppSettings,
  CreateSessionOptions,
  EffortLevel,
  PermissionDecision,
  PermissionMode,
  SuperpromptRequest
} from '@shared/types'
import { SessionManager } from './agent/session-manager'
import { PermissionBroker } from './agent/permissions'
import { GitService } from './git/git-service'
import { SuperpromptService } from './superprompt'
import { SettingsService } from './settings'
import { CostService } from './costs'
import { listSessions, searchSessions, listAllSessions, readTranscript } from './history'

export interface Services {
  sessions: SessionManager
  git: GitService
  settings: SettingsService
  costs: CostService
  superprompt: SuperpromptService
  broker: PermissionBroker
}

export function createServices(getWindow: () => BrowserWindow | null): Services {
  const settings = new SettingsService()
  const costs = new CostService()
  const broker = new PermissionBroker()
  const sessions = new SessionManager(broker, settings, costs)
  const git = new GitService(getWindow)
  const superprompt = new SuperpromptService(settings, getWindow)
  return { sessions, git, settings, costs, superprompt, broker }
}

/** Only accept IPC from our own app frame (dev-server origin, or file:// in prod). */
function isTrustedSender(e: IpcMainInvokeEvent): boolean {
  const url = e.senderFrame?.url ?? ''
  const dev = process.env.ELECTRON_RENDERER_URL
  if (dev && url.startsWith(new URL(dev).origin)) return true
  return url.startsWith('file://')
}

export function registerIpc(services: Services, getWindow: () => BrowserWindow | null): void {
  const { sessions, git, settings, costs, superprompt, broker } = services

  // Wrap every channel with a sender-frame check so a hijacked/embedded frame
  // can't drive the privileged main-process API.
  const handle = (
    channel: string,
    fn: (e: IpcMainInvokeEvent, ...args: never[]) => unknown
  ): void => {
    ipcMain.handle(channel, (e, ...args) => {
      if (!isTrustedSender(e)) {
        console.warn(`[ipc] blocked "${channel}" from untrusted frame: ${e.senderFrame?.url ?? '(no url)'}`)
        throw new Error(`Blocked IPC "${channel}" from an untrusted frame`)
      }
      return fn(e, ...(args as never[]))
    })
  }

  // --- sessions ---
  handle('session:create', (_e, tabId: string, opts: CreateSessionOptions) => {
    const win = getWindow()
    if (win) sessions.create(win, tabId, opts)
  })
  handle('session:send', (_e, tabId: string, text: string) => sessions.send(tabId, text))
  handle('session:interrupt', (_e, tabId: string) => sessions.interrupt(tabId))
  handle('session:close', (_e, tabId: string) => sessions.close(tabId))
  handle('session:setPermissionMode', (_e, tabId: string, mode: PermissionMode) =>
    sessions.setPermissionMode(tabId, mode)
  )
  handle('session:setModel', (_e, tabId: string, model: string) => sessions.setModel(tabId, model))
  handle('session:planUsage', (_e, tabId: string) => sessions.getPlanUsage(tabId))
  handle('session:setEffort', (_e, tabId: string, effort: EffortLevel) =>
    sessions.setEffort(tabId, effort)
  )
  handle('session:setUltracode', (_e, tabId: string, enabled: boolean) =>
    sessions.setUltracode(tabId, enabled)
  )

  // --- permissions ---
  handle('permission:respond', (_e, requestId: string, decision: PermissionDecision) =>
    broker.respond(requestId, decision)
  )

  // --- git ---
  handle('git:subscribe', (_e, tabId: string, cwd: string) => git.subscribe(tabId, cwd))
  handle('git:unsubscribe', (_e, tabId: string) => git.unsubscribe(tabId))
  handle('git:refresh', (_e, tabId: string) => git.refresh(tabId))
  handle('git:fileDiff', (_e, cwd: string, filePath: string) => git.fileDiff(cwd, filePath))

  // --- superprompt ---
  handle('superprompt:generate', (_e, req: SuperpromptRequest) => {
    void superprompt.generate(req)
  })
  handle('superprompt:cancel', (_e, requestId: string) => superprompt.cancel(requestId))

  // --- history ---
  handle('history:list', (_e, cwd: string) => listSessions(cwd))
  handle('history:search', (_e, cwd: string, q: string) => searchSessions(cwd, q))
  handle('history:listAll', (_e, limit?: number) => listAllSessions(limit))
  handle('history:transcript', (_e, cwd: string, sessionId: string) =>
    readTranscript(cwd, sessionId)
  )

  // --- settings ---
  handle('settings:get', () => settings.getPublic())
  handle('settings:update', (_e, partial: Partial<AppSettings>) => settings.update(partial))
  handle('settings:setApiKey', (_e, key: string | null) => settings.setApiKey(key))

  // --- costs ---
  handle('costs:list', () => costs.list())
  handle('costs:usageWindow', (_e, hours: number) => costs.usageWindow(hours))

  // --- misc ---
  handle('dialog:pickFolder', async () => {
    const win = getWindow()
    if (!win) return null
    const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })
  handle('shell:openExternal', (_e, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
  })
}
