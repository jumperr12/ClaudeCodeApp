import { homedir } from 'os'
import { join, basename } from 'path'
import { readdirSync, statSync, existsSync, openSync, readSync, closeSync, readFileSync } from 'fs'
import type { HistoryEntry } from '@shared/types'

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
