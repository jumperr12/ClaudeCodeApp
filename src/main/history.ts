import { homedir } from 'os'
import { join, basename } from 'path'
import { readdirSync, statSync, existsSync, openSync, readSync, closeSync, readFileSync } from 'fs'
import { estimateCostUsd, type HistoryEntry } from '@shared/types'

const HEAD_ONLY_ABOVE = 25 * 1024 * 1024 // parse only the head of transcripts larger than this

interface SessionMeta {
  firstPrompt: string
  cwd?: string
  model?: string
  tokens: number
  turns: number
  costUsd?: number
}

/** Parse a transcript for model, token totals, first prompt, cwd and an estimated cost. */
function parseMeta(filePath: string, size: number): SessionMeta {
  let content = ''
  try {
    if (size > HEAD_ONLY_ABOVE) {
      const fd = openSync(filePath, 'r')
      const buf = Buffer.alloc(256 * 1024)
      const n = readSync(fd, buf, 0, buf.length, 0)
      closeSync(fd)
      content = buf.toString('utf8', 0, n)
    } else {
      content = readFileSync(filePath, 'utf8')
    }
  } catch {
    return { firstPrompt: '(brak podglądu)', tokens: 0, turns: 0 }
  }

  let firstPrompt: string | undefined
  let cwd: string | undefined
  let model: string | undefined
  let input = 0
  let output = 0
  let cacheCreate = 0
  let cacheRead = 0
  let turns = 0

  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t) continue
    let o: Record<string, unknown>
    try {
      o = JSON.parse(t)
    } catch {
      continue
    }
    if (typeof o.cwd === 'string') cwd = o.cwd
    if (o.type === 'summary' && typeof o.summary === 'string' && firstPrompt === undefined) {
      firstPrompt = o.summary
    }
    const m = o.message as Record<string, unknown> | undefined
    if (m && typeof m === 'object') {
      if (typeof m.model === 'string' && m.model && m.model !== '<synthetic>') model = m.model
      const u = m.usage as Record<string, unknown> | undefined
      if (u && typeof u === 'object') {
        input += Number(u.input_tokens ?? 0)
        output += Number(u.output_tokens ?? 0)
        cacheCreate += Number(u.cache_creation_input_tokens ?? 0)
        cacheRead += Number(u.cache_read_input_tokens ?? 0)
      }
      if (o.type === 'user') {
        const c = m.content
        let text: string | undefined
        if (typeof c === 'string') text = c
        else if (Array.isArray(c)) {
          for (const b of c) {
            const blk = b as Record<string, unknown>
            if (blk?.type === 'text' && typeof blk.text === 'string') {
              text = blk.text
              break
            }
          }
        }
        // a real human turn has a text block (tool_result-only user msgs don't)
        if (text !== undefined) {
          turns += 1
          if (firstPrompt === undefined) firstPrompt = text
        }
      }
    }
  }

  const tokens = input + output + cacheCreate + cacheRead
  return {
    firstPrompt: (firstPrompt ?? '(brak podglądu)').slice(0, 300),
    cwd,
    model,
    tokens,
    turns,
    costUsd: model ? estimateCostUsd(model, input, output, cacheCreate, cacheRead) : undefined
  }
}

/** All sessions across every project, newest first, enriched with model/tokens/cost. */
export function listAllSessions(limit = 100): HistoryEntry[] {
  const root = join(homedir(), '.claude', 'projects')
  if (!existsSync(root)) return []
  const files: { path: string; name: string; mtime: number; size: number }[] = []
  for (const dirName of readdirSync(root)) {
    const dir = join(root, dirName)
    try {
      if (!statSync(dir).isDirectory()) continue
    } catch {
      continue
    }
    let names: string[]
    try {
      names = readdirSync(dir)
    } catch {
      continue
    }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue
      const path = join(dir, name)
      try {
        const st = statSync(path)
        files.push({ path, name, mtime: st.mtimeMs, size: st.size })
      } catch {
        // skip
      }
    }
  }
  files.sort((a, b) => b.mtime - a.mtime)
  return files.slice(0, limit).map((f) => {
    const meta = parseMeta(f.path, f.size)
    const cwd = meta.cwd ?? ''
    return {
      sessionId: basename(f.name, '.jsonl'),
      mtime: f.mtime,
      sizeBytes: f.size,
      firstPrompt: meta.firstPrompt,
      cwd,
      model: meta.model,
      tokens: meta.tokens,
      costUsd: meta.costUsd,
      turns: meta.turns,
      project: cwd ? basename(cwd) : undefined
    }
  })
}

/**
 * Reads Claude Code session transcripts from ~/.claude/projects/<sanitized-cwd>/*.jsonl —
 * the same files the CLI writes, so sessions are interoperable (start in terminal,
 * resume in the app and vice versa).
 */
export function projectHistoryDir(cwd: string): string {
  const sanitized = cwd.replace(/[^a-zA-Z0-9]/g, '-')
  return join(homedir(), '.claude', 'projects', sanitized)
}

function extractFirstPrompt(filePath: string): string {
  try {
    // Read only the head of the file — transcripts can be many MB.
    const fd = openSync(filePath, 'r')
    const buf = Buffer.alloc(128 * 1024)
    const n = readSync(fd, buf, 0, buf.length, 0)
    closeSync(fd)
    const head = buf.toString('utf8', 0, n)
    for (const line of head.split('\n')) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line)
        if (obj.type === 'user' && obj.message) {
          const content = obj.message.content
          if (typeof content === 'string') return content.slice(0, 300)
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block?.type === 'text' && typeof block.text === 'string') {
                return block.text.slice(0, 300)
              }
            }
          }
        }
        if (obj.type === 'summary' && typeof obj.summary === 'string') {
          return obj.summary.slice(0, 300)
        }
      } catch {
        // partial line at buffer boundary — ignore
      }
    }
  } catch {
    // unreadable file — ignore
  }
  return '(brak podglądu)'
}

export function listSessions(cwd: string): HistoryEntry[] {
  const dir = projectHistoryDir(cwd)
  if (!existsSync(dir)) return []
  const entries: HistoryEntry[] = []
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.jsonl')) continue
    const filePath = join(dir, name)
    try {
      const st = statSync(filePath)
      entries.push({
        sessionId: basename(name, '.jsonl'),
        mtime: st.mtimeMs,
        sizeBytes: st.size,
        firstPrompt: extractFirstPrompt(filePath),
        cwd
      })
    } catch {
      // skip unreadable
    }
  }
  return entries.sort((a, b) => b.mtime - a.mtime)
}

export function searchSessions(cwd: string, query: string): HistoryEntry[] {
  const q = query.toLowerCase()
  const all = listSessions(cwd)
  if (!q.trim()) return all
  const dir = projectHistoryDir(cwd)
  return all.filter((e) => {
    if (e.firstPrompt.toLowerCase().includes(q)) return true
    try {
      const filePath = join(dir, e.sessionId + '.jsonl')
      if (e.sizeBytes > 8 * 1024 * 1024) return false // skip huge files in content search
      return readFileSync(filePath, 'utf8').toLowerCase().includes(q)
    } catch {
      return false
    }
  })
}
