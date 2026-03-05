import { useState, useCallback, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { validateJson, type ValidationResult } from './schemaValidator'
import { detectBreakingChanges, type ChangeEntry } from './breakingChanges'
import {
  generateAssertions,
  type AssertionFramework,
} from './assertionGenerator'
import type { Endpoint } from '../../../shared/types'
import { useTheme } from '../../../shared/useTheme'
import { useSettings } from '../../../shared/SettingsProvider'
import { useI18n } from '../../../i18n/i18n'
import { useToast } from '../../../shared/ToastProvider'

type SubTab = 'validate' | 'compare' | 'assertions'

const FRAMEWORK_OPTIONS: { value: AssertionFramework; label: string }[] = [
  { value: 'jest', label: 'Jest / Vitest' },
  { value: 'chai', label: 'Chai' },
  { value: 'playwright', label: 'Playwright' },
  { value: 'pytest', label: 'pytest' },
]

interface Props {
  json: string
}

export default function ValidatePanel({ json }: Props) {
  const t = useI18n()
  const [subTab, setSubTab] = useState<SubTab>('validate')

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'validate', label: t('validate.validate') },
    { id: 'compare', label: t('validate.compare') },
    { id: 'assertions', label: t('validate.assertions') },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-[var(--jf-border)] bg-[var(--jf-bg-secondary)] shrink-0">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 text-xs transition-colors cursor-pointer ${
              subTab === tab.id
                ? 'text-[var(--jf-primary)] border-b-2 border-[var(--jf-primary)]'
                : 'text-[var(--jf-text-muted)] hover:text-[var(--jf-text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {subTab === 'validate' && <ValidateMode json={json} />}
        {subTab === 'compare' && <CompareMode />}
        {subTab === 'assertions' && <AssertionsMode json={json} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mode 1: Validate                                                    */
/* ------------------------------------------------------------------ */
function ValidateMode({ json }: { json: string }) {
  const t = useI18n()
  const [schemaText, setSchemaText] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  const loadSchemas = useCallback(() => {
    if (showDropdown) {
      setShowDropdown(false)
      return
    }
    chrome.runtime.sendMessage(
      { type: 'GET_ENDPOINTS' },
      (response: { payload: Endpoint[] } | undefined) => {
        const eps = (response?.payload ?? []).filter((ep) => ep.schema != null)
        setEndpoints(eps)
        setShowDropdown(true)
      },
    )
  }, [showDropdown])

  const pickSchema = (schema: object) => {
    setSchemaText(JSON.stringify(schema, null, 2))
    setShowDropdown(false)
    setResult(null)
    setError(null)
  }

  const runValidation = () => {
    setError(null)
    setResult(null)

    if (!schemaText.trim()) {
      setError(t('validate.pasteSchemaFirst'))
      return
    }

    let schema: object
    try {
      schema = JSON.parse(schemaText) as object
    } catch {
      setError(t('validate.schemaInvalid'))
      return
    }

    try {
      setResult(validateJson(json, schema))
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      {/* Schema input area */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2 mb-2">
          <button
            onClick={loadSchemas}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
          >
            {t('validate.loadSchema')}
          </button>
          <button
            onClick={runValidation}
            className="px-3 py-1 text-sm bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded font-medium cursor-pointer hover:bg-[var(--jf-primary-hover)] transition-colors"
          >
            {t('validate.validate')}
          </button>
        </div>
        {showDropdown && (
          <div className="absolute left-0 top-full mt-1 z-50 w-80 max-h-60 overflow-auto bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] rounded shadow-lg">
            {endpoints.length === 0 && (
              <p className="p-3 text-sm text-[var(--jf-text-muted)]">
                {t('validate.noSchemaEndpoints')}
              </p>
            )}
            {endpoints.map((ep) => (
              <button
                key={ep.id}
                className="w-full text-left px-3 py-2 text-sm text-[var(--jf-primary)] hover:bg-[var(--jf-surface)] cursor-pointer"
                onClick={() => pickSchema(ep.schema!)}
              >
                {ep.method} {ep.path}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        placeholder={t('validate.pasteSchema')}
        value={schemaText}
        onChange={(e) => setSchemaText(e.target.value)}
        className="w-full h-32 p-2 bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] rounded text-sm text-[var(--jf-text)] font-mono resize-none focus:outline-none focus:border-[var(--jf-primary)]"
      />

      {/* Error */}
      {error && <p className="text-[var(--jf-error)] text-sm">{error}</p>}

      {/* Results */}
      {result && (
        <div className="flex-1 overflow-auto">
          {result.valid ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[var(--jf-success)]" style={{ backgroundColor: 'color-mix(in srgb, var(--jf-success) 10%, transparent)' }}>
              {t('validate.valid')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[var(--jf-error)] self-start" style={{ backgroundColor: 'color-mix(in srgb, var(--jf-error) 10%, transparent)' }}>
                {t('validate.errorCount', { count: result.errors.length })}
              </div>
              {result.errors.map((err, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] text-sm font-mono"
                >
                  <span className="text-[var(--jf-primary)]">{err.path}</span>
                  <span className="text-[var(--jf-text)] ml-2">{err.message}</span>
                  {err.expected && (
                    <span className="text-[var(--jf-text-muted)] ml-2">
                      expected: <span className="text-[var(--jf-success)]">{err.expected}</span>
                    </span>
                  )}
                  {err.actual && (
                    <span className="text-[var(--jf-text-muted)] ml-2">
                      actual: <span className="text-[var(--jf-error)]">{err.actual}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mode 2: Compare Schemas                                             */
/* ------------------------------------------------------------------ */
function CompareMode() {
  const t = useI18n()
  const toast = useToast()
  const [oldSchemaText, setOldSchemaText] = useState('')
  const [newSchemaText, setNewSchemaText] = useState('')
  const [changes, setChanges] = useState<ChangeEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const severityStyle: Record<string, { text: string; bg: string }> = {
    breaking: { text: 'text-[var(--jf-error)]', bg: 'color-mix(in srgb, var(--jf-error) 10%, transparent)' },
    warning: { text: 'text-[var(--jf-warning)]', bg: 'color-mix(in srgb, var(--jf-warning) 10%, transparent)' },
    safe: { text: 'text-[var(--jf-success)]', bg: 'color-mix(in srgb, var(--jf-success) 10%, transparent)' },
  }

  const runCompare = () => {
    setError(null)
    setChanges([])

    if (!oldSchemaText.trim() || !newSchemaText.trim()) {
      setError(t('validate.bothRequired'))
      return
    }

    let oldSchema: object
    let newSchema: object
    try {
      oldSchema = JSON.parse(oldSchemaText) as object
    } catch {
      setError(t('validate.oldSchemaInvalid'))
      return
    }
    try {
      newSchema = JSON.parse(newSchemaText) as object
    } catch {
      setError(t('validate.newSchemaInvalid'))
      return
    }

    try {
      setChanges(detectBreakingChanges(oldSchema, newSchema))
    } catch (e) {
      setError(String(e))
    }
  }

  const copyReport = () => {
    const lines = changes.map(
      (c) => `[${c.severity.toUpperCase()}] ${c.path || '/'}: ${c.message}`,
    )
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => toast.success(t('common.copied')))
      .catch(() => toast.error(t('common.copyFailed')))
  }

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--jf-text-muted)]">{t('validate.oldSchema')}</label>
          <textarea
            placeholder={t('validate.pasteOldSchema')}
            value={oldSchemaText}
            onChange={(e) => setOldSchemaText(e.target.value)}
            className="w-full h-32 p-2 bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] rounded text-sm text-[var(--jf-text)] font-mono resize-none focus:outline-none focus:border-[var(--jf-primary)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--jf-text-muted)]">{t('validate.newSchema')}</label>
          <textarea
            placeholder={t('validate.pasteNewSchema')}
            value={newSchemaText}
            onChange={(e) => setNewSchemaText(e.target.value)}
            className="w-full h-32 p-2 bg-[var(--jf-bg-secondary)] border border-[var(--jf-border)] rounded text-sm text-[var(--jf-text)] font-mono resize-none focus:outline-none focus:border-[var(--jf-primary)]"
          />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={runCompare}
          className="px-3 py-1 text-sm bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded font-medium cursor-pointer hover:bg-[var(--jf-primary-hover)] transition-colors"
        >
          {t('validate.compare')}
        </button>
        {changes.length > 0 && (
          <button
            onClick={copyReport}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
          >
            {t('diff.copyReport')}
          </button>
        )}
        {error && <span className="text-[var(--jf-error)] text-sm">{error}</span>}
      </div>

      {/* Results */}
      {changes.length > 0 && (
        <div className="flex-1 overflow-auto flex flex-col gap-1">
          {changes.map((change, i) => (
            <div
              key={i}
              className="flex items-start gap-2 py-1.5 px-2 rounded text-sm font-mono"
            >
              <span
                className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold uppercase ${severityStyle[change.severity].text}`}
                style={{ backgroundColor: severityStyle[change.severity].bg }}
              >
                {change.severity}
              </span>
              <span className="text-[var(--jf-primary)] shrink-0">
                {change.path || '/'}
              </span>
              <span className="text-[var(--jf-text)]">{change.message}</span>
            </div>
          ))}
        </div>
      )}

      {changes.length === 0 && !error && (
        <p className="text-[var(--jf-text-muted)] text-sm">
          {t('validate.compareHint')}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mode 3: Generate Assertions                                         */
/* ------------------------------------------------------------------ */
function AssertionsMode({ json }: { json: string }) {
  const t = useI18n()
  const toast = useToast()
  const { monacoTheme } = useTheme()
  const { settings } = useSettings()
  const [framework, setFramework] = useState<AssertionFramework>('jest')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const generate = () => {
    setError(null)
    setOutput('')
    try {
      setOutput(generateAssertions(json, framework))
    } catch (e) {
      setError(String(e))
    }
  }

  const language = framework === 'pytest' ? 'python' : 'javascript'

  const copy = () => {
    if (output) {
      navigator.clipboard.writeText(output)
        .then(() => toast.success(t('common.copied')))
        .catch(() => toast.error(t('common.copyFailed')))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0">
        <select
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value as AssertionFramework)
            setOutput('')
            setError(null)
          }}
          className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border border-[var(--jf-surface-hover)] outline-none cursor-pointer"
        >
          {FRAMEWORK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          className="px-3 py-1 text-sm bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded font-medium cursor-pointer hover:bg-[var(--jf-primary-hover)] transition-colors"
        >
          {t('common.generate')}
        </button>
        {output && (
          <button
            onClick={copy}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
          >
            {t('common.copy')}
          </button>
        )}
        {error && (
          <span className="ml-auto text-[var(--jf-error)] text-sm truncate max-w-xs">
            {error}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
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
  )
}
