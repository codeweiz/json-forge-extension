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
      navigator.clipboard.writeText(JSON.stringify(results.length === 1 ? results[0] : results, null, 2)).catch(console.error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        <input
          type="text"
          value={expression}
          onChange={e => setExpression(e.target.value)}
          placeholder="$.users[*].email"
          className="flex-1 px-3 py-1 bg-[#313244] text-[#cdd6f4] text-sm font-mono rounded border-0 focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
        />
        {results.length > 0 && (
          <>
            <span className="text-[#6c7086] text-sm shrink-0">{results.length} match{results.length !== 1 ? 'es' : ''}</span>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer shrink-0">Copy</button>
          </>
        )}
        {error && <span className="text-[#f38ba8] text-sm truncate">{error}</span>}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {results.length > 0 ? (
          results.map((item, i) => (
            <div key={i} className="flex gap-3 py-1 border-b border-[#1e1e2e] last:border-0">
              <span className="text-[#6c7086] text-sm shrink-0 w-8 text-right">[{i}]</span>
              <pre className="text-sm text-[#cdd6f4] font-mono whitespace-pre-wrap flex-1">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <div className="space-y-3">
            <p className="text-[#6c7086] text-sm">Enter a JSONPath expression above. Examples:</p>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setExpression(ex)}
                className="block font-mono text-sm text-[#89b4fa] hover:text-[#b4d0fe] cursor-pointer"
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
