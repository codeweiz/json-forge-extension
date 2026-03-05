import { useEffect, useState } from 'react'
import { useSettings } from './SettingsProvider'
import * as monaco from 'monaco-editor'

let themesRegistered = false

function registerMonacoThemes() {
  if (themesRegistered) return
  themesRegistered = true

  monaco.editor.defineTheme('jf-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '9cdcfe' },
      { token: 'string.value.json', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'keyword', foreground: '569cd6' },
    ],
    colors: {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#cdd6f4',
      'editorLineNumber.foreground': '#6c7086',
      'editor.selectionBackground': '#45475a',
      'editor.lineHighlightBackground': '#313244',
    },
  })

  monaco.editor.defineTheme('jf-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '0451a5' },
      { token: 'string.value.json', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'keyword', foreground: '0000ff' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1e1e2e',
      'editorLineNumber.foreground': '#8a8a9a',
      'editor.selectionBackground': '#add6ff',
      'editor.lineHighlightBackground': '#f5f5f5',
    },
  })
}

function resolveTheme(mode: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (mode !== 'auto') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const { settings } = useSettings()
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(settings.theme))

  useEffect(() => {
    const update = () => {
      const r = resolveTheme(settings.theme)
      setResolved(r)
      document.documentElement.setAttribute('data-theme', r)
    }
    update()

    if (settings.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
  }, [settings.theme])

  useEffect(() => {
    registerMonacoThemes()
  }, [])

  const monacoTheme = resolved === 'dark' ? 'jf-dark' : 'jf-light'

  return { resolved, monacoTheme }
}
