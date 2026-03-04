import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// Mock chrome.storage.local for history tests
const storageData: Record<string, unknown> = {}
const chromeMock = {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: storageData[key] }),
      set: async (data: Record<string, unknown>) => { Object.assign(storageData, data) },
      remove: async (key: string) => { delete storageData[key] },
    },
  },
}
;(globalThis as typeof globalThis & { chrome: typeof chromeMock }).chrome = chromeMock

// Reset chrome storage before every test to prevent cross-test pollution
beforeEach(() => {
  Object.keys(storageData).forEach(k => delete storageData[k])
})
