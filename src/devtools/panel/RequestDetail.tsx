import React, { useState } from 'react'
import type { CapturedRequest } from './useNetworkCapture'
import { sendMessage, normalizePathname, endpointId } from '../../shared/messaging'
import type { Endpoint, RequestSnapshot } from '../../shared/types'
import { jsonToSchema } from '../../forge/features/schema/schemaGenerator'
import { useI18n } from '../../i18n/i18n'

type DetailTab = 'response' | 'request' | 'headers'

interface Props {
  request: CapturedRequest
  onClose: () => void
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

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

export default function RequestDetail({ request, onClose }: Props) {
  const t = useI18n()
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

  const detailTabs: { key: DetailTab; label: string }[] = [
    { key: 'response', label: t('devtools.response') },
    { key: 'request', label: t('devtools.request') },
    { key: 'headers', label: t('devtools.headers') },
  ]

  return (
    <div className="flex flex-col h-full bg-[var(--jf-bg-secondary)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--jf-border)]">
        <span className="text-xs font-mono font-bold" style={{ color: methodColor(meta.method) }}>
          {meta.method}
        </span>
        <span className="text-xs font-mono text-[var(--jf-text)] truncate flex-1" title={meta.url}>
          {meta.url}
        </span>
        <button
          onClick={onClose}
          className="text-[var(--jf-text-muted)] hover:text-[var(--jf-text)] text-sm px-1"
          title="Close"
        >
          &#x2715;
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-[var(--jf-border)]">
        {detailTabs.map(dt => (
          <button
            key={dt.key}
            onClick={() => setTab(dt.key)}
            className={`px-3 py-1.5 text-xs font-medium ${
              tab === dt.key
                ? 'text-[var(--jf-primary)] border-b-2 border-[var(--jf-primary)]'
                : 'text-[var(--jf-text-muted)] hover:text-[var(--jf-text-secondary)]'
            }`}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3">
        {tab === 'response' && (
          <pre className="text-xs font-mono text-[var(--jf-text)] whitespace-pre-wrap break-all">
            {formatJson(responseBody)}
          </pre>
        )}

        {tab === 'request' && (
          meta.requestBody ? (
            <pre className="text-xs font-mono text-[var(--jf-text)] whitespace-pre-wrap break-all">
              {formatJson(meta.requestBody)}
            </pre>
          ) : (
            <p className="text-xs text-[var(--jf-text-muted)]">{t('devtools.noRequestBody')}</p>
          )
        )}

        {tab === 'headers' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-[var(--jf-text-secondary)] mb-1">{t('devtools.responseHeaders')}</h3>
              <div className="space-y-0.5">
                {Object.entries(meta.headers).map(([name, value]) => (
                  <div key={name} className="text-xs font-mono">
                    <span className="text-[var(--jf-primary)]">{name}</span>
                    <span className="text-[var(--jf-text-muted)]">: </span>
                    <span className="text-[var(--jf-text)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {meta.requestHeaders && Object.keys(meta.requestHeaders).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--jf-text-secondary)] mb-1">{t('devtools.requestHeaders')}</h3>
                <div className="space-y-0.5">
                  {Object.entries(meta.requestHeaders).map(([name, value]) => (
                    <div key={name} className="text-xs font-mono">
                      <span className="text-[var(--jf-purple)]">{name}</span>
                      <span className="text-[var(--jf-text-muted)]">: </span>
                      <span className="text-[var(--jf-text)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex gap-2 px-3 py-2 border-t border-[var(--jf-border)]">
        <button
          onClick={handleSendToForge}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--jf-primary)] text-[var(--jf-primary-text)] hover:opacity-90"
        >
          {t('devtools.sendToForge')}
        </button>
        <button
          onClick={handleGenerateSchema}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--jf-purple)] text-[var(--jf-primary-text)] hover:opacity-90"
        >
          {t('devtools.generateSchema')}
        </button>
        <button
          onClick={handleSaveEndpoint}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--jf-success)] text-[var(--jf-primary-text)] hover:opacity-90"
        >
          {t('devtools.saveEndpoint')}
        </button>
        <button
          onClick={handleCopyJson}
          className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--jf-surface)] text-[var(--jf-text)] hover:bg-[var(--jf-surface-hover)]"
        >
          {copied ? t('common.copied') : t('devtools.copyJson')}
        </button>
      </div>
    </div>
  )
}
