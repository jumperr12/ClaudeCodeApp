import type { GitStatusPayload } from '@shared/types'
import type { TabState } from '@/lib/chat'
import Icon, { type IconName } from '../Icon'
import ShaderBackground from '../ShaderBackground'
import { useGitStore } from '@/stores/git'
import { useUiStore } from '@/stores/ui'

function fileBadge(index: string, workingDir: string): { label: string; cls: string } {
  const code = (workingDir.trim() || index.trim() || '?').slice(0, 1)
  switch (code) {
    case 'M':
      return { label: 'M', cls: 'text-warn' }
    case 'A':
      return { label: 'A', cls: 'text-good' }
    case 'D':
      return { label: 'D', cls: 'text-bad' }
    case 'R':
      return { label: 'R', cls: 'text-accent' }
    case '?':
      return { label: 'U', cls: 'text-muted' }
    default:
      return { label: code, cls: 'text-muted' }
  }
}

const CHECK_ICON: Record<string, { icon: IconName; cls: string }> = {
  pass: { icon: 'check', cls: 'text-good' },
  fail: { icon: 'x', cls: 'text-bad' },
  pending: { icon: 'dot', cls: 'text-warn' },
  none: { icon: 'circle', cls: 'text-dim' }
}

export default function GitHubPanel({ tab }: { tab: TabState }): React.JSX.Element {
  const status: GitStatusPayload | undefined = useGitStore((s) => s.byTab[tab.id])
  const setUi = useUiStore((s) => s.set)

  const openFileDiff = async (path: string): Promise<void> => {
    if (!tab.cwd) return
    const diff = await window.api.gitFileDiff(tab.cwd, path)
    setUi({ fileDiff: diff })
  }

  return (
    <div className="w-[300px] shrink-0 border-l border-border bg-panel flex flex-col h-full relative overflow-hidden">
      <ShaderBackground preset="github" opacity={0.42} />
      <div className="relative z-10 flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="text-bright font-bold text-[12px]">GitHub</span>
        <button
          className="ml-auto text-dim hover:text-fg inline-flex"
          title="Refresh"
          onClick={() => tab.cwd && void window.api.gitRefresh(tab.id)}
        >
          <Icon name="refresh" size={14} />
        </button>
      </div>

      {!tab.cwd ? (
        <div className="p-3 text-dim text-[12px]">Open a project folder…</div>
      ) : !status ? (
        <div className="p-3 text-dim text-[12px]">
          <span className="shimmer">Reading repository…</span>
        </div>
      ) : !status.isRepo ? (
        <div className="p-3 text-dim text-[12px]">Not a git repository.</div>
      ) : (
        <div className="flex-1 overflow-y-auto text-[12px]">
          {/* branch */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Icon
                name="git"
                size={13}
                className="shrink-0"
                style={{ color: '#3fb950', filter: 'drop-shadow(0 0 5px rgba(63,185,80,0.45))' }}
              />
              <span
                className="font-semibold truncate"
                style={{ color: '#3fb950', textShadow: '0 0 6px rgba(63,185,80,0.4)' }}
              >
                {status.branch ?? '(detached)'}
              </span>
            </div>
            {(status.ahead ?? 0) + (status.behind ?? 0) > 0 && (
              <div className="text-muted mt-0.5 flex items-center gap-2">
                {status.ahead ? (
                  <span className="flex items-center gap-0.5" title="ahead (to push)">
                    <Icon name="arrowUp" size={11} />
                    {status.ahead}
                  </span>
                ) : null}
                {status.behind ? (
                  <span className="flex items-center gap-0.5" title="behind (to pull)">
                    <Icon name="arrowDown" size={11} />
                    {status.behind}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* PR */}
          <div className="px-3 py-2 border-b border-border">
            <div className="text-dim uppercase text-[10px] tracking-wider mb-1">Pull Request</div>
            {status.pr ? (
              <button
                className="text-left w-full hover:bg-panel2 rounded p-1 -m-1"
                onClick={() => status.pr && void window.api.openExternal(status.pr.url)}
                title="Open PR in browser"
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    name={CHECK_ICON[status.pr.checks].icon}
                    size={13}
                    className={CHECK_ICON[status.pr.checks].cls}
                  />
                  <span className="text-accent">#{status.pr.number}</span>
                  <span className="text-dim">{status.pr.state.toLowerCase()}</span>
                </div>
                <div className="text-fg truncate">{status.pr.title}</div>
              </button>
            ) : (
              <div className="text-dim">no PR for this branch</div>
            )}
          </div>

          {/* changes */}
          <div className="px-3 py-2 border-b border-border">
            <div className="text-dim uppercase text-[10px] tracking-wider mb-1">
              Changes {status.files.length > 0 && `(${status.files.length})`}
            </div>
            {status.files.length === 0 ? (
              <div className="text-dim flex items-center gap-1.5">
                <Icon name="check" size={12} className="text-good" /> clean
              </div>
            ) : (
              status.files.map((f) => {
                const badge = fileBadge(f.index, f.workingDir)
                return (
                  <button
                    key={f.path}
                    className="flex items-center gap-2 w-full text-left hover:bg-panel2 rounded px-1 py-0.5"
                    onClick={() => void openFileDiff(f.path)}
                    title="Show diff vs HEAD"
                  >
                    <span className={`${badge.cls} font-bold w-3`}>{badge.label}</span>
                    <span className="text-fg truncate">{f.path}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* commits */}
          <div className="px-3 py-2">
            <div className="text-dim uppercase text-[10px] tracking-wider mb-1">Recent commits</div>
            {status.commits.length === 0 ? (
              <div className="text-dim">no commits</div>
            ) : (
              status.commits.map((c) => (
                <div key={c.hash} className="py-0.5">
                  <span style={{ color: '#58a6ff', textShadow: '0 0 6px rgba(88,166,255,0.45)' }}>{c.hash}</span>{' '}
                  <span className="text-fg">{c.message.split('\n')[0].slice(0, 60)}</span>
                  <div className="text-dim text-[10.5px]">
                    {c.author} · {new Date(c.date).toLocaleString('en-US')}
                  </div>
                </div>
              ))
            )}
          </div>

          {status.error && <div className="px-3 py-2 text-bad">{status.error}</div>}
        </div>
      )}
      </div>
    </div>
  )
}
