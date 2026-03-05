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
      <div className="flex gap-2 items-center px-3 py-2 bg-[var(--jf-bg-secondary)] border-t border-[var(--jf-border)] shrink-0 flex-wrap">
        <ToolBtn onClick={() => apply(formatJson)}>Format</ToolBtn>
        <ToolBtn onClick={() => apply(minifyJson)}>Minify</ToolBtn>
        <ToolBtn onClick={() => apply(fixJson)}>Fix</ToolBtn>
        <ToolBtn onClick={() => apply(escapeJson)}>Escape</ToolBtn>
        <ToolBtn onClick={() => apply(unescapeJson)}>Unescape</ToolBtn>
        {error
          ? <span className="ml-2 text-[var(--jf-error)] text-sm truncate max-w-xs">{error}</span>
          : <span className="ml-2 text-[var(--jf-success)] text-sm">✓ Valid JSON</span>
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
      className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
    >
      {children}
    </button>
  )
}
