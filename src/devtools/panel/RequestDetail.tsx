import React, { useState } from 'react'
import type { CapturedRequest } from './useNetworkCapture'
import { sendMessage, normalizePathname, endpointId } from '../../shared/messaging'
import type { Endpoint, RequestSnapshot } from '../../shared/types'
import { jsonToSchema } from '../../forge/features/schema/schemaGenerator'

type DetailTab = 'response' | 'request' | 'headers'

interface Props {
  request: CapturedRequest
  onClose: () => void
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

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

export default function RequestDetail({ request, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>('response')
  const [copied, setCopied] = useState(false)

  const { meta, responseBody } = request

  const handleSendToForge = () => {
    sendMessage({ type: 'SEND_TO_FORGE', payload: { json: responseBody, meta } })
  }

  const handleGenerateSchema = () => {
    try {
      const schema = jsonToSchema(responseBody, 'draft-07')
      sendMessage({ type: 'SEND_TO_FORGE', payload: { json: schema, meta } })
    } catch {
      // Response body may not be valid JSON
    }
  }

  const handleSaveEndpoint = () => {
    const url = new URL(meta.url)
    const normalized = normalizePathname(url.pathname)
    const id = endpointId(meta.method, normalized)

    const snapshot: RequestSnapshot = {
      id: request.id,
      meta,
      responseBody,
    }

    const endpoint: Endpoint = {
      id,
      method: meta.method,
      domain: url.hostname,
      path: normalized,
      snapshots: [snapshot],
      starred: false,
      lastSeen: meta.timestamp,
    }

    sendMessage({ type: 'SAVE_ENDPOINT', payload: endpoint })
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(responseBody).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'response', label: 'Response' },
    { key: 'request', label: 'Request' },
    { key: 'headers', label: 'Headers' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#181825]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#313244]">
        <span className="text-xs font-mono font-bold" style={{ color: methodColor(meta.method) }}>
          {meta.method}
        </span>
        <span className="text-xs font-mono text-[#cdd6f4] truncate flex-1" title={meta.url}>
          {meta.url}
        </span>
        <button
          onClick={onClose}
          className="text-[#6c7086] hover:text-[#cdd6f4] text-sm px-1"
          title="Close"
        >
          &#x2715;
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-[#313244]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium ${
              tab === t.key
                ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
                : 'text-[#6c7086] hover:text-[#a6adc8]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3">
        {tab === 'response' && (
          <pre className="text-xs font-mono text-[#cdd6f4] whitespace-pre-wrap break-all">
            {formatJson(responseBody)}
          </pre>
        )}

        {tab === 'request' && (
          meta.requestBody ? (
            <pre className="text-xs font-mono text-[#cdd6f4] whitespace-pre-wrap break-all">
              {formatJson(meta.requestBody)}
            </pre>
          ) : (
            <p className="text-xs text-[#6c7086]">(no request body)</p>
          )
        )}

        {tab === 'headers' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-[#a6adc8] mb-1">Response Headers</h3>
              <div className="space-y-0.5">
                {Object.entries(meta.headers).map(([name, value]) => (
                  <div key={name} className="text-xs font-mono">
                    <span className="text-[#89b4fa]">{name}</span>
                    <span className="text-[#6c7086]">: </span>
                    <span className="text-[#cdd6f4]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {meta.requestHeaders && Object.keys(meta.requestHeaders).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#a6adc8] mb-1">Request Headers</h3>
                <div className="space-y-0.5">
                  {Object.entries(meta.requestHeaders).map(([name, value]) => (
                    <div key={name} className="text-xs font-mono">
                      <span className="text-[#cba6f7]">{name}</span>
                      <span className="text-[#6c7086]">: </span>
                      <span className="text-[#cdd6f4]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex gap-2 px-3 py-2 border-t border-[#313244]">
        <button
          onClick={handleSendToForge}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[#89b4fa] text-[#1e1e2e] hover:opacity-90"
        >
          Send to Forge
        </button>
        <button
          onClick={handleGenerateSchema}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[#cba6f7] text-[#1e1e2e] hover:opacity-90"
        >
          Generate Schema
        </button>
        <button
          onClick={handleSaveEndpoint}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[#a6e3a1] text-[#1e1e2e] hover:opacity-90"
        >
          Save Endpoint
        </button>
        <button
          onClick={handleCopyJson}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]"
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
    </div>
  )
}
