import { create } from 'zustand'
import type { AppSettings } from '@shared/types'

interface SettingsState {
  settings: AppSettings | null
  load: () => Promise<void>
  update: (partial: Partial<AppSettings>) => Promise<void>
  setApiKey: (key: string | null) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  load: async () => {
    set({ settings: await window.api.getSettings() })
  },
  update: async (partial) => {
    set({ settings: await window.api.updateSettings(partial) })
  },
  setApiKey: async (key) => {
    await window.api.setApiKey(key)
    set({ settings: await window.api.getSettings() })
  }
}))
