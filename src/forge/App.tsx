import { useEffect, useState, useCallback } from 'react'
import Layout from './components/Layout'
import SplitPane from './components/SplitPane'
import EditorPanel from './features/editor/EditorPanel'
import ToolPanel from './features/workbench/ToolPanel'
import HistoryDrawer from './features/history/HistoryDrawer'
import SettingsDrawer from './features/settings/SettingsDrawer'
import WelcomeModal from './features/welcome/WelcomeModal'
import { isValidJson, formatJson, minifyJson } from './features/editor/jsonUtils'
import { addHistoryEntry } from './features/history/historyStore'
import { useTheme } from '../shared/useTheme'
import { SHORTCUTS, matchesShortcut } from '../shared/shortcuts'
import { useToast } from '../shared/ToastProvider'
import { useI18n } from '../i18n/i18n'

export default function App() {
  useTheme() // applies data-theme attribute + registers Monaco themes

  const [value, setValue] = useState<string>('{}')
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('schema')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const toast = useToast()
  const t = useI18n()
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
      setSavedFromPayload(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    const timer = setTimeout(() => {
      addHistoryEntry(value, '(pasted)').catch(console.error)
    }, 10000)
    return () => clearTimeout(timer)
  }, [value, savedFromPayload])

  // First-run welcome detection
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get('jf-welcomed').then((result: Record<string, unknown>) => {
        if (!result['jf-welcomed']) {
          setWelcomeOpen(true)
        }
      }).catch(console.error)
    }
  }, [])

  const handleWelcomeComplete = () => {
    setWelcomeOpen(false)
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ 'jf-welcomed': true }).catch(console.error)
    }
  }

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of SHORTCUTS) {
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault()
          switch (shortcut.action) {
            case 'format':
              try { setValue(formatJson(value)) } catch { /* ignore */ }
              break
            case 'minify':
              try { setValue(minifyJson(value)) } catch { /* ignore */ }
              break
            case 'copy':
              navigator.clipboard.writeText(value)
                .then(() => toast.success(t('common.copied')))
                .catch(() => toast.error(t('common.copyFailed')))
              break
            case 'download': {
              const blob = new Blob([value], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = 'data.json'; a.click()
              URL.revokeObjectURL(url)
              toast.success(t('common.downloaded'))
              break
            }
            case 'settings':
              setSettingsOpen(prev => !prev)
              break
            case 'close-drawer':
              setHistoryOpen(false)
              setSettingsOpen(false)
              break
            default:
              if (shortcut.action.startsWith('tab-')) {
                const TAB_IDS = ['schema', 'codegen', 'mock', 'diff', 'query', 'apidoc', 'validate']
                const idx = parseInt(shortcut.action.split('-')[1]) - 1
                if (idx >= 0 && idx < TAB_IDS.length) setActiveTab(TAB_IDS[idx])
              }
          }
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [value, toast, t])

  return (
    <Layout onHistoryClick={() => setHistoryOpen(true)} onSettingsClick={() => setSettingsOpen(true)}>
      <SplitPane>
        <EditorPanel value={value} onChange={handleChange} error={error} />
        <ToolPanel json={value} activeTab={activeTab} onTabChange={setActiveTab} />
      </SplitPane>
      {historyOpen && (
        <HistoryDrawer
          onLoad={(json) => { handleChange(json); setHistoryOpen(false) }}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsDrawer
          onClose={() => setSettingsOpen(false)}
          onShowWelcome={() => {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
              chrome.storage.local.remove('jf-welcomed').catch(console.error)
            }
            setWelcomeOpen(true)
          }}
        />
      )}
      {welcomeOpen && <WelcomeModal onComplete={handleWelcomeComplete} />}
    </Layout>
  )
}
