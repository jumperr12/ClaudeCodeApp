import { create } from 'zustand'
import type { SuperpromptChunk } from '@shared/types'

interface SuperpromptState {
  requestId: string | null
  output: string
  generating: boolean
  error: string | null

  start: (description: string, language: 'pl' | 'en', detail: 'concise' | 'detailed', cwd?: string) => void
  cancel: () => void
  handleChunk: (chunk: SuperpromptChunk) => void
  reset: () => void
}

let reqCounter = 0

export const useSuperpromptStore = create<SuperpromptState>((set, get) => ({
  requestId: null,
  output: '',
  generating: false,
  error: null,

  start: (description, language, detail, cwd) => {
    const requestId = `sp${++reqCounter}-${Date.now()}`
    set({ requestId, output: '', generating: true, error: null })
    void window.api.superpromptGenerate({ requestId, description, language, detail, cwd })
  },

  cancel: () => {
    const id = get().requestId
    if (id) void window.api.superpromptCancel(id)
    set({ generating: false })
  },

  handleChunk: (chunk) => {
    if (chunk.requestId !== get().requestId) return
    set((st) => ({
      output: chunk.delta ? st.output + chunk.delta : st.output,
      generating: chunk.done ? false : st.generating,
      error: chunk.error ?? st.error
    }))
  },

  reset: () => set({ requestId: null, output: '', generating: false, error: null })
}))
