import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import type { CostRecord } from '@shared/types'

/** Aggregates per-day, per-project cost/token usage from SDK `result` messages. */
export class CostService {
  private file: string
  private records: Map<string, CostRecord> = new Map()

  constructor() {
    this.file = join(app.getPath('userData'), 'costs.json')
    try {
      if (existsSync(this.file)) {
        const arr = JSON.parse(readFileSync(this.file, 'utf8')) as CostRecord[]
        for (const r of arr) this.records.set(`${r.date}|${r.project}`, r)
      }
    } catch (err) {
      console.error('[costs] failed to read:', err)
    }
  }

  private save(): void {
    try {
      writeFileSync(this.file, JSON.stringify([...this.records.values()], null, 2), 'utf8')
    } catch (err) {
      console.error('[costs] failed to write:', err)
    }
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
    rec.costUsd += cost
    rec.inputTokens +=
      Number(usage.input_tokens ?? 0) +
      Number(usage.cache_creation_input_tokens ?? 0) +
      Number(usage.cache_read_input_tokens ?? 0)
    rec.outputTokens += Number(usage.output_tokens ?? 0)
    rec.turns += 1
    this.records.set(key, rec)
    this.save()
  }

  list(): CostRecord[] {
    return [...this.records.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  }
}
