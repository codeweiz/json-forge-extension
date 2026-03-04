import Editor from '@monaco-editor/react'
import { useCallback } from 'react'
import { formatJson, minifyJson, fixJson, escapeJson, unescapeJson } from './jsonUtils'
import ExportBar from './ExportBar'

interface Props {
  value: string
  onChange: (v: string) => void
  error: string | null
}

export default function EditorPanel({ value, onChange, error }: Props) {
  const handleEditorChange = useCallback(
    (v: string | undefined) => onChange(v ?? ''),
    [onChange],
  )

  const apply = (fn: (s: string) => string) => {
    try { onChange(fn(value)) } catch { /* ignore invalid JSON */ }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 13, tabSize: 2, wordWrap: 'on', scrollBeyondLastLine: false }}
        />
      </div>
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-t border-[#313244] shrink-0 flex-wrap">
        <ToolBtn onClick={() => apply(formatJson)}>Format</ToolBtn>
        <ToolBtn onClick={() => apply(minifyJson)}>Minify</ToolBtn>
        <ToolBtn onClick={() => apply(fixJson)}>Fix</ToolBtn>
        <ToolBtn onClick={() => apply(escapeJson)}>Escape</ToolBtn>
        <ToolBtn onClick={() => apply(unescapeJson)}>Unescape</ToolBtn>
        {error
          ? <span className="ml-2 text-[#f38ba8] text-sm">{error}</span>
          : <span className="ml-2 text-[#a6e3a1] text-sm">✓ Valid JSON</span>
        }
        <div className="ml-auto">
          <ExportBar value={value} />
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
    >
      {children}
    </button>
  )
}
