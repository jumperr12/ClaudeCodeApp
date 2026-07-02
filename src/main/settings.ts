import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import {
  defaultFamilyVersions,
  familyOf,
  type AppSettings,
  type AuthMode,
  type EffortLevel,
  type ModelFamily,
  type PermissionMode
} from '@shared/types'

interface StoredSettings {
  authMode: AuthMode
  modelFamily: ModelFamily
  superpromptFamily: ModelFamily
  familyVersions: Record<ModelFamily, string>
  defaultPermissionMode: PermissionMode
  defaultEffort: EffortLevel
  lastCwd: string | null
  apiKeyEncrypted: string | null
}

const DEFAULTS: StoredSettings = {
  authMode: 'subscription',
  modelFamily: 'opus',
  superpromptFamily: 'opus',
  familyVersions: defaultFamilyVersions(),
  defaultPermissionMode: 'default',
  defaultEffort: 'high',
  lastCwd: null,
  apiKeyEncrypted: null
}

export class SettingsService {
  private data: StoredSettings
  private file: string

  constructor() {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.file = join(dir, 'settings.json')
    this.data = { ...DEFAULTS }
    try {
      if (existsSync(this.file)) {
        const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<StoredSettings> & {
          model?: string
          superpromptModel?: string
        }
        this.data = {
          ...DEFAULTS,
          ...parsed,
          // familyVersions must be a full record — merge onto defaults
          familyVersions: { ...DEFAULTS.familyVersions, ...(parsed.familyVersions ?? {}) }
        }
        // Migrate legacy concrete-id settings (pre-family schema)
        if (!parsed.modelFamily && parsed.model) {
          const fam = familyOf(parsed.model)
          if (fam) {
            this.data.modelFamily = fam
            this.data.familyVersions[fam] = parsed.model
          }
        }
        if (!parsed.superpromptFamily && parsed.superpromptModel) {
          const fam = familyOf(parsed.superpromptModel)
          if (fam) {
            this.data.superpromptFamily = fam
            this.data.familyVersions[fam] = parsed.superpromptModel
          }
        }
      }
    } catch (err) {
      console.error('[settings] failed to read settings file:', err)
    }
  }

  private resolve(family: ModelFamily): string {
    return this.data.familyVersions[family] ?? DEFAULTS.familyVersions[family]
  }

  private save(): void {
    try {
      writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8')
    } catch (err) {
      console.error('[settings] failed to write settings file:', err)
    }
  }

  getPublic(): AppSettings {
    return {
      authMode: this.data.authMode,
      hasApiKey: this.data.apiKeyEncrypted !== null,
      model: this.resolve(this.data.modelFamily),
      superpromptModel: this.resolve(this.data.superpromptFamily),
      modelFamily: this.data.modelFamily,
      superpromptFamily: this.data.superpromptFamily,
      familyVersions: { ...this.data.familyVersions },
      defaultPermissionMode: this.data.defaultPermissionMode,
      defaultEffort: this.data.defaultEffort,
      lastCwd: this.data.lastCwd
    }
  }

  update(partial: Partial<Omit<AppSettings, 'hasApiKey' | 'model' | 'superpromptModel'>>): AppSettings {
    if (partial.authMode) this.data.authMode = partial.authMode
    if (partial.modelFamily) this.data.modelFamily = partial.modelFamily
    if (partial.superpromptFamily) this.data.superpromptFamily = partial.superpromptFamily
    if (partial.familyVersions) {
      this.data.familyVersions = { ...this.data.familyVersions, ...partial.familyVersions }
    }
    if (partial.defaultPermissionMode) this.data.defaultPermissionMode = partial.defaultPermissionMode
    if (partial.defaultEffort) this.data.defaultEffort = partial.defaultEffort
    if (partial.lastCwd !== undefined) this.data.lastCwd = partial.lastCwd
    this.save()
    return this.getPublic()
  }

  setApiKey(key: string | null): void {
    if (key === null || key.trim() === '') {
      this.data.apiKeyEncrypted = null
    } else if (safeStorage.isEncryptionAvailable()) {
      this.data.apiKeyEncrypted = safeStorage.encryptString(key.trim()).toString('base64')
    } else {
      // Fallback: mark as plain (should not happen on Windows with DPAPI available)
      this.data.apiKeyEncrypted = 'plain:' + Buffer.from(key.trim()).toString('base64')
    }
    this.save()
  }

  getApiKey(): string | null {
    const enc = this.data.apiKeyEncrypted
    if (!enc) return null
    try {
      if (enc.startsWith('plain:')) return Buffer.from(enc.slice(6), 'base64').toString('utf8')
      return safeStorage.decryptString(Buffer.from(enc, 'base64'))
    } catch (err) {
      console.error('[settings] failed to decrypt API key:', err)
      return null
    }
  }

  /** Environment for spawned agent processes according to the auth mode. */
  agentEnv(): Record<string, string> {
    const env: Record<string, string> = {}
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v

    // Drop any Claude Code *session* state inherited from a parent process. If the
    // app is launched from a terminal that was running Claude Code, these vars make
    // the spawned SDK expect a host to supply/refresh auth (CLAUDE_CODE_SDK_HAS_*
    // OAUTH/HOST_AUTH_REFRESH), so it never reads ~/.claude/.credentials.json and
    // fails with "Not logged in". We are our own entrypoint — start clean.
    for (const k of Object.keys(env)) {
      if (k === 'CLAUDECODE' || k.startsWith('CLAUDE_CODE_')) delete env[k]
    }

    const key = this.data.authMode === 'apiKey' ? this.getApiKey() : null
    if (key) env.ANTHROPIC_API_KEY = key
    else delete env.ANTHROPIC_API_KEY // subscription: force CLI stored credentials
    return env
  }
}
