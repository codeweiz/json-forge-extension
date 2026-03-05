import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { jsonToSchema, SchemaVersion } from './schemaGenerator'
import { isValidJson } from '../editor/jsonUtils'

interface Props {
  json: string
}

export default function SchemaPanel({ json }: Props) {
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
    if (output) navigator.clipboard.writeText(output).catch(console.error)
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
            <button onClick={copy} className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer">Copy</button>
            <button onClick={download} className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer">Download</button>
          </>
        )}
        {error && <span className="ml-2 text-[var(--jf-error)] text-sm">{error}</span>}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={output}
          theme="vs-dark"
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false }}
        />
      </div>
    </div>
  )
}
