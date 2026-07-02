// Shared IPC protocol types between main and renderer.

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions'
export type AuthMode = 'subscription' | 'apiKey'
export type ModelFamily = 'fable' | 'opus' | 'sonnet' | 'haiku'

export interface AppSettings {
  authMode: AuthMode
  hasApiKey: boolean
  /** Resolved concrete agent model id (= familyVersions[modelFamily]). */
  model: string
  /** Resolved concrete superprompt model id (= familyVersions[superpromptFamily]). */
  superpromptModel: string
  /** Which family new agent sessions use. */
  modelFamily: ModelFamily
  /** Which family the superprompt generator uses. */
  superpromptFamily: ModelFamily
  /** Pinned version id per family (default: newest). */
  familyVersions: Record<ModelFamily, string>
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

/** Rolling usage over the last N hours (local estimate from app's own records). */
export interface UsageWindow {
  windowHours: number
  costUsd: number
  tokens: number
  turns: number
  /** Cost per time bucket across the window, oldest→newest (for a sparkline). */
  buckets: number[]
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

export interface ModelVersion {
  id: string
  label: string
  legacy?: boolean
}

export interface ModelFamilyDef {
  family: ModelFamily
  label: string
  note: string
  /** Newest first. versions[0] is the default. */
  versions: ModelVersion[]
}

/** Model catalog grouped by family. Newest first per family; legacy flagged. */
export const MODEL_FAMILIES: ModelFamilyDef[] = [
  {
    family: 'fable',
    label: 'Fable',
    note: 'najtrudniejsze zadania (drożej, wolniej)',
    versions: [{ id: 'claude-fable-5', label: 'Fable 5' }]
  },
  {
    family: 'opus',
    label: 'Opus',
    note: 'najlepszy do kodu i długich zadań',
    versions: [
      { id: 'claude-opus-4-8', label: 'Opus 4.8' },
      { id: 'claude-opus-4-7', label: 'Opus 4.7', legacy: true },
      { id: 'claude-opus-4-6', label: 'Opus 4.6', legacy: true },
      { id: 'claude-opus-4-5', label: 'Opus 4.5', legacy: true },
      { id: 'claude-opus-4-1', label: 'Opus 4.1', legacy: true }
    ]
  },
  {
    family: 'sonnet',
    label: 'Sonnet',
    note: 'szybki i zbalansowany',
    versions: [
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
      { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5', legacy: true },
      { id: 'claude-sonnet-4-0', label: 'Sonnet 4', legacy: true }
    ]
  },
  {
    family: 'haiku',
    label: 'Haiku',
    note: 'najszybszy, do prostych zadań',
    versions: [
      { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
      { id: 'claude-3-haiku-20240307', label: 'Haiku 3', legacy: true }
    ]
  }
]

export const MODEL_FAMILY_ORDER: ModelFamily[] = ['fable', 'opus', 'sonnet', 'haiku']

export function familyDef(family: ModelFamily): ModelFamilyDef {
  return MODEL_FAMILIES.find((f) => f.family === family) as ModelFamilyDef
}

/** Newest (default) model id for a family. */
export function newestModelId(family: ModelFamily): string {
  return familyDef(family).versions[0].id
}

/** Which family a concrete model id belongs to (undefined if unknown). */
export function familyOf(modelId: string): ModelFamily | undefined {
  return MODEL_FAMILIES.find((f) => f.versions.some((v) => v.id === modelId))?.family
}

export function modelLabel(modelId: string): string {
  for (const f of MODEL_FAMILIES) {
    const v = f.versions.find((x) => x.id === modelId)
    if (v) return v.label
  }
  return modelId
}

/** Default pin per family = newest. */
export function defaultFamilyVersions(): Record<ModelFamily, string> {
  return {
    fable: newestModelId('fable'),
    opus: newestModelId('opus'),
    sonnet: newestModelId('sonnet'),
    haiku: newestModelId('haiku')
  }
}

export const PERMISSION_MODES: { id: PermissionMode; label: string }[] = [
  { id: 'default', label: 'pytaj o zgodę' },
  { id: 'acceptEdits', label: 'auto-akceptuj edycje' },
  { id: 'plan', label: 'tryb planowania' },
  { id: 'bypassPermissions', label: 'bez pytań (ostrożnie!)' }
]
