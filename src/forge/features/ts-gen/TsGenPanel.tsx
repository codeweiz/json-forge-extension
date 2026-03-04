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
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        <button
          onClick={generate}
          className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium cursor-pointer hover:bg-[#b4d0fe] transition-colors"
        >
          Generate TypeScript
        </button>
        {output && (
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] cursor-pointer transition-colors"
          >
            Copy
          </button>
        )}
        {error && (
          <span className="ml-auto text-[#f38ba8] text-sm truncate max-w-xs">{error}</span>
        )}
        {!error && !output && (
          <span className="text-[#6c7086] text-sm">Click Generate to create TypeScript interfaces from your JSON</span>
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
