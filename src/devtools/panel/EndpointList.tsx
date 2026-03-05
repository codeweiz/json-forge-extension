import React, { useState, useEffect, useCallback } from 'react'
import type { Endpoint } from '../../shared/types'

interface Props {
  onSelectEndpoint: (endpoint: Endpoint) => void
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-[#a6e3a1]',
  POST: 'text-[#f9e2af]',
  PUT: 'text-[#89b4fa]',
  PATCH: 'text-[#cba6f7]',
  DELETE: 'text-[#f38ba8]',
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
    <div className="flex flex-col h-full bg-[#1e1e2e] text-xs text-[#cdd6f4]">
      {/* Search input */}
      <div className="p-2">
        <input
          type="text"
          placeholder="Filter endpoints..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1.5 rounded bg-[#181825] border border-[#313244] text-[#cdd6f4] placeholder-[#6c7086] text-xs outline-none focus:border-[#89b4fa]"
        />
      </div>

      {/* Endpoint list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-3 py-4 text-center text-[#6c7086]">Loading...</p>
        ) : domains.length === 0 ? (
          <p className="px-3 py-4 text-center text-[#6c7086]">
            No saved endpoints. Click &quot;Save Endpoint&quot; on a request.
          </p>
        ) : (
          domains.map((domain) => (
            <div key={domain}>
              {/* Sticky domain header */}
              <div className="sticky top-0 px-3 py-1.5 bg-[#181825] text-[#a6adc8] font-semibold border-b border-[#313244]">
                {domain}
              </div>

              {/* Endpoint rows */}
              {grouped[domain].map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => onSelectEndpoint(ep)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#313244] cursor-pointer text-left"
                >
                  {/* Star indicator */}
                  <span className={ep.starred ? 'text-[#f9e2af]' : 'text-[#313244]'}>
                    {'\u2605'}
                  </span>

                  {/* Method badge */}
                  <span
                    className={`font-mono font-semibold w-14 shrink-0 ${METHOD_COLORS[ep.method.toUpperCase()] ?? 'text-[#cdd6f4]'}`}
                  >
                    {ep.method.toUpperCase()}
                  </span>

                  {/* Path (truncated) */}
                  <span className="truncate flex-1 text-[#cdd6f4]">{ep.path}</span>

                  {/* Snapshot count */}
                  <span className="shrink-0 text-[#6c7086]">
                    {ep.snapshots.length}&times;
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Refresh button */}
      <div className="p-2 border-t border-[#313244]">
        <button
          type="button"
          onClick={fetchEndpoints}
          className="w-full py-1.5 rounded bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] text-xs cursor-pointer"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
