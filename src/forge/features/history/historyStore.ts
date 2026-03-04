export interface HistoryEntry {
  id: string
  timestamp: number
  source: string
  preview: string
  content: string
}

const STORAGE_KEY = 'jf-history'
const MAX_ENTRIES = 50
const MAX_ENTRY_BYTES = 1024 * 1024 // 1 MB

export async function addHistoryEntry(content: string, source: string): Promise<void> {
  if (content.length > MAX_ENTRY_BYTES) return

  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    source,
    preview: content.slice(0, 100),
    content,
  }

  const history = await loadHistory()
  const updated = [entry, ...history].slice(0, MAX_ENTRIES)
  await chrome.storage.local.set({ [STORAGE_KEY]: updated })
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const data = (result as Record<string, unknown>)[STORAGE_KEY]
  return Array.isArray(data) ? (data as HistoryEntry[]) : []
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}
