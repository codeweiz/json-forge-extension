import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { generators } from './generators'
import type { CodeGenerator } from './types'
import { useTheme } from '../../../shared/useTheme'
import { useSettings } from '../../../shared/SettingsProvider'

interface Props {
  json: string
}

export default function CodeGenPanel({ json }: Props) {
  const { monacoTheme } = useTheme()
  const { settings } = useSettings()
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
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-b border-[var(--jf-border)] shrink-0">
        <select
          value={selected.name}
          onChange={e => handleLanguageChange(e.target.value)}
          className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border border-[var(--jf-surface-hover)] outline-none cursor-pointer"
        >
          {generators.map(g => (
            <option key={g.name} value={g.name}>{g.name}</option>
          ))}
        </select>
        <button
          onClick={generate}
          className="px-3 py-1 text-sm bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded font-medium cursor-pointer hover:bg-[var(--jf-primary-hover)] transition-colors"
        >
          Generate
        </button>
        {output && (
          <>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] cursor-pointer transition-colors"
            >
              Copy
            </button>
            <button
              onClick={download}
              className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] cursor-pointer transition-colors"
            >
              Download
            </button>
          </>
        )}
        {error && (
          <span className="ml-auto text-[var(--jf-error)] text-sm truncate max-w-xs">{error}</span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={selected.language}
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
