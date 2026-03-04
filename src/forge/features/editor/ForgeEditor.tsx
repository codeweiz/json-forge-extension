import Editor from '@monaco-editor/react'
import { useState, useCallback, useEffect } from 'react'
import { formatJson, minifyJson, isValidJson, fixJson, escapeJson, unescapeJson } from './jsonUtils'
import TabBar from '../../components/TabBar'
import TsGenPanel from '../ts-gen/TsGenPanel'
import ExportBar from './ExportBar'

interface Props {
  initialValue: string
}

export default function ForgeEditor({ initialValue }: Props) {
  const [value, setValue] = useState<string>(initialValue || '{}')
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('editor')

  const validate = useCallback((v: string) => {
    setError(isValidJson(v) ? null : 'Invalid JSON')
  }, [])

  // Sync with async-loaded initialValue (e.g., from chrome.storage.session)
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue)
      validate(initialValue)
    }
  }, [initialValue, validate])

  const tabs = [
    { id: 'editor', label: 'Editor' },
    { id: 'typescript', label: 'TypeScript' },
  ]

  const handleChange = useCallback((v: string | undefined) => {
    const next = v ?? ''
    setValue(next)
    validate(next)
  }, [validate])

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
    try {
      const fixed = fixJson(value)
      setValue(fixed)
      validate(fixed)
    } catch (e) {
      setError(String(e))
    }
  }

  const escape = () => {
    try {
      setValue(escapeJson(value))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  const unescape = () => {
    try {
      setValue(unescapeJson(value))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'editor' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
            <ToolBtn onClick={format}>Format</ToolBtn>
            <ToolBtn onClick={minify}>Minify</ToolBtn>
            <ToolBtn onClick={fix}>Fix</ToolBtn>
            <ToolBtn onClick={escape}>Escape</ToolBtn>
            <ToolBtn onClick={unescape}>Unescape</ToolBtn>
            {error && <span className="ml-2 text-[#f38ba8] text-sm truncate max-w-xs">{error}</span>}
            <div className="ml-auto">
              <ExportBar value={value} />
            </div>
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
      )}
      {activeTab === 'typescript' && <TsGenPanel json={value} />}
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
