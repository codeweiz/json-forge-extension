import { createContext, useContext, type ReactNode } from 'react'
import { useSettings } from '../shared/SettingsProvider'
import en from './locales/en.json'
import zh from './locales/zh.json'

type Locale = 'en' | 'zh'

const messages: Record<Locale, Record<string, string>> = { en, zh }

export function translate(key: string, locale: Locale, params?: Record<string, string | number>): string {
  let text = messages[locale]?.[key] ?? messages.en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

type TFn = (key: string, params?: Record<string, string | number>) => string

const I18nContext = createContext<TFn>((key) => key)

export function useI18n(): TFn {
  return useContext(I18nContext)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const t: TFn = (key, params) => translate(key, settings.locale, params)

  return (
    <I18nContext.Provider value={t}>
      {children}
    </I18nContext.Provider>
  )
}
