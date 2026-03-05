import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { generators } from './generators'
import type { CodeGenerator } from './types'

interface Props {
  json: string
}

export default function CodeGenPanel({ json }: Props) {
  const [selected, setSelected] = useState<CodeGenerator>(generators[0])
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const generate = () => {
    try {
      const result = selected.generate(json, 'Root')
      setOutput(result)
      setError(null)
    } catch (e) {
      setError(String(e))
      setOutput('')
    }
  }

  const handleLanguageChange = (name: string) => {
    const gen = generators.find(g => g.name === name)
    if (gen) {
      setSelected(gen)
      setOutput('')
      setError(null)
    }
  }

  const copyToClipboard = () => {
    if (output) navigator.clipboard.writeText(output)
  }

  const download = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generated${selected.extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        <select
          value={selected.name}
          onChange={e => handleLanguageChange(e.target.value)}
          className="px-2 py-1 text-sm bg-[#313244] text-[#cdd6f4] rounded border border-[#45475a] outline-none cursor-pointer"
        >
          {generators.map(g => (
            <option key={g.name} value={g.name}>{g.name}</option>
          ))}
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
              onClick={copyToClipboard}
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
        {error && (
          <span className="ml-auto text-[#f38ba8] text-sm truncate max-w-xs">{error}</span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={selected.language}
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
