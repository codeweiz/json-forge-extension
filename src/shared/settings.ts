export interface Settings {
  theme: 'light' | 'dark' | 'auto'
  locale: 'en' | 'zh'
  fontSize: number
  tabSize: 2 | 4
  wordWrap: boolean
  minimap: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  locale: 'en',
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
}

const STORAGE_KEY = 'jf-settings'

export async function loadSettings(): Promise<Settings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return DEFAULT_SETTINGS
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const stored = (result as Record<string, unknown>)[STORAGE_KEY]
  if (stored && typeof stored === 'object') {
    return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) }
  }
  return DEFAULT_SETTINGS
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}
