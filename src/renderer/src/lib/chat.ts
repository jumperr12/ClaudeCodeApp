// Chat item model + pure reducer translating SDK messages into UI items.
import type { EffortLevel, PermissionMode } from '@shared/types'

export type ChatItem =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'text'; id: string; text: string; streaming: boolean }
  | {
      kind: 'thinking'
      id: string
      text: string
      streaming: boolean
      startedAt: number
      durationMs?: number
    }
  | {
      kind: 'tool'
      id: string
      toolUseId: string
      name: string
      input: Record<string, unknown> | null
      inputJson: string
      result?: string
      isError?: boolean
      done: boolean
    }
  | { kind: 'result'; id: string; ok: boolean; costUsd?: number; durationMs?: number }
  | { kind: 'info'; id: string; text: string; tone: 'normal' | 'error' }

export interface TabState {
  id: string
  title: string
  cwd: string | null
  model: string
  permissionMode: PermissionMode
  effort: EffortLevel
  /** Ultracode (xhigh + workflows) — session-scoped, resets on new session. */
  ultracode: boolean
  status: 'empty' | 'connecting' | 'idle' | 'working'
  items: ChatItem[]
  sdkSessionId?: string
  costUsd: number
  contextTokens: number
  contextLimit: number
  /** map: stream content-block index -> chat item id (reset on message_start) */
  streamBlocks: Record<number, string>
  closed: boolean
}

let counter = 0
export function nextId(): string {
  return `i${++counter}`
}

export function createTab(
  id: string,
  model: string,
  permissionMode: PermissionMode,
  effort: EffortLevel = 'high'
): TabState {
  return {
    id,
    title: 'New session',
    cwd: null,
    model,
    permissionMode,
    effort,
    ultracode: false,
    status: 'empty',
    items: [],
    costUsd: 0,
    contextTokens: 0,
    contextLimit: 200_000,
    streamBlocks: {},
    closed: false
  }
}

type Obj = Record<string, unknown>
const asObj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})

function updateItem(items: ChatItem[], id: string, patch: Partial<ChatItem>): ChatItem[] {
  return items.map((it) => (it.id === id ? ({ ...it, ...patch } as ChatItem) : it))
}

function usageTokens(usage: Obj): number {
  return (
    Number(usage.input_tokens ?? 0) +
    Number(usage.cache_creation_input_tokens ?? 0) +
    Number(usage.cache_read_input_tokens ?? 0) +
    Number(usage.output_tokens ?? 0)
  )
}

function toolResultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        const o = asObj(b)
        if (o.type === 'text' && typeof o.text === 'string') return o.text
        if (o.type === 'image') return '[obraz]'
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return JSON.stringify(content ?? '')
}

/** Apply one SDK message to a tab. Returns a new TabState. */
export function reduceSdkMessage(tab: TabState, message: Obj): TabState {
  const type = message.type as string

  // Skip internal traffic of subagents (Task tool) — its result shows on the Task card.
  if (message.parent_tool_use_id) return tab

  switch (type) {
    case 'system':
      return reduceSystem(tab, message)
    case 'stream_event':
      return reduceStreamEvent(tab, asObj(message.event))
    case 'assistant':
      return reduceAssistant(tab, asObj(message.message))
    case 'user':
      return reduceUser(tab, asObj(message.message))
    case 'result':
      return reduceResult(tab, message)
    case 'app_error':
      return {
        ...tab,
        status: 'idle',
        items: [
          ...tab.items,
          { kind: 'info', id: nextId(), text: `Session error: ${message.error}`, tone: 'error' }
        ]
      }
    case 'app_closed':
      return { ...tab, status: 'idle', closed: true }
    default:
      return tab
  }
}

function reduceSystem(tab: TabState, message: Obj): TabState {
  if (message.subtype === 'init') {
    const model = typeof message.model === 'string' ? message.model : tab.model
    return {
      ...tab,
      sdkSessionId: typeof message.session_id === 'string' ? message.session_id : tab.sdkSessionId,
      model,
      status: 'idle',
      items: [
        ...tab.items,
        {
          kind: 'info',
          id: nextId(),
          text: `Connected · ${model} · ${message.cwd ?? tab.cwd ?? ''}`,
          tone: 'normal'
        }
      ]
    }
  }
  if (message.subtype === 'compact_boundary') {
    return {
      ...tab,
      items: [
        ...tab.items,
        { kind: 'info', id: nextId(), text: 'Context was compacted', tone: 'normal' }
      ]
    }
  }
  return tab
}

function reduceStreamEvent(tab: TabState, ev: Obj): TabState {
  switch (ev.type) {
    case 'message_start': {
      const usage = asObj(asObj(ev.message).usage)
      const tokens = usageTokens(usage)
      return {
        ...tab,
        status: 'working',
        streamBlocks: {},
        contextTokens: tokens > 0 ? tokens : tab.contextTokens
      }
    }
    case 'content_block_start': {
      const index = Number(ev.index ?? 0)
      const block = asObj(ev.content_block)
      const id = nextId()
      let item: ChatItem | null = null
      if (block.type === 'thinking') {
        item = { kind: 'thinking', id, text: '', streaming: true, startedAt: Date.now() }
      } else if (block.type === 'text') {
        item = { kind: 'text', id, text: '', streaming: true }
      } else if (block.type === 'tool_use') {
        item = {
          kind: 'tool',
          id,
          toolUseId: String(block.id ?? ''),
          name: String(block.name ?? '?'),
          input: null,
          inputJson: '',
          done: false
        }
      }
      if (!item) return tab
      return {
        ...tab,
        status: 'working',
        items: [...tab.items, item],
        streamBlocks: { ...tab.streamBlocks, [index]: id }
      }
    }
    case 'content_block_delta': {
      const index = Number(ev.index ?? 0)
      const id = tab.streamBlocks[index]
      if (!id) return tab
      const delta = asObj(ev.delta)
      const items = tab.items.map((it) => {
        if (it.id !== id) return it
        if (it.kind === 'thinking' && delta.type === 'thinking_delta') {
          return { ...it, text: it.text + String(delta.thinking ?? '') }
        }
        if (it.kind === 'text' && delta.type === 'text_delta') {
          return { ...it, text: it.text + String(delta.text ?? '') }
        }
        if (it.kind === 'tool' && delta.type === 'input_json_delta') {
          return { ...it, inputJson: it.inputJson + String(delta.partial_json ?? '') }
        }
        return it
      })
      return { ...tab, items }
    }
    case 'content_block_stop': {
      const index = Number(ev.index ?? 0)
      const id = tab.streamBlocks[index]
      if (!id) return tab
      const items = tab.items.map((it) => {
        if (it.id !== id) return it
        if (it.kind === 'thinking') {
          return { ...it, streaming: false, durationMs: Date.now() - it.startedAt }
        }
        if (it.kind === 'text') return { ...it, streaming: false }
        if (it.kind === 'tool' && it.input === null && it.inputJson) {
          try {
            return { ...it, input: JSON.parse(it.inputJson) as Record<string, unknown> }
          } catch {
            return it
          }
        }
        return it
      })
      return { ...tab, items }
    }
    default:
      return tab
  }
}

/** Full assistant message — reconcile with what was streamed (authoritative content). */
function reduceAssistant(tab: TabState, apiMessage: Obj): TabState {
  const content = Array.isArray(apiMessage.content) ? apiMessage.content : []
  let next = tab
  content.forEach((raw, index) => {
    const block = asObj(raw)
    const streamedId = next.streamBlocks[index]
    if (block.type === 'text' && typeof block.text === 'string') {
      if (streamedId) {
        next = { ...next, items: updateItem(next.items, streamedId, { text: block.text, streaming: false }) }
      } else {
        next = {
          ...next,
          items: [...next.items, { kind: 'text', id: nextId(), text: block.text, streaming: false }]
        }
      }
    } else if (block.type === 'thinking') {
      const text = typeof block.thinking === 'string' ? block.thinking : ''
      if (streamedId) {
        const existing = next.items.find((i) => i.id === streamedId)
        const keep = existing && existing.kind === 'thinking' && existing.text.length > text.length
        next = {
          ...next,
          items: updateItem(next.items, streamedId, {
            streaming: false,
            ...(keep ? {} : text ? { text } : {})
          })
        }
      }
    } else if (block.type === 'tool_use') {
      const toolUseId = String(block.id ?? '')
      const existing = next.items.find((i) => i.kind === 'tool' && i.toolUseId === toolUseId)
      if (existing) {
        next = {
          ...next,
          items: updateItem(next.items, existing.id, {
            input: asObj(block.input),
            name: String(block.name ?? '?')
          })
        }
      } else {
        next = {
          ...next,
          items: [
            ...next.items,
            {
              kind: 'tool',
              id: nextId(),
              toolUseId,
              name: String(block.name ?? '?'),
              input: asObj(block.input),
              inputJson: '',
              done: false
            }
          ]
        }
      }
    }
  })
  const usage = asObj(apiMessage.usage)
  const tokens = usageTokens(usage)
  return { ...next, contextTokens: tokens > 0 ? tokens : next.contextTokens }
}

/** User-side SDK messages carry tool results. */
function reduceUser(tab: TabState, apiMessage: Obj): TabState {
  const content = Array.isArray(apiMessage.content) ? apiMessage.content : []
  let items = tab.items
  for (const raw of content) {
    const block = asObj(raw)
    if (block.type !== 'tool_result') continue
    const toolUseId = String(block.tool_use_id ?? '')
    const target = items.find((i) => i.kind === 'tool' && i.toolUseId === toolUseId)
    if (target) {
      items = updateItem(items, target.id, {
        result: toolResultText(block.content),
        isError: block.is_error === true,
        done: true
      })
    }
  }
  return items === tab.items ? tab : { ...tab, items }
}

function reduceResult(tab: TabState, message: Obj): TabState {
  const cost = typeof message.total_cost_usd === 'number' ? message.total_cost_usd : undefined
  const usage = asObj(message.usage)
  const tokens = usageTokens(usage)
  return {
    ...tab,
    status: 'idle',
    costUsd: tab.costUsd + (cost ?? 0),
    contextTokens: tokens > 0 ? tokens : tab.contextTokens,
    items: [
      ...tab.items,
      {
        kind: 'result',
        id: nextId(),
        ok: message.subtype === 'success',
        costUsd: cost,
        durationMs: typeof message.duration_ms === 'number' ? message.duration_ms : undefined
      }
    ]
  }
}
