import React from 'react'
import type { CapturedRequest } from './useNetworkCapture'

interface Props {
  requests: CapturedRequest[]
  selectedId: string | null
  onSelect: (req: CapturedRequest) => void
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':    return 'var(--jf-success)'
    case 'POST':   return 'var(--jf-warning)'
    case 'PUT':    return 'var(--jf-primary)'
    case 'PATCH':  return 'var(--jf-purple)'
    case 'DELETE': return 'var(--jf-error)'
    default:       return 'var(--jf-text)'
  }
}

function statusColor(status: number): string {
  if (status < 300) return 'var(--jf-success)'
  if (status < 400) return 'var(--jf-warning)'
  return 'var(--jf-error)'
}

function extractPath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatTiming(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export default function RequestList({ requests, selectedId, onSelect }: Props) {
  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--jf-text-muted)] text-sm">
        No JSON requests captured yet.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead className="sticky top-0 bg-[var(--jf-bg-secondary)] z-10">
          <tr className="text-[var(--jf-text-muted)] text-left">
            <th className="px-2 py-1.5 font-medium w-16">Method</th>
            <th className="px-2 py-1.5 font-medium w-14">Status</th>
            <th className="px-2 py-1.5 font-medium">Path</th>
            <th className="px-2 py-1.5 font-medium w-16 text-right">Size</th>
            <th className="px-2 py-1.5 font-medium w-16 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr
              key={req.id}
              onClick={() => onSelect(req)}
              className={`cursor-pointer hover:bg-[var(--jf-surface)] ${
                selectedId === req.id ? 'bg-[var(--jf-surface)]' : ''
              }`}
              style={{ borderBottom: '1px solid color-mix(in srgb, var(--jf-border) 50%, transparent)' }}
            >
              <td className="px-2 py-1" style={{ color: methodColor(req.meta.method) }}>
                {req.meta.method}
              </td>
              <td className="px-2 py-1" style={{ color: statusColor(req.meta.status) }}>
                {req.meta.status}
              </td>
              <td className="px-2 py-1 text-[var(--jf-text)] truncate max-w-[300px]" title={extractPath(req.meta.url)}>
                {extractPath(req.meta.url)}
              </td>
              <td className="px-2 py-1 text-[var(--jf-text-secondary)] text-right">
                {formatSize(req.meta.size)}
              </td>
              <td className="px-2 py-1 text-[var(--jf-text-secondary)] text-right">
                {formatTiming(req.meta.timing)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
