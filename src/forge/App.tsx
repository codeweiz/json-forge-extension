import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import ForgeEditor from './features/editor/ForgeEditor'

export default function App() {
  const [initialJson, setInitialJson] = useState<string>('')

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      chrome.storage.session.get('jf-payload')
        .then((result: Record<string, unknown>) => {
          if (typeof result['jf-payload'] === 'string') {
            setInitialJson(result['jf-payload'] as string)
            return chrome.storage.session.remove('jf-payload')
          }
        })
        .catch(console.error)
    }
  }, [])

  return (
    <Layout>
      <ForgeEditor initialValue={initialJson} />
    </Layout>
  )
}
