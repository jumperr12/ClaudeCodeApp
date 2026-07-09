import { useEffect, useRef, useState } from 'react'
import { PERMISSION_MODES, modelLabel, type PromptImage } from '@shared/types'
import { useSessionsStore } from '@/stores/sessions'
import { useUiStore } from '@/stores/ui'
import Icon from '../Icon'
import type { TabState } from '@/lib/chat'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

/** Read a File into a base64 PromptImage; resolves null for unsupported types. */
function fileToImage(file: File): Promise<PromptImage | null> {
  return new Promise((resolve) => {
    if (!ACCEPTED.includes(file.type)) {
      resolve(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const res = String(reader.result)
      const comma = res.indexOf(',')
      resolve({ mediaType: file.type, data: comma >= 0 ? res.slice(comma + 1) : res, name: file.name })
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export default function PromptInput({ tab }: { tab: TabState }): React.JSX.Element {
  const [value, setValue] = useState('')
  const [images, setImages] = useState<PromptImage[]>([])
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sendPrompt = useSessionsStore((s) => s.sendPrompt)
  const interrupt = useSessionsStore((s) => s.interrupt)
  const cycleMode = useSessionsStore((s) => s.cyclePermissionMode)
  const draftInsert = useUiStore((s) => s.draftInsert)
  const consumeDraft = useUiStore((s) => s.consumeDraft)

  // superprompt widget inserts its output here
  useEffect(() => {
    if (draftInsert !== null) {
      const d = consumeDraft()
      if (d !== null) {
        setValue(d)
        ref.current?.focus()
      }
    }
  }, [draftInsert, consumeDraft])

  // auto-resize
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 220) + 'px'
  }, [value])

  const addFiles = async (files: Iterable<File>): Promise<void> => {
    const results = await Promise.all(Array.from(files).map(fileToImage))
    const ok = results.filter((x): x is PromptImage => x !== null)
    if (ok.length) setImages((prev) => [...prev, ...ok])
  }

  const submit = (): void => {
    const text = value
    if (!text.trim() && images.length === 0) return
    const toSend = images
    setValue('')
    setImages([])
    void sendPrompt(tab.id, text, toSend)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      void interrupt(tab.id)
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      void cycleMode(tab.id)
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'))
    if (imgs.length) {
      e.preventDefault()
      void addFiles(imgs)
    }
  }

  const onDrop = (e: React.DragEvent): void => {
    const imgs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (imgs.length) {
      e.preventDefault()
      void addFiles(imgs)
    }
    setDragging(false)
  }

  const modeLabel = PERMISSION_MODES.find((m) => m.id === tab.permissionMode)?.label ?? tab.permissionMode
  const working = tab.status === 'working' || tab.status === 'connecting'

  return (
    <div
      className={`border-t bg-panel px-4 py-2 transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-border'}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((img, i) => (
            <div key={i} className="relative">
              <img
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={img.name ?? 'attachment'}
                className="h-14 w-14 rounded-md border border-border object-cover"
              />
              <button
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 grid place-items-center rounded-full bg-panel2 border border-border text-dim hover:text-bad hover:border-bad"
                title="Remove"
              >
                <Icon name="x" size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <span className="text-accent font-bold pt-1.5 select-none">&gt;</span>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          spellCheck={false}
          placeholder={
            working
              ? 'Claude is working… (Esc to interrupt)'
              : 'Message Claude… (paste, drop, or attach an image)'
          }
          className="flex-1 bg-transparent resize-none outline-none text-bright placeholder:text-dim pt-1.5 leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-4 mt-1 text-[11px] text-dim">
        <button
          className="hover:text-fg flex items-center gap-1"
          title="Shift+Tab — change permission mode"
          onClick={() => void cycleMode(tab.id)}
        >
          <Icon name="chevrons" size={12} /> {modeLabel}
        </button>
        <button
          className="hover:text-fg flex items-center gap-1"
          title="Add attachment — image (or paste / drag & drop)"
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="image" size={12} /> Attach
        </button>
        <span>{modelLabel(tab.model)}</span>
        <span className="ml-auto">Enter to send · Shift+Enter newline · Esc interrupt · Shift+Tab mode</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
