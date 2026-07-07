import { randomUUID } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import {
  query,
  type Options,
  type PermissionResult,
  type PermissionUpdate,
  type SDKUserMessage
} from '@anthropic-ai/claude-agent-sdk'
import type { BrowserWindow } from 'electron'
import type {
  CreateSessionOptions,
  EffortLevel,
  FileDiffPayload,
  PermissionMode,
  PermissionRequestPayload,
  PlanUsage
} from '@shared/types'
import { PermissionBroker } from './permissions'
import type { SettingsService } from '../settings'
import type { CostService } from '../costs'

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit'])

/**
 * Scope key for "Allow always". Deliberately narrow so one approval can never
 * green-light a broader class of actions than the user actually saw:
 *  - Bash: the exact command string — approving `npm test` will NOT auto-approve
 *    `npm publish` (they hash to different keys); a re-prompt happens for anything
 *    that isn't byte-for-byte identical.
 *  - Edit/Write/MultiEdit: scoped to the specific target file — approving a write
 *    to one file does not authorize writes anywhere else.
 *  - Everything else: the tool name (these tools carry their own narrow surface).
 */
function permissionKey(toolName: string, input: Record<string, unknown>): string {
  if (toolName === 'Bash' && typeof input.command === 'string') {
    return `Bash:${input.command.trim()}`
  }
  if (EDIT_TOOLS.has(toolName) && typeof input.file_path === 'string') {
    return `${toolName}:${input.file_path}`
  }
  return toolName
}

/** Precompute old/new file contents so the renderer can show a Monaco diff. */
function computeDiff(toolName: string, input: Record<string, unknown>): FileDiffPayload | undefined {
  try {
    const filePath = typeof input.file_path === 'string' ? input.file_path : undefined
    if (!filePath) return undefined
    const oldContent = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
    if (toolName === 'Write' && typeof input.content === 'string') {
      return { filePath, oldContent, newContent: input.content }
    }
    if (toolName === 'Edit' && typeof input.old_string === 'string' && typeof input.new_string === 'string') {
      const newContent = input.replace_all
        ? oldContent.split(input.old_string).join(input.new_string)
        : oldContent.replace(input.old_string, input.new_string)
      return { filePath, oldContent, newContent }
    }
    if (toolName === 'MultiEdit' && Array.isArray(input.edits)) {
      let newContent = oldContent
      for (const e of input.edits as { old_string?: string; new_string?: string; replace_all?: boolean }[]) {
        if (typeof e.old_string !== 'string' || typeof e.new_string !== 'string') continue
        newContent = e.replace_all
          ? newContent.split(e.old_string).join(e.new_string)
          : newContent.replace(e.old_string, e.new_string)
      }
      return { filePath, oldContent, newContent }
    }
  } catch (err) {
    console.error('[diff] failed to compute diff:', err)
  }
  return undefined
}

class AgentSession {
  private pendingInput: SDKUserMessage[] = []
  private wake: (() => void) | null = null
  private closed = false
  private q: ReturnType<typeof query> | null = null
  private alwaysAllow = new Set<string>()
  permissionMode: PermissionMode

  constructor(
    readonly tabId: string,
    readonly opts: CreateSessionOptions,
    private win: BrowserWindow,
    private broker: PermissionBroker,
    private settings: SettingsService,
    private costs: CostService,
    private onClosed: (tabId: string) => void
  ) {
    this.permissionMode = opts.permissionMode
  }

  private send(channel: string, payload: unknown): void {
    if (!this.win.isDestroyed()) this.win.webContents.send(channel, payload)
  }

  start(): void {
    const self = this
    async function* input(): AsyncGenerator<SDKUserMessage> {
      while (!self.closed) {
        while (self.pendingInput.length > 0) yield self.pendingInput.shift() as SDKUserMessage
        await new Promise<void>((resolve) => {
          self.wake = resolve
        })
      }
    }

    const options: Options = {
      cwd: this.opts.cwd,
      model: this.opts.model,
      permissionMode: this.permissionMode,
      effort: this.opts.effort,
      includePartialMessages: true,
      resume: this.opts.resume,
      env: this.settings.agentEnv(),
      settingSources: ['user', 'project', 'local'],
      canUseTool: (toolName, toolInput, extra) => this.onCanUseTool(toolName, toolInput, extra),
      stderr: (data: string) => console.error(`[agent ${this.tabId}]`, data)
    }

    this.q = query({ prompt: input(), options })
    void this.pump()
  }

  private async pump(): Promise<void> {
    try {
      for await (const message of this.q as AsyncIterable<Record<string, unknown>>) {
        this.send('session:event', { tabId: this.tabId, message })
        if (message.type === 'result') {
          this.costs.record(this.opts.cwd, message)
        }
      }
    } catch (err) {
      if (!this.closed) {
        this.send('session:event', {
          tabId: this.tabId,
          message: { type: 'app_error', error: String(err) }
        })
      }
    } finally {
      this.closed = true
      this.send('session:event', { tabId: this.tabId, message: { type: 'app_closed' } })
      this.onClosed(this.tabId)
    }
  }

  private async onCanUseTool(
    toolName: string,
    input: Record<string, unknown>,
    extra: { signal: AbortSignal; suggestions?: unknown[]; title?: string; displayName?: string }
  ): Promise<PermissionResult> {
    if (this.permissionMode === 'bypassPermissions') {
      return { behavior: 'allow', updatedInput: input }
    }
    const key = permissionKey(toolName, input)
    if (this.alwaysAllow.has(key)) {
      return { behavior: 'allow', updatedInput: input }
    }

    const requestId = randomUUID()
    const payload: PermissionRequestPayload = {
      requestId,
      tabId: this.tabId,
      toolName,
      input,
      title: extra.title,
      displayName: extra.displayName,
      diff: EDIT_TOOLS.has(toolName) ? computeDiff(toolName, input) : undefined
    }
    this.send('permission:request', payload)

    const decision = await this.broker.wait(requestId, extra.signal)
    this.send('permission:resolved', { requestId, tabId: this.tabId, decision })

    if (decision.kind === 'deny') {
      return {
        behavior: 'deny',
        message: decision.message?.trim() || 'User denied this operation.'
      }
    }
    if (decision.kind === 'allowAlways') {
      this.alwaysAllow.add(key)
      const suggestions = extra.suggestions
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        return {
          behavior: 'allow',
          updatedInput: input,
          updatedPermissions: suggestions as PermissionUpdate[]
        }
      }
    }
    return { behavior: 'allow', updatedInput: input }
  }

  sendUserMessage(text: string): void {
    this.pendingInput.push({
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
      session_id: ''
    } as unknown as SDKUserMessage)
    this.wake?.()
    this.wake = null
  }

  async interrupt(): Promise<void> {
    try {
      await this.q?.interrupt()
    } catch (err) {
      console.error('[agent] interrupt failed:', err)
    }
  }

  async setPermissionMode(mode: PermissionMode): Promise<void> {
    this.permissionMode = mode
    try {
      await this.q?.setPermissionMode(mode)
    } catch (err) {
      // Older SDKs may not support live mode change — local mode still affects canUseTool.
      console.error('[agent] setPermissionMode failed:', err)
    }
  }

  async setModel(model: string): Promise<boolean> {
    try {
      await this.q?.setModel(model)
      return true
    } catch (err) {
      console.error('[agent] setModel failed:', err)
      return false
    }
  }

  async setEffort(effort: EffortLevel): Promise<boolean> {
    try {
      // Live effort change via the flag-settings layer (Settings.effortLevel).
      await this.q?.applyFlagSettings({ effortLevel: effort as 'low' | 'medium' | 'high' | 'xhigh' })
      return true
    } catch (err) {
      console.error('[agent] setEffort failed:', err)
      return false
    }
  }

  /** Ultracode = xhigh effort + standing dynamic-workflow orchestration (session-scoped). */
  async setUltracode(enabled: boolean): Promise<boolean> {
    try {
      await this.q?.applyFlagSettings({ ultracode: enabled })
      return true
    } catch (err) {
      console.error('[agent] setUltracode failed:', err)
      return false
    }
  }

  /** Real plan usage (5h / 7-day utilization) — same data as Claude Code's /usage. */
  async getPlanUsage(): Promise<PlanUsage> {
    try {
      const q = this.q as unknown as {
        usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET?: () => Promise<{
          session?: { total_cost_usd?: number }
          subscription_type?: string | null
          rate_limits_available?: boolean
          rate_limits?: {
            five_hour?: { utilization: number | null; resets_at: string | null } | null
            seven_day?: { utilization: number | null; resets_at: string | null } | null
          } | null
        }>
      }
      const fn = q?.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET
      if (!fn) return { available: false, subscriptionType: null }
      const r = await fn.call(q)
      const map = (
        w?: { utilization: number | null; resets_at: string | null } | null
      ): { utilization: number | null; resetsAt: string | null } | null =>
        w ? { utilization: w.utilization, resetsAt: w.resets_at } : null
      return {
        available: r.rate_limits_available === true,
        subscriptionType: r.subscription_type ?? null,
        sessionCostUsd: r.session?.total_cost_usd,
        fiveHour: map(r.rate_limits?.five_hour),
        sevenDay: map(r.rate_limits?.seven_day)
      }
    } catch (err) {
      console.error('[agent] getPlanUsage failed:', err)
      return { available: false, subscriptionType: null }
    }
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.wake?.()
    this.wake = null
    void this.q?.interrupt().catch(() => {})
  }
}

export class SessionManager {
  private sessions = new Map<string, AgentSession>()

  constructor(
    private broker: PermissionBroker,
    private settings: SettingsService,
    private costs: CostService
  ) {}

  create(win: BrowserWindow, tabId: string, opts: CreateSessionOptions): void {
    this.sessions.get(tabId)?.close()
    const session = new AgentSession(tabId, opts, win, this.broker, this.settings, this.costs, (id) =>
      this.sessions.delete(id)
    )
    this.sessions.set(tabId, session)
    session.start()
  }

  send(tabId: string, text: string): void {
    this.sessions.get(tabId)?.sendUserMessage(text)
  }

  async interrupt(tabId: string): Promise<void> {
    await this.sessions.get(tabId)?.interrupt()
  }

  async setPermissionMode(tabId: string, mode: PermissionMode): Promise<void> {
    await this.sessions.get(tabId)?.setPermissionMode(mode)
  }

  async setModel(tabId: string, model: string): Promise<boolean> {
    return (await this.sessions.get(tabId)?.setModel(model)) ?? false
  }

  async setEffort(tabId: string, effort: EffortLevel): Promise<boolean> {
    return (await this.sessions.get(tabId)?.setEffort(effort)) ?? false
  }

  async setUltracode(tabId: string, enabled: boolean): Promise<boolean> {
    return (await this.sessions.get(tabId)?.setUltracode(enabled)) ?? false
  }

  async getPlanUsage(tabId: string): Promise<PlanUsage> {
    const session = this.sessions.get(tabId)
    if (!session) return { available: false, subscriptionType: null }
    return session.getPlanUsage()
  }

  close(tabId: string): void {
    this.sessions.get(tabId)?.close()
    this.sessions.delete(tabId)
  }

  closeAll(): void {
    for (const [, s] of this.sessions) s.close()
    this.sessions.clear()
    this.broker.denyAll()
  }
}
