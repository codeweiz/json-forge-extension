import { describe, it, expect } from 'vitest'
import { translate } from './i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'

describe('translate', () => {
  it('returns English translation for known key', () => {
    expect(translate('common.copy', 'en')).toBe('Copy')
  })

  it('returns Chinese translation for known key', () => {
    expect(translate('common.copy', 'zh')).toBe('复制')
  })

  it('returns key itself for unknown key', () => {
    expect(translate('nonexistent.key', 'en')).toBe('nonexistent.key')
  })

  it('interpolates {count} placeholder', () => {
    expect(translate('devtools.requestCount', 'en', { count: 5 })).toBe('5 request(s)')
  })

  it('all en keys exist in zh', () => {
    const enKeys = Object.keys(en)
    const zhKeys = Object.keys(zh)
    for (const key of enKeys) {
      expect(zhKeys).toContain(key)
    }
  })
})
