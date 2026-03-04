import { useState, useEffect } from 'react'
import { computeDiff, DiffEntry } from './diffUtils'
import { isValidJson } from '../editor/jsonUtils'

interface Props {
  json: string
}

const TYPE_STYLES: Record<string, string> = {
  added: 'text-[#a6e3a1]',
  removed: 'text-[#f38ba8]',
  changed: 'text-[#f9e2af]',
  unchanged: 'text-[#6c7086]',
}

const TYPE_ICONS: Record<string, string> = {
  added: '＋',
  removed: '－',
  changed: '～',
  unchanged: '＝',
}

export default function DiffPanel({ json }: Props) {
  const [newJson, setNewJson] = useState<string>('')
  const [entries, setEntries] = useState<DiffEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showUnchanged, setShowUnchanged] = useState(false)

  useEffect(() => {
    if (!newJson.trim()) { setEntries([]); setError(null); return }
    if (!isValidJson(json)) { setEntries([]); setError('Original JSON (editor) is invalid'); return }
    if (!isValidJson(newJson)) { setEntries([]); setError('New JSON is invalid'); return }
    try {
      setEntries(computeDiff(json, newJson))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }, [json, newJson])

  const visible = showUnchanged ? entries : entries.filter(e => e.type !== 'unchanged')
  const summary = entries.reduce(
    (acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  const copyReport = () => {
    const lines = visible.map(e => {
      const icon = TYPE_ICONS[e.type]
      if (e.type === 'changed') return `${icon} ${e.path}: ${JSON.stringify(e.oldValue)} → ${JSON.stringify(e.newValue)}`
      if (e.type === 'added') return `${icon} ${e.path}: ${JSON.stringify(e.newValue)}`
      if (e.type === 'removed') return `${icon} ${e.path}: ${JSON.stringify(e.oldValue)}`
      return `${icon} ${e.path}`
    })
    navigator.clipboard.writeText(lines.join('\n')).catch(console.error)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        {entries.length > 0 && (
          <>
            <span className="text-[#a6e3a1] text-sm">+{summary.added ?? 0}</span>
            <span className="text-[#f38ba8] text-sm">-{summary.removed ?? 0}</span>
            <span className="text-[#f9e2af] text-sm">~{summary.changed ?? 0}</span>
            <label className="flex items-center gap-1 text-sm text-[#6c7086] ml-2 cursor-pointer">
              <input type="checkbox" checked={showUnchanged} onChange={e => setShowUnchanged(e.target.checked)} />
              Show unchanged
            </label>
            <button onClick={copyReport} className="ml-auto px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Copy Report</button>
          </>
        )}
        {error && <span className="text-[#f38ba8] text-sm">{error}</span>}
      </div>

      <div className="p-3 shrink-0">
        <textarea
          placeholder="Paste new JSON here to compare…"
          value={newJson}
          onChange={e => setNewJson(e.target.value)}
          className="w-full h-32 p-2 bg-[#181825] border border-[#313244] rounded text-sm text-[#cdd6f4] font-mono resize-none focus:outline-none focus:border-[#89b4fa]"
        />
      </div>

      <div className="flex-1 overflow-auto px-3 pb-3">
        {visible.map((entry) => (
          <div key={`${entry.type}:${entry.path}`} className={`flex gap-2 py-1 text-sm font-mono ${TYPE_STYLES[entry.type]}`}>
            <span className="shrink-0 w-4">{TYPE_ICONS[entry.type]}</span>
            <span className="font-medium shrink-0">{entry.path}</span>
            {entry.type === 'changed' && (
              <span className="truncate">
                <span className="text-[#f38ba8]">{JSON.stringify(entry.oldValue)}</span>
                <span className="mx-1 text-[#6c7086]">→</span>
                <span className="text-[#a6e3a1]">{JSON.stringify(entry.newValue)}</span>
              </span>
            )}
            {entry.type === 'added' && <span className="truncate">{JSON.stringify(entry.newValue)}</span>}
            {entry.type === 'removed' && <span className="truncate">{JSON.stringify(entry.oldValue)}</span>}
          </div>
        ))}
        {!newJson.trim() && (
          <p className="text-[#6c7086] text-sm">Paste JSON above. The original is pre-filled from the editor.</p>
        )}
      </div>
    </div>
  )
}
