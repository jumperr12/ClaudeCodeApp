# Claude Code Desktop

Native desktop GUI for [Claude Code](https://claude.com/claude-code) — the full power of the CLI with a richer interface. Built with **Electron + React + TypeScript** on top of the **Claude Agent SDK**, so it inherits every Claude Code capability (all tools, permission modes, hooks, MCP, sessions & resume) — it's a UI, not a re-implementation of the agent.

## Features

- **CLI-faithful chat** — dark, terminal-style interface with streaming responses and collapsible tool-call cards.
- **Thinking animations** — live-streamed reasoning with an animated status indicator, elapsed time and token counter.
- **Diff viewer with accept/reject** — file edits render as a Monaco side-by-side diff with per-file approve/reject controls.
- **GitHub status panel** — branch, ahead/behind, staged/unstaged changes, recent commits, and open PRs (`gh` CLI).
- **Superprompt generator** — describe your goal and Claude turns it into a structured, engineer-grade prompt.
- **Session tabs** — multiple parallel Claude Code sessions, each in its own project.
- **Cost dashboard** — token usage, session cost, and context-window gauge.
- **Session history + resume** — browse and resume past sessions (interoperable with the CLI's session files).

## Authentication

Two modes, switchable in settings:

- **Subscription** (default) — reuses your Claude Code login (Pro/Max), no API costs.
- **API key** — pay-as-you-go via the Anthropic API. The key is stored encrypted via Electron `safeStorage`.

## Models

Default agent model is **Claude Opus 4.8**. Switchable per-tab from the status bar: Opus 4.8 · Sonnet 4.6 · Haiku 4.5 · Fable 5.

## Tech Stack

Electron · electron-vite · React · TypeScript · Tailwind CSS · Zustand · framer-motion · Monaco Editor · simple-git · Claude Agent SDK

## Development

```bash
npm install
npm run dev        # launch in dev mode
npm run typecheck  # type-check main + renderer
npm run build      # production build
```

## License

MIT
