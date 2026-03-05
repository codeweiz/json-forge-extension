import { useState, useCallback, useMemo } from 'react'
import { isValidJson } from '../editor/jsonUtils'
import { useI18n } from '../../../i18n/i18n'
import { useToast } from '../../../shared/ToastProvider'

interface Props {
  json: string
}

export default function MockPanel({ json }: Props) {
  const t = useI18n()
  const toast = useToast()
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number>(5)
  const [loading, setLoading] = useState(false)
  const [schemaMode, setSchemaMode] = useState(false)

  const isArray = useMemo(() => {
    if (!isValidJson(json)) return false
    try { return Array.isArray(JSON.parse(json)) } catch { return false }
  }, [json])

  const generate = useCallback(async () => {
    if (!isValidJson(json)) {
      setError('Invalid JSON in editor')
      return
    }
    setLoading(true)
    try {
      const { Faker, en } = await import('@faker-js/faker')
      const faker = new Faker({ locale: [en] })

      let result: unknown
      if (schemaMode) {
        const { generateMockFromSchema } = await import('./schemaMockGenerator')
        const schema = JSON.parse(json)
        result = generateMockFromSchema(schema, faker)
      } else {
        const { generateMock } = await import('./mockGenerator')
        const parsed: unknown = JSON.parse(json)

        if (Array.isArray(parsed)) {
          const template = parsed[0] ?? {}
          result = Array.from({ length: count }, () => generateMock(template, faker))
        } else {
          result = generateMock(parsed, faker)
        }
      }

      setOutput(JSON.stringify(result, null, 2))
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [json, count, schemaMode])

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
    a.download = 'mock.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('common.downloaded'))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0 flex-wrap">
        {isArray && (
          <label className="flex items-center gap-2 text-sm text-[var(--jf-text)]">
            {t('mock.count')}
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              className="w-16 px-2 py-1 bg-[var(--jf-surface)] rounded text-[var(--jf-text)] border-0"
            />
          </label>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="px-3 py-1 text-sm bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded font-medium cursor-pointer hover:bg-[var(--jf-primary-hover)] transition-colors disabled:opacity-50"
        >
          {loading ? t('mock.generating') : t('mock.regenerate')}
        </button>
        <label className="flex items-center gap-1 text-sm text-[var(--jf-text)]">
          <input type="checkbox" checked={schemaMode} onChange={e => setSchemaMode(e.target.checked)} className="accent-[var(--jf-primary)]" />
          {t('mock.schemaMode')}
        </label>
        {output && (
          <>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer">{t('common.copy')}</button>
            <button onClick={download} className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer">{t('common.download')}</button>
          </>
        )}
        {error && <span className="ml-2 text-[var(--jf-error)] text-sm">{error}</span>}
        {!output && !error && <span className="text-[var(--jf-text-muted)] text-sm">{t('mock.hint')}</span>}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {output && (
          <pre className="text-sm text-[var(--jf-text)] font-mono whitespace-pre-wrap">{output}</pre>
        )}
      </div>
    </div>
  )
}
