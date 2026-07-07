import Anthropic from '@anthropic-ai/sdk'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import type { BrowserWindow } from 'electron'
import { supportsAdaptiveThinking, type SuperpromptRequest } from '@shared/types'
import type { SettingsService } from './settings'

function metaPrompt(language: 'pl' | 'en', detail: 'concise' | 'detailed'): string {
  const lang = language === 'pl' ? 'Polish' : 'English'
  const detailNote =
    detail === 'detailed'
      ? 'The prompt should be detailed: expand the requirements, acceptance criteria and constraints.'
      : 'The prompt should be concise: at most ~250 words, only the most important points.'
  return `You are an expert prompt engineer for coding agents (Claude Code).
The user will describe what they want to use Claude Code for. Your job is to turn that description
into a single, ready-to-paste prompt written in ${lang}.

Structure of the generated prompt:
1. Persona — start with a sentence like "You are an experienced [relevant specialty] engineer…",
   picking the specialty to match the task (frontend, backend, DevOps, data, mobile, etc.).
2. Context — a short description of the project/situation (use the project info if provided).
3. Task — exactly what should be done, phrased as a goal, not a list of steps.
4. Requirements — concrete, verifiable points.
5. Acceptance criteria — how to know the task is done (tests, running it, behavior).
6. Constraints — what not to do (e.g. don't touch unrelated files, don't add needless dependencies).

${detailNote}

Rules:
- Return ONLY the prompt content — no preamble, comments, surrounding markdown code fences, or explanations.
- Don't invent technologies the user didn't suggest, unless the choice is obvious — then propose it explicitly.
- Be specific; avoid generic filler like "make sure the code is high quality".`
}

function projectContext(cwd?: string): string {
  if (!cwd) return ''
  const lines: string[] = [`\n\nUser's project info (directory: ${basename(cwd)}):`]
  try {
    const pkgPath = join(cwd, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).slice(0, 25)
      lines.push(`- Node.js project "${pkg.name ?? '?'}", dependencies: ${deps.join(', ')}`)
    }
    for (const [file, label] of [
      ['pyproject.toml', 'Python project (pyproject.toml)'],
      ['requirements.txt', 'Python project (requirements.txt)'],
      ['Cargo.toml', 'Rust project'],
      ['go.mod', 'Go project']
    ] as const) {
      if (existsSync(join(cwd, file))) lines.push(`- ${label}`)
    }
  } catch {
    // best-effort context only
  }
  return lines.length > 1 ? lines.join('\n') : ''
}

export class SuperpromptService {
  private active = new Map<string, AbortController>()

  constructor(
    private settings: SettingsService,
    private getWindow: () => BrowserWindow | null
  ) {}

  private emit(payload: Record<string, unknown>): void {
    const win = this.getWindow()
    if (win && !win.isDestroyed()) win.webContents.send('superprompt:chunk', payload)
  }

  async generate(req: SuperpromptRequest): Promise<void> {
    const abort = new AbortController()
    this.active.set(req.requestId, abort)
    const system = metaPrompt(req.language, req.detail)
    const userContent = `User's description:\n${req.description}${projectContext(req.cwd)}`
    const settings = this.settings.getPublic()
    const apiKey = settings.authMode === 'apiKey' ? this.settings.getApiKey() : null

    try {
      if (apiKey) {
        await this.generateViaApi(req, system, userContent, apiKey, abort)
      } else {
        await this.generateViaSdk(req, system, userContent, abort)
      }
      this.emit({ requestId: req.requestId, done: true })
    } catch (err) {
      if (!abort.signal.aborted) {
        this.emit({ requestId: req.requestId, error: String(err), done: true })
      }
    } finally {
      this.active.delete(req.requestId)
    }
  }

  /** Direct API call — used in API-key mode. */
  private async generateViaApi(
    req: SuperpromptRequest,
    system: string,
    userContent: string,
    apiKey: string,
    abort: AbortController
  ): Promise<void> {
    const client = new Anthropic({ apiKey })
    const model = this.settings.getPublic().superpromptModel
    const stream = client.messages.stream(
      {
        model,
        max_tokens: 4096,
        // Adaptive thinking only exists on Claude 4.6+; pre-4.6 models 400 on it.
        ...(supportsAdaptiveThinking(model) ? { thinking: { type: 'adaptive' as const } } : {}),
        system,
        messages: [{ role: 'user', content: userContent }]
      },
      { signal: abort.signal }
    )
    stream.on('text', (delta) => this.emit({ requestId: req.requestId, delta }))
    await stream.finalMessage()
  }

  /** One-shot Agent SDK session — used in subscription mode (no API key needed). */
  private async generateViaSdk(
    req: SuperpromptRequest,
    system: string,
    userContent: string,
    abort: AbortController
  ): Promise<void> {
    const q = query({
      prompt: userContent,
      options: {
        cwd: req.cwd,
        model: this.settings.getPublic().superpromptModel,
        systemPrompt: system,
        allowedTools: [],
        maxTurns: 1,
        includePartialMessages: true,
        abortController: abort,
        env: this.settings.agentEnv(),
        canUseTool: async () => ({ behavior: 'deny', message: 'Tools are disabled.' })
      }
    })
    for await (const message of q as AsyncIterable<Record<string, unknown>>) {
      if (message.type === 'stream_event') {
        const event = message.event as Record<string, unknown> | undefined
        if (event?.type === 'content_block_delta') {
          const delta = event.delta as Record<string, unknown> | undefined
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
            this.emit({ requestId: req.requestId, delta: delta.text })
          }
        }
      }
    }
  }

  cancel(requestId: string): void {
    this.active.get(requestId)?.abort()
    this.active.delete(requestId)
  }
}
