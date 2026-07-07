// Shared IPC protocol types between main and renderer.

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions'
export type AuthMode = 'subscription' | 'apiKey'
export type ModelFamily = 'fable' | 'opus' | 'sonnet' | 'haiku'
export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export const EFFORT_LEVELS: { id: EffortLevel; label: string }[] = [
  { id: 'low', label: 'low' },
  { id: 'medium', label: 'medium' },
  { id: 'high', label: 'high' },
  { id: 'xhigh', label: 'xhigh' },
  { id: 'max', label: 'max' }
]

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
  defaultEffort: EffortLevel
  lastCwd: string | null
}

export interface CreateSessionOptions {
  cwd: string
  model: string
  permissionMode: PermissionMode
  effort: EffortLevel
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
  /** Enriched metadata (from parsing the transcript). */
  model?: string
  tokens?: number
  costUsd?: number
  project?: string
  turns?: number
}

/** Approx list price per 1M tokens by family, for cost estimates in the history panel. */
const FAMILY_PRICE: Record<ModelFamily, { in: number; out: number }> = {
  fable: { in: 10, out: 50 },
  opus: { in: 5, out: 25 },
  sonnet: { in: 3, out: 15 },
  haiku: { in: 1, out: 5 }
}

/** Rough cost estimate (list prices; cache-read ~0.1x, cache-write ~1.25x of input). */
export function estimateCostUsd(
  model: string,
  input: number,
  output: number,
  cacheCreate = 0,
  cacheRead = 0
): number {
  const p = FAMILY_PRICE[familyOf(model) ?? 'opus']
  const inSide = (input + cacheCreate * 1.25 + cacheRead * 0.1) / 1e6 * p.in
  const outSide = (output / 1e6) * p.out
  return inSide + outSide
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

export interface RateLimitWindow {
  /** Percentage of the window used, 0-100. */
  utilization: number | null
  /** ISO 8601 timestamp when the window resets. */
  resetsAt: string | null
}

/**
 * Real claude.ai plan rate-limit utilization (same data as Claude Code's /usage).
 * `available` is false for API-key/Bedrock/Vertex sessions where plan limits don't apply.
 */
export interface PlanUsage {
  available: boolean
  subscriptionType: string | null
  sessionCostUsd?: number
  fiveHour?: RateLimitWindow | null
  sevenDay?: RateLimitWindow | null
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
    note: 'hardest tasks (pricier, slower)',
    versions: [{ id: 'claude-fable-5', label: 'Fable 5' }]
  },
  {
    family: 'opus',
    label: 'Opus',
    note: 'best for code and long tasks',
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
    note: 'fast and balanced',
    versions: [
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
      { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5', legacy: true },
      { id: 'claude-sonnet-4-0', label: 'Sonnet 4', legacy: true }
    ]
  },
  {
    family: 'haiku',
    label: 'Haiku',
    note: 'fastest, for simple tasks',
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

/** Models that support the `xhigh` effort level (required for ultracode). */
export const XHIGH_CAPABLE = new Set(['claude-fable-5', 'claude-opus-4-8', 'claude-opus-4-7'])

export function supportsXhigh(modelId: string): boolean {
  return XHIGH_CAPABLE.has(modelId)
}

/** Ultracode (xhigh + dynamic workflows) needs an xhigh-capable model — Opus 4.7/4.8, Fable 5. */
export function supportsUltracode(modelId: string): boolean {
  return supportsXhigh(modelId)
}

/**
 * Models that accept `thinking: {type: "adaptive"}` (Claude 4.6+ family).
 * Pre-4.6 models reject it with a 400 — for those we omit the thinking param.
 */
export const ADAPTIVE_THINKING_CAPABLE = new Set([
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-sonnet-5',
  'claude-sonnet-4-6'
])

export function supportsAdaptiveThinking(modelId: string): boolean {
  return ADAPTIVE_THINKING_CAPABLE.has(modelId)
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
  { id: 'default', label: 'ask for approval' },
  { id: 'acceptEdits', label: 'auto-accept edits' },
  { id: 'plan', label: 'plan mode' },
  { id: 'bypassPermissions', label: 'no prompts (careful!)' }
]
