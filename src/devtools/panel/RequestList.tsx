import React from 'react'
import type { CapturedRequest } from './useNetworkCapture'

interface Props {
  requests: CapturedRequest[]
  selectedId: string | null
  onSelect: (req: CapturedRequest) => void
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':    return '#a6e3a1'
    case 'POST':   return '#f9e2af'
    case 'PUT':    return '#89b4fa'
    case 'PATCH':  return '#cba6f7'
    case 'DELETE': return '#f38ba8'
    default:       return '#cdd6f4'
  }
}

function statusColor(status: number): string {
  if (status < 300) return '#a6e3a1'
  if (status < 400) return '#f9e2af'
  return '#f38ba8'
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
      <div className="flex items-center justify-center h-full text-[#6c7086] text-sm">
        No JSON requests captured yet.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead className="sticky top-0 bg-[#181825] z-10">
          <tr className="text-[#6c7086] text-left">
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
              className={`cursor-pointer border-b border-[#313244]/50 hover:bg-[#313244]/60 ${
                selectedId === req.id ? 'bg-[#313244]' : ''
              }`}
            >
              <td className="px-2 py-1" style={{ color: methodColor(req.meta.method) }}>
                {req.meta.method}
              </td>
              <td className="px-2 py-1" style={{ color: statusColor(req.meta.status) }}>
                {req.meta.status}
              </td>
              <td className="px-2 py-1 text-[#cdd6f4] truncate max-w-[300px]" title={extractPath(req.meta.url)}>
                {extractPath(req.meta.url)}
              </td>
              <td className="px-2 py-1 text-[#a6adc8] text-right">
                {formatSize(req.meta.size)}
              </td>
              <td className="px-2 py-1 text-[#a6adc8] text-right">
                {formatTiming(req.meta.timing)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
