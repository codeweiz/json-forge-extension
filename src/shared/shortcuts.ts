export interface Shortcut {
  key: string
  mod: boolean       // Cmd (Mac) / Ctrl (Win)
  shift?: boolean
  action: string
  labelKey: string   // i18n key
}

export const SHORTCUTS: Shortcut[] = [
  { key: 'f', mod: true, shift: true, action: 'format', labelKey: 'editor.format' },
  { key: 'm', mod: true, shift: true, action: 'minify', labelKey: 'editor.minify' },
  { key: 'c', mod: true, shift: true, action: 'copy', labelKey: 'common.copy' },
  { key: 's', mod: true, action: 'download', labelKey: 'common.download' },
  { key: ',', mod: true, action: 'settings', labelKey: 'settings.title' },
  { key: '1', mod: true, action: 'tab-1', labelKey: 'tabs.schema' },
  { key: '2', mod: true, action: 'tab-2', labelKey: 'tabs.codegen' },
  { key: '3', mod: true, action: 'tab-3', labelKey: 'tabs.mock' },
  { key: '4', mod: true, action: 'tab-4', labelKey: 'tabs.diff' },
  { key: '5', mod: true, action: 'tab-5', labelKey: 'tabs.query' },
  { key: '6', mod: true, action: 'tab-6', labelKey: 'tabs.apiDoc' },
  { key: '7', mod: true, action: 'tab-7', labelKey: 'tabs.validate' },
  { key: 'Escape', mod: false, action: 'close-drawer', labelKey: 'common.close' },
]

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = []
  if (shortcut.mod) parts.push(isMac ? '\u2318' : 'Ctrl')
  if (shortcut.shift) parts.push(isMac ? '\u21E7' : 'Shift')
  parts.push(shortcut.key === 'Escape' ? 'Esc' : shortcut.key.toUpperCase())
  return parts.join(isMac ? '' : '+')
}

export function matchesShortcut(e: KeyboardEvent, shortcut: Shortcut): boolean {
  const modKey = isMac ? e.metaKey : e.ctrlKey
  if (shortcut.mod && !modKey) return false
  if (!shortcut.mod && modKey) return false
  if (shortcut.shift && !e.shiftKey) return false
  if (!shortcut.shift && e.shiftKey && shortcut.mod) return false
  return e.key.toLowerCase() === shortcut.key.toLowerCase()
}
