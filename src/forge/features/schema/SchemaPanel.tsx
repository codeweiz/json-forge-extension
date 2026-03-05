import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { jsonToSchema, SchemaVersion } from './schemaGenerator'
import { isValidJson } from '../editor/jsonUtils'
import { useTheme } from '../../../shared/useTheme'
import { useSettings } from '../../../shared/SettingsProvider'
import { useI18n } from '../../../i18n/i18n'
import { useToast } from '../../../shared/ToastProvider'

interface Props {
  json: string
}

export default function SchemaPanel({ json }: Props) {
  const { monacoTheme } = useTheme()
  const { settings } = useSettings()
  const t = useI18n()
  const toast = useToast()
  const [version, setVersion] = useState<SchemaVersion>('draft-07')
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!json.trim()) {
      setOutput('')
      setError(null)
      return
    }
    if (!isValidJson(json)) {
      setError('Invalid JSON in editor')
      setOutput('')
      return
    }
    try {
      setOutput(jsonToSchema(json, version))
      setError(null)
    } catch (e) {
      setError(String(e))
      setOutput('')
    }
  }, [json, version])

  const copy = () => {
    if (output) {
      navigator.clipboard.writeText(output)
        .then(() => toast.success(t('common.copied')))
        .catch(() => toast.error(t('common.copyFailed')))
    }
  }

  const download = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schema.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('common.downloaded'))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0">
        <select
          value={version}
          onChange={e => setVersion(e.target.value as SchemaVersion)}
          className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border-0 cursor-pointer"
        >
          <option value="draft-07">Draft-07</option>
          <option value="draft-2020-12">Draft-2020-12</option>
        </select>
        {output && (
          <>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer">{t('common.copy')}</button>
            <button onClick={download} className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer">{t('common.download')}</button>
          </>
        )}
        {error && <span className="ml-2 text-[var(--jf-error)] text-sm">{error}</span>}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={output}
          theme={monacoTheme}
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: settings.fontSize, wordWrap: 'on', scrollBeyondLastLine: false }}
        />
      </div>
    </div>
  )
}
