import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'
import type { Settings } from './settings'

const mockStorage: Record<string, unknown> = {}
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((obj: Record<string, unknown>) => {
        Object.assign(mockStorage, obj)
        return Promise.resolve()
      }),
    },
  },
})

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
})

describe('settings', () => {
  it('DEFAULT_SETTINGS has correct defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'auto',
      locale: 'en',
      fontSize: 13,
      tabSize: 2,
      wordWrap: true,
      minimap: false,
    })
  })

  it('loadSettings returns defaults when nothing stored', async () => {
    const s = await loadSettings()
    expect(s).toEqual(DEFAULT_SETTINGS)
  })

  it('loadSettings merges partial stored settings with defaults', async () => {
    mockStorage['jf-settings'] = { theme: 'dark', fontSize: 16 }
    const s = await loadSettings()
    expect(s.theme).toBe('dark')
    expect(s.fontSize).toBe(16)
    expect(s.locale).toBe('en')
  })

  it('saveSettings persists to chrome.storage.local', async () => {
    const custom: Settings = { ...DEFAULT_SETTINGS, theme: 'light', locale: 'zh' }
    await saveSettings(custom)
    expect(mockStorage['jf-settings']).toEqual(custom)
  })
})
