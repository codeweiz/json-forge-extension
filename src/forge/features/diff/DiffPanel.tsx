import { useState, useEffect, useRef, useCallback } from 'react'
import { computeDiff, DiffEntry } from './diffUtils'
import { isValidJson } from '../editor/jsonUtils'
import type { Endpoint } from '../../../shared/types'
import { useI18n } from '../../../i18n/i18n'
import { useToast } from '../../../shared/ToastProvider'

interface Props {
  json: string
}

const TYPE_STYLES: Record<string, string> = {
  added: 'text-[var(--jf-success)]',
  removed: 'text-[var(--jf-error)]',
  changed: 'text-[var(--jf-warning)]',
  unchanged: 'text-[var(--jf-text-muted)]',
}

const TYPE_ICONS: Record<string, string> = {
  added: '＋',
  removed: '－',
  changed: '～',
  unchanged: '＝',
}

export default function DiffPanel({ json }: Props) {
  const t = useI18n()
  const toast = useToast()
  const [newJson, setNewJson] = useState<string>('')
  const [entries, setEntries] = useState<DiffEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  const openHistory = useCallback(() => {
    if (showHistory) { setShowHistory(false); return }
    chrome.runtime.sendMessage({ type: 'GET_ENDPOINTS' }, (response: { payload: Endpoint[] } | undefined) => {
      setEndpoints(response?.payload ?? [])
      setShowHistory(true)
      setExpandedId(null)
    })
  }, [showHistory])

  useEffect(() => {
    if (!showHistory) return
    const handleClick = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showHistory])

  const pickSnapshot = (body: string) => {
    setNewJson(body)
    setShowHistory(false)
  }

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
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => toast.success(t('common.copied')))
      .catch(() => toast.error(t('common.copyFailed')))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0">
        {entries.length > 0 && (
          <>
            <span className="text-[var(--jf-success)] text-sm">+{summary.added ?? 0}</span>
            <span className="text-[var(--jf-error)] text-sm">-{summary.removed ?? 0}</span>
            <span className="text-[var(--jf-warning)] text-sm">~{summary.changed ?? 0}</span>
            <label className="flex items-center gap-1 text-sm text-[var(--jf-text-muted)] ml-2 cursor-pointer">
              <input type="checkbox" checked={showUnchanged} onChange={e => setShowUnchanged(e.target.checked)} />
              {t('diff.showUnchanged')}
            </label>
            <button onClick={copyReport} className="ml-auto px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer">{t('diff.copyReport')}</button>
          </>
        )}
        {error && <span className="text-[var(--jf-error)] text-sm">{error}</span>}
      </div>

      <div className="p-3 shrink-0">
        <div className="relative mb-2" ref={historyRef}>
          <button
            onClick={openHistory}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
          >
            {t('diff.fromHistory')}
          </button>
          {showHistory && (
            <div className="absolute left-0 top-full mt-1 z-50 w-80 max-h-72 overflow-auto bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] rounded shadow-lg">
              {endpoints.length === 0 && (
                <p className="p-3 text-sm text-[var(--jf-text-muted)]">{t('diff.noEndpoints')}</p>
              )}
              {endpoints.map((ep) => (
                <div key={ep.id}>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-[var(--jf-primary)] font-semibold hover:bg-[var(--jf-surface)] cursor-pointer"
                    onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                  >
                    {ep.method} {ep.path}
                    <span className="ml-1 text-[var(--jf-text-muted)] font-normal">({ep.snapshots.length})</span>
                  </button>
                  {expandedId === ep.id && ep.snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      className="w-full text-left pl-6 pr-3 py-1.5 text-sm text-[var(--jf-text)] hover:bg-[var(--jf-surface)] cursor-pointer"
                      onClick={() => pickSnapshot(snap.responseBody)}
                    >
                      <span className="text-[var(--jf-text-muted)]">{new Date(snap.meta.timestamp).toLocaleString()}</span>
                      <span className="ml-2">{snap.meta.status}</span>
                      <span className="ml-1 text-[var(--jf-text-muted)]">({snap.meta.size}B)</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <textarea
          placeholder={t('diff.pasteNew')}
          value={newJson}
          onChange={e => setNewJson(e.target.value)}
          className="w-full h-32 p-2 bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] rounded text-sm text-[var(--jf-text)] font-mono resize-none focus:outline-none focus:border-[var(--jf-primary)]"
        />
      </div>

      <div className="flex-1 overflow-auto px-3 pb-3">
        {visible.map((entry) => (
          <div key={`${entry.type}:${entry.path}`} className={`flex gap-2 py-1 text-sm font-mono ${TYPE_STYLES[entry.type]}`}>
            <span className="shrink-0 w-4">{TYPE_ICONS[entry.type]}</span>
            <span className="font-medium shrink-0">{entry.path}</span>
            {entry.type === 'changed' && (
              <span className="truncate">
                <span className="text-[var(--jf-error)]">{JSON.stringify(entry.oldValue)}</span>
                <span className="mx-1 text-[var(--jf-text-muted)]">→</span>
                <span className="text-[var(--jf-success)]">{JSON.stringify(entry.newValue)}</span>
              </span>
            )}
            {entry.type === 'added' && <span className="truncate">{JSON.stringify(entry.newValue)}</span>}
            {entry.type === 'removed' && <span className="truncate">{JSON.stringify(entry.oldValue)}</span>}
          </div>
        ))}
        {!newJson.trim() && (
          <p className="text-[var(--jf-text-muted)] text-sm">{t('diff.hint')}</p>
        )}
      </div>
    </div>
  )
}
