import { useState, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { generateOpenApi, openApiToJson, openApiToYaml } from './openApiGenerator'
import type { Endpoint } from '../../../shared/types'

interface Props {
  json: string
}

type OutputFormat = 'json' | 'yaml'

export default function ApiDocPanel({ json: _json }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('API Documentation')
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
    if (output) navigator.clipboard.writeText(output).catch(console.error)
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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#6c7086]">
        Loading endpoints...
      </div>
    )
  }

  if (endpoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#6c7086] px-4 text-center">
        No saved endpoints. Capture API requests in DevTools first.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0 flex-wrap">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="px-2 py-1 text-sm bg-[#313244] text-[#cdd6f4] rounded border border-[#45475a] outline-none w-40"
        />
        <input
          type="text"
          value={version}
          onChange={e => setVersion(e.target.value)}
          placeholder="Version"
          className="px-2 py-1 text-sm bg-[#313244] text-[#cdd6f4] rounded border border-[#45475a] outline-none w-20"
        />
        <select
          value={format}
          onChange={e => setFormat(e.target.value as OutputFormat)}
          className="px-2 py-1 text-sm bg-[#313244] text-[#cdd6f4] rounded border border-[#45475a] outline-none cursor-pointer"
        >
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
        </select>
        <button
          onClick={generate}
          className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium cursor-pointer hover:bg-[#b4d0fe] transition-colors"
        >
          Generate
        </button>
        {output && (
          <>
            <button
              onClick={copy}
              className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] cursor-pointer transition-colors"
            >
              Copy
            </button>
            <button
              onClick={download}
              className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] cursor-pointer transition-colors"
            >
              Download
            </button>
          </>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        {/* Endpoint list */}
        <div className="w-56 bg-[#181825] border-r border-[#313244] overflow-y-auto shrink-0">
          <div className="flex gap-1 px-2 py-1.5 border-b border-[#313244]">
            <button
              onClick={selectAll}
              className="text-xs text-[#89b4fa] hover:text-[#b4d0fe] cursor-pointer"
            >
              Select all
            </button>
            <span className="text-[#6c7086] text-xs">/</span>
            <button
              onClick={deselectAll}
              className="text-xs text-[#89b4fa] hover:text-[#b4d0fe] cursor-pointer"
            >
              Deselect all
            </button>
          </div>
          {endpoints.map(ep => (
            <label
              key={ep.id}
              className="flex items-start gap-2 px-2 py-1.5 hover:bg-[#313244] cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(ep.id)}
                onChange={() => toggleEndpoint(ep.id)}
                className="mt-0.5 accent-[#89b4fa]"
              />
              <span className="min-w-0">
                <span className="text-[#89b4fa] font-mono text-xs mr-1">{ep.method}</span>
                <span className="text-[#cdd6f4] break-all">{ep.path}</span>
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
    </div>
  )
}
