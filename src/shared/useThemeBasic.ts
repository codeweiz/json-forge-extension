import { useEffect } from 'react'
import { useSettings } from './SettingsProvider'

function resolveTheme(mode: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (mode !== 'auto') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useThemeBasic() {
  const { settings } = useSettings()

  useEffect(() => {
    const update = () => {
      const r = resolveTheme(settings.theme)
      document.documentElement.setAttribute('data-theme', r)
    }
    update()

    if (settings.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
  }, [settings.theme])
}
