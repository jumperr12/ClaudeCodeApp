import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import type { CostRecord, UsageWindow } from '@shared/types'

interface UsageEvent {
  t: number
  cost: number
  tokens: number
}

const EVENT_RETENTION_MS = 24 * 60 * 60 * 1000 // keep 24h of events

/** Aggregates per-day, per-project cost/token usage from SDK `result` messages. */
export class CostService {
  private file: string
  private eventsFile: string
  private records: Map<string, CostRecord> = new Map()
  private events: UsageEvent[] = []

  constructor() {
    this.file = join(app.getPath('userData'), 'costs.json')
    this.eventsFile = join(app.getPath('userData'), 'usage-events.json')
    try {
      if (existsSync(this.file)) {
        const arr = JSON.parse(readFileSync(this.file, 'utf8')) as CostRecord[]
        for (const r of arr) this.records.set(`${r.date}|${r.project}`, r)
      }
    } catch (err) {
      console.error('[costs] failed to read:', err)
    }
    try {
      if (existsSync(this.eventsFile)) {
        const arr = JSON.parse(readFileSync(this.eventsFile, 'utf8')) as UsageEvent[]
        const cutoff = Date.now() - EVENT_RETENTION_MS
        this.events = arr.filter((e) => e.t >= cutoff)
      }
    } catch (err) {
      console.error('[costs] failed to read events:', err)
    }
  }

  private save(): void {
    try {
      writeFileSync(this.file, JSON.stringify([...this.records.values()], null, 2), 'utf8')
    } catch (err) {
      console.error('[costs] failed to write:', err)
    }
  }

  private saveEvents(): void {
    try {
      writeFileSync(this.eventsFile, JSON.stringify(this.events), 'utf8')
    } catch (err) {
      console.error('[costs] failed to write events:', err)
    }
  }

  /** Rolling usage over the last `hours` — local estimate for the status-bar meter. */
  usageWindow(hours = 5, bucketCount = 12): UsageWindow {
    const now = Date.now()
    const start = now - hours * 60 * 60 * 1000
    const span = now - start
    const buckets = new Array<number>(bucketCount).fill(0)
    let costUsd = 0
    let tokens = 0
    let turns = 0
    for (const e of this.events) {
      if (e.t < start) continue
      costUsd += e.cost
      tokens += e.tokens
      turns += 1
      const idx = Math.min(bucketCount - 1, Math.floor(((e.t - start) / span) * bucketCount))
      buckets[idx] += e.cost
    }
    return { windowHours: hours, costUsd, tokens, turns, buckets }
  }

  record(cwd: string, resultMessage: Record<string, unknown>): void {
    const date = new Date().toISOString().slice(0, 10)
    const project = basename(cwd) || cwd
    const key = `${date}|${project}`
    const rec = this.records.get(key) ?? {
      date,
      project,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      turns: 0
    }
    const cost = typeof resultMessage.total_cost_usd === 'number' ? resultMessage.total_cost_usd : 0
    const usage = (resultMessage.usage ?? {}) as Record<string, unknown>
    const inTokens =
      Number(usage.input_tokens ?? 0) +
      Number(usage.cache_creation_input_tokens ?? 0) +
      Number(usage.cache_read_input_tokens ?? 0)
    const outTokens = Number(usage.output_tokens ?? 0)
    rec.costUsd += cost
    rec.inputTokens += inTokens
    rec.outputTokens += outTokens
    rec.turns += 1
    this.records.set(key, rec)
    this.save()

    // rolling-window event log for the 5h usage meter
    const cutoff = Date.now() - EVENT_RETENTION_MS
    this.events = this.events.filter((e) => e.t >= cutoff)
    this.events.push({ t: Date.now(), cost, tokens: inTokens + outTokens })
    this.saveEvents()
  }

  list(): CostRecord[] {
    return [...this.records.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  }
}
