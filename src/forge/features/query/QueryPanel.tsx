import { useState, useEffect, useCallback } from 'react'
import { runJsonPath } from './queryUtils'
import { isValidJson } from '../editor/jsonUtils'

interface Props {
  json: string
}

const EXAMPLES = [
  '$.users[*].name',
  '$..email',
  '$.data[0]',
  '$.meta.count',
]

export default function QueryPanel({ json }: Props) {
  const [expression, setExpression] = useState<string>('$')
  const [results, setResults] = useState<unknown[]>([])
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(() => {
    if (!expression.trim()) { setResults([]); setError(null); return }
    if (!isValidJson(json)) { setError('Invalid JSON in editor'); return }
    try {
      const r = runJsonPath(json, expression)
      setResults(r)
      setError(null)
    } catch (e) {
      setError(String(e))
      setResults([])
    }
  }, [json, expression])

  // Debounce: run 300ms after expression or json changes
  useEffect(() => {
    const timer = setTimeout(run, 300)
    return () => clearTimeout(timer)
  }, [run])

  const copy = () => {
    if (results.length > 0) {
      navigator.clipboard.writeText(JSON.stringify(results, null, 2)).catch(console.error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0">
        <input
          type="text"
          value={expression}
          onChange={e => setExpression(e.target.value)}
          placeholder="$.users[*].email"
          className="flex-1 px-3 py-1 bg-[var(--jf-surface)] text-[var(--jf-text)] text-sm font-mono rounded border-0 focus:outline-none focus:ring-1 focus:ring-[var(--jf-primary)]"
        />
        {results.length > 0 && (
          <>
            <span className="text-[var(--jf-text-muted)] text-sm shrink-0">{results.length} match{results.length !== 1 ? 'es' : ''}</span>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer shrink-0">Copy</button>
          </>
        )}
        {error && <span className="text-[var(--jf-error)] text-sm truncate">{error}</span>}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {results.length > 0 ? (
          results.map((item, i) => (
            <div key={`${i}-${JSON.stringify(item)}`} className="flex gap-3 py-1 border-b border-[var(--jf-bg)] last:border-0">
              <span className="text-[var(--jf-text-muted)] text-sm shrink-0 w-8 text-right">[{i}]</span>
              <pre className="text-sm text-[var(--jf-text)] font-mono whitespace-pre-wrap flex-1">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <div className="space-y-3">
            <p className="text-[var(--jf-text-muted)] text-sm">Enter a JSONPath expression above. Examples:</p>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setExpression(ex)}
                className="block font-mono text-sm text-[var(--jf-primary)] hover:text-[var(--jf-primary-hover)] cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
