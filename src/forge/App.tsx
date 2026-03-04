import { useEffect, useState, useCallback } from 'react'
import Layout from './components/Layout'
import SplitPane from './components/SplitPane'
import EditorPanel from './features/editor/EditorPanel'
import ToolPanel from './features/workbench/ToolPanel'
import { isValidJson } from './features/editor/jsonUtils'

export default function App() {
  const [value, setValue] = useState<string>('{}')
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback((v: string) => {
    setValue(v)
    setError(isValidJson(v) ? null : 'Invalid JSON')
  }, [])

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get('jf-payload')
        .then((result: Record<string, unknown>) => {
          if (typeof result['jf-payload'] === 'string') {
            handleChange(result['jf-payload'] as string)
            return chrome.storage.local.remove('jf-payload')
          }
        })
        .catch(console.error)
    }
  }, [handleChange])

  return (
    <Layout onHistoryClick={() => {/* wired in Task 6 */}}>
      <SplitPane>
        <EditorPanel value={value} onChange={handleChange} error={error} />
        <ToolPanel json={value} />
      </SplitPane>
    </Layout>
  )
}
