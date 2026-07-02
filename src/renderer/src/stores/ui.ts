import { create } from 'zustand'
import type { FileDiffPayload } from '@shared/types'

interface UiState {
  settingsOpen: boolean
  historyOpen: boolean
  dashboardOpen: boolean
  superpromptOpen: boolean
  gitPanelOpen: boolean
  fileDiff: FileDiffPayload | null
  /** Text queued for insertion into the prompt input (from the superprompt widget). */
  draftInsert: string | null

  set: (partial: Partial<UiState>) => void
  toggleGitPanel: () => void
  consumeDraft: () => string | null
}

export const useUiStore = create<UiState>((set, get) => ({
  settingsOpen: false,
  historyOpen: false,
  dashboardOpen: false,
  superpromptOpen: false,
  gitPanelOpen: true,
  fileDiff: null,
  draftInsert: null,

  set: (partial) => set(partial),
  toggleGitPanel: () => set((st) => ({ gitPanelOpen: !st.gitPanelOpen })),
  consumeDraft: () => {
    const d = get().draftInsert
    if (d !== null) set({ draftInsert: null })
    return d
  }
}))
