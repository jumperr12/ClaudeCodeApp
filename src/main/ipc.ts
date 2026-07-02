import { ipcMain, dialog, shell, type BrowserWindow } from 'electron'
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

export function registerIpc(services: Services, getWindow: () => BrowserWindow | null): void {
  const { sessions, git, settings, costs, superprompt, broker } = services

  // --- sessions ---
  ipcMain.handle('session:create', (_e, tabId: string, opts: CreateSessionOptions) => {
    const win = getWindow()
    if (win) sessions.create(win, tabId, opts)
  })
  ipcMain.handle('session:send', (_e, tabId: string, text: string) => sessions.send(tabId, text))
  ipcMain.handle('session:interrupt', (_e, tabId: string) => sessions.interrupt(tabId))
  ipcMain.handle('session:close', (_e, tabId: string) => sessions.close(tabId))
  ipcMain.handle('session:setPermissionMode', (_e, tabId: string, mode: PermissionMode) =>
    sessions.setPermissionMode(tabId, mode)
  )
  ipcMain.handle('session:setModel', (_e, tabId: string, model: string) => sessions.setModel(tabId, model))
  ipcMain.handle('session:planUsage', (_e, tabId: string) => sessions.getPlanUsage(tabId))
  ipcMain.handle('session:setEffort', (_e, tabId: string, effort: EffortLevel) =>
    sessions.setEffort(tabId, effort)
  )
  ipcMain.handle('session:setUltracode', (_e, tabId: string, enabled: boolean) =>
    sessions.setUltracode(tabId, enabled)
  )

  // --- permissions ---
  ipcMain.handle('permission:respond', (_e, requestId: string, decision: PermissionDecision) =>
    broker.respond(requestId, decision)
  )

  // --- git ---
  ipcMain.handle('git:subscribe', (_e, tabId: string, cwd: string) => git.subscribe(tabId, cwd))
  ipcMain.handle('git:unsubscribe', (_e, tabId: string) => git.unsubscribe(tabId))
  ipcMain.handle('git:refresh', (_e, tabId: string) => git.refresh(tabId))
  ipcMain.handle('git:fileDiff', (_e, cwd: string, filePath: string) => git.fileDiff(cwd, filePath))

  // --- superprompt ---
  ipcMain.handle('superprompt:generate', (_e, req: SuperpromptRequest) => {
    void superprompt.generate(req)
  })
  ipcMain.handle('superprompt:cancel', (_e, requestId: string) => superprompt.cancel(requestId))

  // --- history ---
  ipcMain.handle('history:list', (_e, cwd: string) => listSessions(cwd))
  ipcMain.handle('history:search', (_e, cwd: string, q: string) => searchSessions(cwd, q))
  ipcMain.handle('history:listAll', (_e, limit?: number) => listAllSessions(limit))
  ipcMain.handle('history:transcript', (_e, cwd: string, sessionId: string) =>
    readTranscript(cwd, sessionId)
  )

  // --- settings ---
  ipcMain.handle('settings:get', () => settings.getPublic())
  ipcMain.handle('settings:update', (_e, partial: Partial<AppSettings>) => settings.update(partial))
  ipcMain.handle('settings:setApiKey', (_e, key: string | null) => settings.setApiKey(key))

  // --- costs ---
  ipcMain.handle('costs:list', () => costs.list())
  ipcMain.handle('costs:usageWindow', (_e, hours: number) => costs.usageWindow(hours))

  // --- misc ---
  ipcMain.handle('dialog:pickFolder', async () => {
    const win = getWindow()
    if (!win) return null
    const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
  })
}
