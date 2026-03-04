import '@testing-library/jest-dom'

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
