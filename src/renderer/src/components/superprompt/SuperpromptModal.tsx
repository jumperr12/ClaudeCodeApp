import { useState } from 'react'
import Modal from '../Modal'
import Icon from '../Icon'
import { useSuperpromptStore } from '@/stores/superprompt'
import { useUiStore } from '@/stores/ui'
import { useActiveTab } from '@/stores/sessions'

export default function SuperpromptModal(): React.JSX.Element {
  const tab = useActiveTab()
  const { output, generating, error, start, cancel, reset } = useSuperpromptStore()
  const setUi = useUiStore((s) => s.set)
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState<'pl' | 'en'>('en')
  const [detail, setDetail] = useState<'concise' | 'detailed'>('detailed')
  const [copied, setCopied] = useState(false)

  const close = (): void => {
    cancel()
    setUi({ superpromptOpen: false })
  }

  const generate = (): void => {
    if (!description.trim() || generating) return
    start(description, language, detail, tab?.cwd ?? undefined)
  }

  const insert = (): void => {
    setUi({ draftInsert: output, superpromptOpen: false })
    reset()
  }

  const copy = (): void => {
    void navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal
      title={<><Icon name="sparkles" size={16} className="text-accent" /> Superprompt — generate a professional prompt</>}
      onClose={close}
      width="820px"
    >
      <div className="space-y-3">
        <div>
          <div className="text-muted text-[12px] mb-1">
            Describe in your own words what you want to use Claude Code for:
          </div>
          <textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate()
            }}
            rows={4}
            placeholder="e.g. I want to build an expense-tracking app in React with charts and CSV export"
            className="w-full bg-panel2 border border-border rounded p-3 outline-none text-bright placeholder:text-dim resize-y focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-4 text-[12px]">
          <label className="flex items-center gap-1.5">
            <span className="text-muted">Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'pl' | 'en')}
              className="bg-panel2 border border-border rounded px-2 py-1 text-fg outline-none"
            >
              <option value="en">English</option>
              <option value="pl">Polish</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted">Detail:</span>
            <select
              value={detail}
              onChange={(e) => setDetail(e.target.value as 'concise' | 'detailed')}
              className="bg-panel2 border border-border rounded px-2 py-1 text-fg outline-none"
            >
              <option value="detailed">detailed</option>
              <option value="concise">concise</option>
            </select>
          </label>
          <button
            onClick={generating ? cancel : generate}
            disabled={!description.trim() && !generating}
            className="ml-auto bg-accent hover:bg-accent-soft disabled:opacity-40 text-bg font-bold rounded px-4 py-1.5 flex items-center gap-1.5"
          >
            {generating ? (
              <>
                <span className="w-2.5 h-2.5 bg-bg rounded-[1px]" /> Stop
              </>
            ) : output ? (
              <>
                <Icon name="refresh" size={14} /> Regenerate
              </>
            ) : (
              <>
                <Icon name="sparkles" size={14} /> Generate (Ctrl+Enter)
              </>
            )}
          </button>
        </div>

        {(output || generating || error) && (
          <div>
            <div className="text-muted text-[12px] mb-1 flex items-center gap-2">
              Generated prompt:
              {generating && <span className="shimmer">writing…</span>}
            </div>
            <pre className="bg-panel2 border border-border rounded p-3 whitespace-pre-wrap text-[12.5px] text-fg max-h-[38vh] overflow-y-auto leading-relaxed">
              {output}
              {generating && <span className="caret" />}
            </pre>
            {error && <div className="text-bad text-[12px] mt-1">Error: {error}</div>}
            <div className="flex gap-2 mt-2">
              <button
                onClick={insert}
                disabled={!output || generating}
                className="bg-accent hover:bg-accent-soft disabled:opacity-40 text-bg font-bold rounded px-4 py-1.5 flex items-center gap-1.5"
              >
                <Icon name="insert" size={14} /> Insert into chat
              </button>
              <button
                onClick={copy}
                disabled={!output}
                className="border border-border hover:border-accent disabled:opacity-40 text-fg rounded px-4 py-1.5 flex items-center gap-1.5"
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
