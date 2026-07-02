import Anthropic from '@anthropic-ai/sdk'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import type { BrowserWindow } from 'electron'
import type { SuperpromptRequest } from '@shared/types'
import type { SettingsService } from './settings'

function metaPrompt(language: 'pl' | 'en', detail: 'concise' | 'detailed'): string {
  const lang = language === 'pl' ? 'polskim' : 'angielskim'
  const detailNote =
    detail === 'detailed'
      ? 'Prompt ma być szczegółowy: rozbuduj wymagania, kryteria akceptacji i ograniczenia.'
      : 'Prompt ma być zwięzły: maksymalnie ~250 słów, tylko najistotniejsze punkty.'
  return `Jesteś ekspertem od inżynierii promptów dla agentów kodujących (Claude Code).
Użytkownik opisze, do czego chce użyć Claude Code. Twoim zadaniem jest przekształcić ten opis
w jeden, gotowy do wklejenia prompt w języku ${lang}.

Struktura wygenerowanego prompta:
1. Persona — zacznij od zdania w stylu "Jesteś doświadczonym inżynierem [odpowiednia specjalizacja]…"
   dobierając specjalizację do zadania (frontend, backend, DevOps, dane, mobile itd.).
2. Kontekst — krótki opis projektu/sytuacji (wykorzystaj informacje o projekcie, jeśli podano).
3. Zadanie — co dokładnie ma zostać zrobione, sformułowane jako cel, nie lista kroków.
4. Wymagania — konkretne, weryfikowalne punkty.
5. Kryteria akceptacji — po czym poznać, że zadanie jest skończone (testy, uruchomienie, zachowanie).
6. Ograniczenia — czego nie robić (np. nie zmieniać niezwiązanych plików, nie dodawać zbędnych zależności).

${detailNote}

Zasady:
- Zwróć WYŁĄCZNIE treść prompta — bez wstępów, komentarzy, bloków kodu markdown wokół całości ani wyjaśnień.
- Nie wymyślaj technologii, których użytkownik nie zasugerował, chyba że wybór jest oczywisty — wtedy go zaproponuj wprost.
- Pisz konkretnie; unikaj ogólników typu "zadbaj o jakość kodu".`
}

function projectContext(cwd?: string): string {
  if (!cwd) return ''
  const lines: string[] = [`\n\nInformacje o projekcie użytkownika (katalog: ${basename(cwd)}):`]
  try {
    const pkgPath = join(cwd, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).slice(0, 25)
      lines.push(`- projekt Node.js "${pkg.name ?? '?'}", zależności: ${deps.join(', ')}`)
    }
    for (const [file, label] of [
      ['pyproject.toml', 'projekt Python (pyproject.toml)'],
      ['requirements.txt', 'projekt Python (requirements.txt)'],
      ['Cargo.toml', 'projekt Rust'],
      ['go.mod', 'projekt Go']
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
    const userContent = `Opis użytkownika:\n${req.description}${projectContext(req.cwd)}`
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
    const stream = client.messages.stream(
      {
        model: this.settings.getPublic().superpromptModel,
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
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
        canUseTool: async () => ({ behavior: 'deny', message: 'Narzędzia są wyłączone.' })
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
