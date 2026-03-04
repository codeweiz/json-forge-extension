import { useState, useCallback } from 'react'
import { isValidJson } from '../editor/jsonUtils'

interface Props {
  json: string
}

export default function MockPanel({ json }: Props) {
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number>(5)
  const [loading, setLoading] = useState(false)

  const isArray = isValidJson(json) && Array.isArray(JSON.parse(json))

  const generate = useCallback(async () => {
    if (!isValidJson(json)) {
      setError('Invalid JSON in editor')
      return
    }
    setLoading(true)
    try {
      const [{ Faker, en }, { generateMock }] = await Promise.all([
        import('@faker-js/faker'),
        import('./mockGenerator'),
      ])

      const faker = new Faker({ locale: [en] })
      const parsed: unknown = JSON.parse(json)

      let result: unknown
      if (Array.isArray(parsed)) {
        const template = parsed[0] ?? {}
        result = Array.from({ length: count }, () => generateMock(template, faker))
      } else {
        result = generateMock(parsed, faker)
      }

      setOutput(JSON.stringify(result, null, 2))
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [json, count])

  const copy = () => {
    if (output) navigator.clipboard.writeText(output).catch(console.error)
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
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0 flex-wrap">
        {isArray && (
          <label className="flex items-center gap-2 text-sm text-[#cdd6f4]">
            Count:
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              className="w-16 px-2 py-1 bg-[#313244] rounded text-[#cdd6f4] border-0"
            />
          </label>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium cursor-pointer hover:bg-[#b4d0fe] transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Regenerate'}
        </button>
        {output && (
          <>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Copy</button>
            <button onClick={download} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Download</button>
          </>
        )}
        {error && <span className="ml-2 text-[#f38ba8] text-sm">{error}</span>}
        {!output && !error && <span className="text-[#6c7086] text-sm">Click Regenerate to generate mock data</span>}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {output && (
          <pre className="text-sm text-[#cdd6f4] font-mono whitespace-pre-wrap">{output}</pre>
        )}
      </div>
    </div>
  )
}
