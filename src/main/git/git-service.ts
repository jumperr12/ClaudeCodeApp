import { simpleGit, type SimpleGit } from 'simple-git'
import { watch, type FSWatcher } from 'chokidar'
import { execFile } from 'child_process'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import type { BrowserWindow } from 'electron'
import type { FileDiffPayload, GitPrInfo, GitStatusPayload } from '@shared/types'

function execFileAsync(cmd: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, windowsHide: true, timeout: 15000 }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

interface Subscription {
  cwd: string
  watcher: FSWatcher | null
  git: SimpleGit
  debounce: NodeJS.Timeout | null
}

export class GitService {
  private subs = new Map<string, Subscription>()
  private ghAvailable: boolean | null = null

  constructor(private getWindow: () => BrowserWindow | null) {}

  private async hasGh(): Promise<boolean> {
    if (this.ghAvailable !== null) return this.ghAvailable
    try {
      await execFileAsync(process.platform === 'win32' ? 'gh.exe' : 'gh', ['--version'])
      this.ghAvailable = true
    } catch {
      this.ghAvailable = false
    }
    return this.ghAvailable
  }

  private async prInfo(cwd: string): Promise<GitPrInfo | null> {
    if (!(await this.hasGh())) return null
    try {
      const out = await execFileAsync(
        process.platform === 'win32' ? 'gh.exe' : 'gh',
        ['pr', 'view', '--json', 'number,title,url,state,statusCheckRollup'],
        cwd
      )
      const j = JSON.parse(out)
      let checks: GitPrInfo['checks'] = 'none'
      const rollup: { conclusion?: string; status?: string }[] = j.statusCheckRollup ?? []
      if (rollup.length > 0) {
        if (rollup.some((c) => c.conclusion === 'FAILURE' || c.conclusion === 'ERROR')) checks = 'fail'
        else if (rollup.some((c) => c.status && c.status !== 'COMPLETED')) checks = 'pending'
        else checks = 'pass'
      }
      return { number: j.number, title: j.title, url: j.url, state: j.state, checks }
    } catch {
      return null // no PR for this branch / not a GitHub repo / gh not logged in
    }
  }

  async status(cwd: string): Promise<GitStatusPayload> {
    try {
      const git = simpleGit(cwd)
      if (!(await git.checkIsRepo())) {
        return { isRepo: false, files: [], commits: [] }
      }
      const st = await git.status()
      let commits: GitStatusPayload['commits'] = []
      try {
        const log = await git.log({ maxCount: 10 })
        commits = log.all.map((c) => ({
          hash: c.hash.slice(0, 7),
          message: c.message,
          author: c.author_name,
          date: c.date
        }))
      } catch {
        // empty repo without commits
      }
      const pr = await this.prInfo(cwd)
      return {
        isRepo: true,
        branch: st.current ?? undefined,
        ahead: st.ahead,
        behind: st.behind,
        files: st.files.map((f) => ({ path: f.path, index: f.index, workingDir: f.working_dir })),
        commits,
        pr
      }
    } catch (err) {
      return { isRepo: false, files: [], commits: [], error: String(err) }
    }
  }

  subscribe(tabId: string, cwd: string): void {
    this.unsubscribe(tabId)
    const sub: Subscription = { cwd, watcher: null, git: simpleGit(cwd), debounce: null }
    const gitDir = join(cwd, '.git')
    if (existsSync(gitDir)) {
      try {
        sub.watcher = watch(
          [join(gitDir, 'HEAD'), join(gitDir, 'index'), join(gitDir, 'refs')],
          { ignoreInitial: true, depth: 3 }
        )
        sub.watcher.on('all', () => this.scheduleRefresh(tabId))
      } catch (err) {
        console.error('[git] watcher failed:', err)
      }
    }
    this.subs.set(tabId, sub)
    void this.refresh(tabId)
  }

  private scheduleRefresh(tabId: string): void {
    const sub = this.subs.get(tabId)
    if (!sub) return
    if (sub.debounce) clearTimeout(sub.debounce)
    sub.debounce = setTimeout(() => void this.refresh(tabId), 400)
  }

  async refresh(tabId: string): Promise<void> {
    const sub = this.subs.get(tabId)
    if (!sub) return
    const payload = await this.status(sub.cwd)
    const win = this.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('git:status', { tabId, status: payload })
    }
  }

  unsubscribe(tabId: string): void {
    const sub = this.subs.get(tabId)
    if (sub) {
      if (sub.debounce) clearTimeout(sub.debounce)
      void sub.watcher?.close()
      this.subs.delete(tabId)
    }
  }

  /** Diff of a working-tree file vs HEAD, for click-through from the GitHub panel. */
  async fileDiff(cwd: string, filePath: string): Promise<FileDiffPayload> {
    let oldContent = ''
    try {
      const git = simpleGit(cwd)
      oldContent = await git.show([`HEAD:${filePath.replace(/\\/g, '/')}`])
    } catch {
      oldContent = '' // new file
    }
    let newContent = ''
    try {
      newContent = readFileSync(join(cwd, filePath), 'utf8')
    } catch {
      newContent = '' // deleted file
    }
    return { filePath, oldContent, newContent }
  }

  dispose(): void {
    for (const [tabId] of this.subs) this.unsubscribe(tabId)
  }
}
