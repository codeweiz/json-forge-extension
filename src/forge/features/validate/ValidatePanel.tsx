import { useState, useCallback, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { validateJson, type ValidationResult } from './schemaValidator'
import { detectBreakingChanges, type ChangeEntry } from './breakingChanges'
import {
  generateAssertions,
  type AssertionFramework,
} from './assertionGenerator'
import type { Endpoint } from '../../../shared/types'

type SubTab = 'validate' | 'compare' | 'assertions'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'validate', label: 'Validate' },
  { id: 'compare', label: 'Compare' },
  { id: 'assertions', label: 'Assertions' },
]

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
  const [subTab, setSubTab] = useState<SubTab>('validate')

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-[#313244] bg-[#181825] shrink-0">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 text-xs transition-colors cursor-pointer ${
              subTab === tab.id
                ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
                : 'text-[#6c7086] hover:text-[#cdd6f4]'
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
      setError('Paste or load a JSON Schema first')
      return
    }

    let schema: object
    try {
      schema = JSON.parse(schemaText) as object
    } catch {
      setError('Schema is not valid JSON')
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
            className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
          >
            Load Schema
          </button>
          <button
            onClick={runValidation}
            className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium cursor-pointer hover:bg-[#b4d0fe] transition-colors"
          >
            Validate
          </button>
        </div>
        {showDropdown && (
          <div className="absolute left-0 top-full mt-1 z-50 w-80 max-h-60 overflow-auto bg-[#181825] border border-[#313244] rounded shadow-lg">
            {endpoints.length === 0 && (
              <p className="p-3 text-sm text-[#6c7086]">
                No endpoints with saved schemas.
              </p>
            )}
            {endpoints.map((ep) => (
              <button
                key={ep.id}
                className="w-full text-left px-3 py-2 text-sm text-[#89b4fa] hover:bg-[#313244] cursor-pointer"
                onClick={() => pickSchema(ep.schema!)}
              >
                {ep.method} {ep.path}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        placeholder="Paste JSON Schema here..."
        value={schemaText}
        onChange={(e) => setSchemaText(e.target.value)}
        className="w-full h-32 p-2 bg-[#181825] border border-[#313244] rounded text-sm text-[#cdd6f4] font-mono resize-none focus:outline-none focus:border-[#89b4fa]"
      />

      {/* Error */}
      {error && <p className="text-[#f38ba8] text-sm">{error}</p>}

      {/* Results */}
      {result && (
        <div className="flex-1 overflow-auto">
          {result.valid ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[#a6e3a1] bg-[#a6e3a1]/10">
              Valid
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-[#f38ba8] bg-[#f38ba8]/10 self-start">
                {result.errors.length} error{result.errors.length !== 1 && 's'}
              </div>
              {result.errors.map((err, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-[#181825] border border-[#313244] text-sm font-mono"
                >
                  <span className="text-[#89b4fa]">{err.path}</span>
                  <span className="text-[#cdd6f4] ml-2">{err.message}</span>
                  {err.expected && (
                    <span className="text-[#6c7086] ml-2">
                      expected: <span className="text-[#a6e3a1]">{err.expected}</span>
                    </span>
                  )}
                  {err.actual && (
                    <span className="text-[#6c7086] ml-2">
                      actual: <span className="text-[#f38ba8]">{err.actual}</span>
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
  const [oldSchemaText, setOldSchemaText] = useState('')
  const [newSchemaText, setNewSchemaText] = useState('')
  const [changes, setChanges] = useState<ChangeEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const severityStyle: Record<string, string> = {
    breaking: 'text-[#f38ba8] bg-[#f38ba8]/10',
    warning: 'text-[#f9e2af] bg-[#f9e2af]/10',
    safe: 'text-[#a6e3a1] bg-[#a6e3a1]/10',
  }

  const runCompare = () => {
    setError(null)
    setChanges([])

    if (!oldSchemaText.trim() || !newSchemaText.trim()) {
      setError('Both schemas are required')
      return
    }

    let oldSchema: object
    let newSchema: object
    try {
      oldSchema = JSON.parse(oldSchemaText) as object
    } catch {
      setError('Old Schema is not valid JSON')
      return
    }
    try {
      newSchema = JSON.parse(newSchemaText) as object
    } catch {
      setError('New Schema is not valid JSON')
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
    navigator.clipboard.writeText(lines.join('\n')).catch(console.error)
  }

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6c7086]">Old Schema</label>
          <textarea
            placeholder="Paste old JSON Schema..."
            value={oldSchemaText}
            onChange={(e) => setOldSchemaText(e.target.value)}
            className="w-full h-32 p-2 bg-[#181825] border border-[#313244] rounded text-sm text-[#cdd6f4] font-mono resize-none focus:outline-none focus:border-[#89b4fa]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6c7086]">New Schema</label>
          <textarea
            placeholder="Paste new JSON Schema..."
            value={newSchemaText}
            onChange={(e) => setNewSchemaText(e.target.value)}
            className="w-full h-32 p-2 bg-[#181825] border border-[#313244] rounded text-sm text-[#cdd6f4] font-mono resize-none focus:outline-none focus:border-[#89b4fa]"
          />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={runCompare}
          className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium cursor-pointer hover:bg-[#b4d0fe] transition-colors"
        >
          Compare
        </button>
        {changes.length > 0 && (
          <button
            onClick={copyReport}
            className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
          >
            Copy Report
          </button>
        )}
        {error && <span className="text-[#f38ba8] text-sm">{error}</span>}
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
                className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold uppercase ${severityStyle[change.severity]}`}
              >
                {change.severity}
              </span>
              <span className="text-[#89b4fa] shrink-0">
                {change.path || '/'}
              </span>
              <span className="text-[#cdd6f4]">{change.message}</span>
            </div>
          ))}
        </div>
      )}

      {changes.length === 0 && !error && (
        <p className="text-[#6c7086] text-sm">
          Paste two schemas and click Compare to detect breaking changes.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mode 3: Generate Assertions                                         */
/* ------------------------------------------------------------------ */
function AssertionsMode({ json }: { json: string }) {
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
    if (output) navigator.clipboard.writeText(output).catch(console.error)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        <select
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value as AssertionFramework)
            setOutput('')
            setError(null)
          }}
          className="px-2 py-1 text-sm bg-[#313244] text-[#cdd6f4] rounded border border-[#45475a] outline-none cursor-pointer"
        >
          {FRAMEWORK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium cursor-pointer hover:bg-[#b4d0fe] transition-colors"
        >
          Generate
        </button>
        {output && (
          <button
            onClick={copy}
            className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
          >
            Copy
          </button>
        )}
        {error && (
          <span className="ml-auto text-[#f38ba8] text-sm truncate max-w-xs">
            {error}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={output}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  )
}
