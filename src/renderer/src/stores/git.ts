import { create } from 'zustand'
import type { GitStatusPayload } from '@shared/types'

interface GitState {
  byTab: Record<string, GitStatusPayload>
  setStatus: (tabId: string, status: GitStatusPayload) => void
}

export const useGitStore = create<GitState>((set) => ({
  byTab: {},
  setStatus: (tabId, status) => set((st) => ({ byTab: { ...st.byTab, [tabId]: status } }))
}))
