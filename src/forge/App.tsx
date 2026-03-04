import { useEffect, useState, useCallback } from 'react'
import Layout from './components/Layout'
import SplitPane from './components/SplitPane'
import EditorPanel from './features/editor/EditorPanel'
import ToolPanel from './features/workbench/ToolPanel'
import HistoryDrawer from './features/history/HistoryDrawer'
import { isValidJson } from './features/editor/jsonUtils'
import { addHistoryEntry } from './features/history/historyStore'

export default function App() {
  const [value, setValue] = useState<string>('{}')
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Track whether current value was just loaded from the content script payload
  // (to avoid the inactivity auto-save duplicating it as '(pasted)')
  const [savedFromPayload, setSavedFromPayload] = useState(false)

  const handleChange = useCallback((v: string) => {
    setValue(v)
    setError(isValidJson(v) ? null : 'Invalid JSON')
  }, [])

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get('jf-payload')
        .then((result: Record<string, unknown>) => {
          if (typeof result['jf-payload'] === 'string') {
            const json = result['jf-payload'] as string
            handleChange(json)
            // Auto-save to history when opened from a page
            const source = document.referrer || 'extension'
            addHistoryEntry(json, source).catch(console.error)
            setSavedFromPayload(true)
            return chrome.storage.local.remove('jf-payload')
          }
        })
        .catch(console.error)
    }
  }, [handleChange])

  // Auto-save pasted/imported JSON after 10s of inactivity
  // Skip if the current value was just loaded from a content-script payload (already saved above)
  useEffect(() => {
    if (!isValidJson(value) || value === '{}' || savedFromPayload) {
      setSavedFromPayload(false)
      return
    }
    const timer = setTimeout(() => {
      addHistoryEntry(value, '(pasted)').catch(console.error)
    }, 10000)
    return () => clearTimeout(timer)
  }, [value, savedFromPayload])

  return (
    <Layout onHistoryClick={() => setHistoryOpen(true)}>
      <SplitPane>
        <EditorPanel value={value} onChange={handleChange} error={error} />
        <ToolPanel json={value} />
      </SplitPane>
      {historyOpen && (
        <HistoryDrawer
          onLoad={(json) => { handleChange(json); setHistoryOpen(false) }}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </Layout>
  )
}
