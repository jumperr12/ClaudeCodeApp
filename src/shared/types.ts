// Shared IPC protocol types between main and renderer.

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions'
export type AuthMode = 'subscription' | 'apiKey'

export interface AppSettings {
  authMode: AuthMode
  hasApiKey: boolean
  model: string
  superpromptModel: string
  defaultPermissionMode: PermissionMode
  lastCwd: string | null
}

export interface CreateSessionOptions {
  cwd: string
  model: string
  permissionMode: PermissionMode
  resume?: string
}

/** Envelope for every SDK message forwarded to the renderer. */
export interface SessionEventEnvelope {
  tabId: string
  message: Record<string, unknown>
}

export interface FileDiffPayload {
  filePath: string
  oldContent: string
  newContent: string
}

export interface PermissionRequestPayload {
  requestId: string
  tabId: string
  toolName: string
  input: Record<string, unknown>
  /** Rendered prompt sentence from the SDK, e.g. "Claude wants to run npm test". */
  title?: string
  displayName?: string
  diff?: FileDiffPayload
}

export type PermissionDecision =
  | { kind: 'allow' }
  | { kind: 'allowAlways' }
  | { kind: 'deny'; message?: string }

export interface GitFileEntry {
  path: string
  index: string
  workingDir: string
}

export interface GitCommitEntry {
  hash: string
  message: string
  author: string
  date: string
}

export interface GitPrInfo {
  number: number
  title: string
  url: string
  state: string
  checks: 'pass' | 'fail' | 'pending' | 'none'
}

export interface GitStatusPayload {
  isRepo: boolean
  branch?: string
  ahead?: number
  behind?: number
  files: GitFileEntry[]
  commits: GitCommitEntry[]
  pr?: GitPrInfo | null
  error?: string
}

export interface HistoryEntry {
  sessionId: string
  mtime: number
  sizeBytes: number
  firstPrompt: string
  cwd: string
}

export interface CostRecord {
  date: string
  project: string
  costUsd: number
  inputTokens: number
  outputTokens: number
  turns: number
}

export interface SuperpromptRequest {
  requestId: string
  description: string
  language: 'pl' | 'en'
  detail: 'concise' | 'detailed'
  cwd?: string
}

export interface SuperpromptChunk {
  requestId: string
  delta?: string
  done?: boolean
  error?: string
}

export const MODELS: { id: string; label: string; note: string }[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8', note: 'domyślny — najlepszy do kodu' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', note: 'szybszy i tańszy' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', note: 'proste zadania' },
  { id: 'claude-fable-5', label: 'Fable 5', note: 'najtrudniejsze zadania (drożej)' }
]

export const PERMISSION_MODES: { id: PermissionMode; label: string }[] = [
  { id: 'default', label: 'pytaj o zgodę' },
  { id: 'acceptEdits', label: 'auto-akceptuj edycje' },
  { id: 'plan', label: 'tryb planowania' },
  { id: 'bypassPermissions', label: 'bez pytań (ostrożnie!)' }
]
