import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { jsonToTypeScript } from './tsGenerator'

interface Props {
  json: string
}

export default function TsGenPanel({ json }: Props) {
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const generate = () => {
    try {
      const result = jsonToTypeScript(json, 'Root')
      setOutput(result)
      setError(null)
    } catch (e) {
      setError(String(e))
      setOutput('')
    }
  }

  const copyToClipboard = () => {
    if (output) navigator.clipboard.writeText(output)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0">
        <button
          onClick={generate}
          className="px-3 py-1 text-sm bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded font-medium cursor-pointer hover:bg-[var(--jf-primary-hover)] transition-colors"
        >
          Generate TypeScript
        </button>
        {output && (
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] cursor-pointer transition-colors"
          >
            Copy
          </button>
        )}
        {error && (
          <span className="ml-auto text-[var(--jf-error)] text-sm truncate max-w-xs">{error}</span>
        )}
        {!error && !output && (
          <span className="text-[var(--jf-text-muted)] text-sm">Click Generate to create TypeScript interfaces from your JSON</span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="typescript"
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
