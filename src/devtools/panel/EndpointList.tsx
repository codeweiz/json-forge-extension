import React, { useState, useEffect, useCallback } from 'react'
import type { Endpoint } from '../../shared/types'
import { useI18n } from '../../i18n/i18n'

interface Props {
  onSelectEndpoint: (endpoint: Endpoint) => void
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-[var(--jf-success)]',
  POST: 'text-[var(--jf-warning)]',
  PUT: 'text-[var(--jf-primary)]',
  PATCH: 'text-[var(--jf-purple)]',
  DELETE: 'text-[var(--jf-error)]',
}

function groupByDomain(endpoints: Endpoint[]): Record<string, Endpoint[]> {
  const groups: Record<string, Endpoint[]> = {}
  for (const ep of endpoints) {
    if (!groups[ep.domain]) {
      groups[ep.domain] = []
    }
    groups[ep.domain].push(ep)
  }
  return groups
}

export default function EndpointList({ onSelectEndpoint }: Props) {
  const t = useI18n()
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchEndpoints = useCallback(() => {
    setLoading(true)
    chrome.runtime.sendMessage({ type: 'GET_ENDPOINTS' }, (response: Endpoint[] | undefined) => {
      setEndpoints(response ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    fetchEndpoints()
  }, [fetchEndpoints])

  const filtered = endpoints.filter((ep) => {
    if (!filter) return true
    const query = filter.toLowerCase()
    return (
      ep.path.toLowerCase().includes(query) ||
      ep.domain.toLowerCase().includes(query) ||
      ep.method.toLowerCase().includes(query)
    )
  })

  const grouped = groupByDomain(filtered)
  const domains = Object.keys(grouped).sort()

  return (
    <div className="flex flex-col h-full bg-[var(--jf-bg)] text-xs text-[var(--jf-text)]">
      {/* Search input */}
      <div className="p-2">
        <input
          type="text"
          placeholder={t('devtools.filterEndpoints')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1.5 rounded bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] text-[var(--jf-text)] placeholder-[var(--jf-text-muted)] text-xs outline-none focus:border-[var(--jf-primary)]"
        />
      </div>

      {/* Endpoint list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-3 py-4 text-center text-[var(--jf-text-muted)]">{t('common.loading')}</p>
        ) : domains.length === 0 ? (
          <p className="px-3 py-4 text-center text-[var(--jf-text-muted)]">
            {t('devtools.noEndpoints')}
          </p>
        ) : (
          domains.map((domain) => (
            <div key={domain}>
              {/* Sticky domain header */}
              <div className="sticky top-0 px-3 py-1.5 bg-[var(--jf-bg-secondary)] text-[var(--jf-text-secondary)] font-semibold border-b border-[var(--jf-border)]">
                {domain}
              </div>

              {/* Endpoint rows */}
              {grouped[domain].map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => onSelectEndpoint(ep)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--jf-surface)] cursor-pointer text-left"
                >
                  {/* Star indicator */}
                  <span className={ep.starred ? 'text-[var(--jf-warning)]' : 'text-[var(--jf-surface)]'}>
                    {'\u2605'}
                  </span>

                  {/* Method badge */}
                  <span
                    className={`font-mono font-semibold w-14 shrink-0 ${METHOD_COLORS[ep.method.toUpperCase()] ?? 'text-[var(--jf-text)]'}`}
                  >
                    {ep.method.toUpperCase()}
                  </span>

                  {/* Path (truncated) */}
                  <span className="truncate flex-1 text-[var(--jf-text)]">{ep.path}</span>

                  {/* Snapshot count */}
                  <span className="shrink-0 text-[var(--jf-text-muted)]">
                    {ep.snapshots.length}&times;
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Refresh button */}
      <div className="p-2 border-t border-[var(--jf-border)]">
        <button
          type="button"
          onClick={fetchEndpoints}
          className="w-full py-1.5 rounded bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] text-[var(--jf-text)] text-xs cursor-pointer"
        >
          {t('common.refresh')}
        </button>
      </div>
    </div>
  )
}
