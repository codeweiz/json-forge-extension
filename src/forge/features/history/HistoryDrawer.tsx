import { useEffect, useState } from 'react'
import { loadHistory, clearHistory, HistoryEntry } from './historyStore'

interface Props {
  onLoad: (json: string) => void
  onClose: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (isYesterday) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString()
}

function formatSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export default function HistoryDrawer({ onLoad, onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    loadHistory().then(setEntries)
  }, [])

  const handleClear = async () => {
    await clearHistory()
    setEntries([])
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-10"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 bg-[#1e1e2e] border-l border-[#313244] flex flex-col z-20">
        <div className="flex items-center px-4 py-3 border-b border-[#313244] shrink-0">
          <span className="text-[#cdd6f4] font-medium">History</span>
          <button onClick={onClose} className="ml-auto text-[#6c7086] hover:text-[#cdd6f4] text-lg cursor-pointer">✕</button>
        </div>

        <div className="flex-1 overflow-auto">
          {entries.length === 0 ? (
            <p className="text-[#6c7086] text-sm p-4">No history yet. JSON sessions will appear here.</p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="px-4 py-3 border-b border-[#181825] hover:bg-[#181825] group">
                <div className="text-[#cdd6f4] text-xs font-mono truncate mb-1">{entry.preview}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6c7086] text-xs truncate flex-1" title={entry.source}>{entry.source}</span>
                  <span className="text-[#6c7086] text-xs shrink-0">{formatSize(entry.content)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[#6c7086] text-xs">{formatDate(entry.timestamp)}</span>
                  <button
                    onClick={() => onLoad(entry.content)}
                    className="px-2 py-0.5 text-xs bg-[#313244] hover:bg-[#45475a] rounded text-[#89b4fa] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    Load
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#313244] shrink-0">
          <button
            onClick={handleClear}
            className="text-sm text-[#f38ba8] hover:text-[#f38ba8]/80 cursor-pointer transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </>
  )
}
