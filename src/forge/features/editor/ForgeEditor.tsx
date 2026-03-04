import Editor from '@monaco-editor/react'
import { useState, useCallback } from 'react'
import { formatJson, minifyJson, isValidJson, fixJson } from './jsonUtils'

interface Props {
  initialValue: string
}

export default function ForgeEditor({ initialValue }: Props) {
  const [value, setValue] = useState<string>(initialValue || '{}')
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback((v: string) => {
    setError(isValidJson(v) ? null : 'Invalid JSON')
  }, [])

  const handleChange = (v: string | undefined) => {
    const next = v ?? ''
    setValue(next)
    validate(next)
  }

  const format = () => {
    try {
      setValue(formatJson(value))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const minify = () => {
    try {
      setValue(minifyJson(value))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const fix = () => {
    const fixed = fixJson(value)
    setValue(fixed)
    validate(fixed)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        <ToolBtn onClick={format}>Format</ToolBtn>
        <ToolBtn onClick={minify}>Minify</ToolBtn>
        <ToolBtn onClick={fix}>Fix</ToolBtn>
        {error && (
          <span className="ml-auto text-[#f38ba8] text-sm truncate max-w-xs">{error}</span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            tabSize: 2,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  )
}

interface ToolBtnProps {
  onClick: () => void
  children: React.ReactNode
}

function ToolBtn({ onClick, children }: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
    >
      {children}
    </button>
  )
}
