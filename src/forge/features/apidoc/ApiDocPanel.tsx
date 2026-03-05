import { useState, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { generateOpenApi, openApiToJson, openApiToYaml } from './openApiGenerator'
import type { Endpoint } from '../../../shared/types'
import { useTheme } from '../../../shared/useTheme'
import { useSettings } from '../../../shared/SettingsProvider'
import { useI18n } from '../../../i18n/i18n'
import { useToast } from '../../../shared/ToastProvider'

interface Props {
  json: string
}

type OutputFormat = 'json' | 'yaml'

export default function ApiDocPanel({ json: _json }: Props) {
  const { monacoTheme } = useTheme()
  const { settings } = useSettings()
  const t = useI18n()
  const toast = useToast()
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState(t('apidoc.title'))
  const [version, setVersion] = useState('1.0.0')
  const [format, setFormat] = useState<OutputFormat>('json')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: 'GET_ENDPOINTS' })
      .then((result: Endpoint[]) => {
        setEndpoints(result ?? [])
        setSelected(new Set((result ?? []).map(ep => ep.id)))
      })
      .catch(() => {
        setEndpoints([])
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleEndpoint = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(endpoints.map(ep => ep.id)))
  const deselectAll = () => setSelected(new Set())

  const generate = useCallback(() => {
    const chosen = endpoints.filter(ep => selected.has(ep.id))
    const spec = generateOpenApi(chosen, { title, version })
    setOutput(format === 'json' ? openApiToJson(spec) : openApiToYaml(spec))
  }, [endpoints, selected, title, version, format])

  const copy = () => {
    if (output) {
      navigator.clipboard.writeText(output)
        .then(() => toast.success(t('common.copied')))
        .catch(() => toast.error(t('common.copyFailed')))
    }
  }

  const download = () => {
    if (!output) return
    const ext = format === 'json' ? 'json' : 'yaml'
    const mimeType = format === 'json' ? 'application/json' : 'text/yaml'
    const blob = new Blob([output], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openapi.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('common.downloaded'))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--jf-text-muted)]">
        {t('common.loading')}
      </div>
    )
  }

  if (endpoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--jf-text-muted)] px-4 text-center">
        {t('apidoc.noEndpoints')}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0 flex-wrap">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t('apidoc.titlePlaceholder')}
          className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border border-[var(--jf-surface-hover)] outline-none w-40"
        />
        <input
          type="text"
          value={version}
          onChange={e => setVersion(e.target.value)}
          placeholder={t('apidoc.versionPlaceholder')}
          className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border border-[var(--jf-surface-hover)] outline-none w-20"
        />
        <select
          value={format}
          onChange={e => setFormat(e.target.value as OutputFormat)}
          className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border border-[var(--jf-surface-hover)] outline-none cursor-pointer"
        >
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
        </select>
        <button
          onClick={generate}
          className="px-3 py-1 text-sm bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded font-medium cursor-pointer hover:bg-[var(--jf-primary-hover)] transition-colors"
        >
          {t('common.generate')}
        </button>
        {output && (
          <>
            <button
              onClick={copy}
              className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] cursor-pointer transition-colors"
            >
              {t('common.copy')}
            </button>
            <button
              onClick={download}
              className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] cursor-pointer transition-colors"
            >
              {t('common.download')}
            </button>
          </>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        {/* Endpoint list */}
        <div className="w-56 bg-[var(--jf-bg-secondary)] border-r border-[var(--jf-border)] overflow-y-auto shrink-0">
          <div className="flex gap-1 px-2 py-1.5 border-b border-[var(--jf-border)]">
            <button
              onClick={selectAll}
              className="text-xs text-[var(--jf-primary)] hover:text-[var(--jf-primary-hover)] cursor-pointer"
            >
              {t('common.selectAll')}
            </button>
            <span className="text-[var(--jf-text-muted)] text-xs">/</span>
            <button
              onClick={deselectAll}
              className="text-xs text-[var(--jf-primary)] hover:text-[var(--jf-primary-hover)] cursor-pointer"
            >
              {t('common.deselectAll')}
            </button>
          </div>
          {endpoints.map(ep => (
            <label
              key={ep.id}
              className="flex items-start gap-2 px-2 py-1.5 hover:bg-[var(--jf-surface)] cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(ep.id)}
                onChange={() => toggleEndpoint(ep.id)}
                className="mt-0.5 accent-[var(--jf-primary)]"
              />
              <span className="min-w-0">
                <span className="text-[var(--jf-primary)] font-mono text-xs mr-1">{ep.method}</span>
                <span className="text-[var(--jf-text)] break-all">{ep.path}</span>
              </span>
            </label>
          ))}
        </div>

        {/* Editor output */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={format === 'json' ? 'json' : 'yaml'}
            value={output}
            theme={monacoTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: settings.fontSize,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  )
}
