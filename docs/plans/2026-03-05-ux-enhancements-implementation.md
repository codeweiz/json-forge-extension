# UX Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add theme switching (light/dark/auto), i18n (en/zh), toast notifications, keyboard shortcuts, settings panel, and welcome onboarding to JSON Forge.

**Architecture:** Settings stored in `chrome.storage.local` under key `jf-settings`, exposed via React Context (`SettingsProvider`). Theme applied via `data-theme` attribute on `<html>` + CSS custom properties. i18n via React Context (`I18nProvider`) with JSON translation files. Toast via React Context (`ToastProvider`). All contexts wrap both Forge `App` and DevTools `PanelApp`.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4, Monaco Editor, chrome.storage.local, CSS custom properties

---

## Group 1: Settings Infrastructure (Tasks 1–3)

### Task 1: Settings Type + Storage

**Files:**
- Create: `src/shared/settings.ts`
- Test: `src/shared/settings.test.ts`

**Step 1: Write the failing test**

```typescript
// src/shared/settings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'
import type { Settings } from './settings'

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {}
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((obj: Record<string, unknown>) => {
        Object.assign(mockStorage, obj)
        return Promise.resolve()
      }),
    },
  },
})

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
})

describe('settings', () => {
  it('DEFAULT_SETTINGS has correct defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'auto',
      locale: 'en',
      fontSize: 13,
      tabSize: 2,
      wordWrap: true,
      minimap: false,
    })
  })

  it('loadSettings returns defaults when nothing stored', async () => {
    const s = await loadSettings()
    expect(s).toEqual(DEFAULT_SETTINGS)
  })

  it('loadSettings merges partial stored settings with defaults', async () => {
    mockStorage['jf-settings'] = { theme: 'dark', fontSize: 16 }
    const s = await loadSettings()
    expect(s.theme).toBe('dark')
    expect(s.fontSize).toBe(16)
    expect(s.locale).toBe('en') // default
  })

  it('saveSettings persists to chrome.storage.local', async () => {
    const custom: Settings = { ...DEFAULT_SETTINGS, theme: 'light', locale: 'zh' }
    await saveSettings(custom)
    expect(mockStorage['jf-settings']).toEqual(custom)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/settings.test.ts`
Expected: FAIL — module `./settings` not found

**Step 3: Write minimal implementation**

```typescript
// src/shared/settings.ts
export interface Settings {
  theme: 'light' | 'dark' | 'auto'
  locale: 'en' | 'zh'
  fontSize: number
  tabSize: 2 | 4
  wordWrap: boolean
  minimap: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  locale: 'en',
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
}

const STORAGE_KEY = 'jf-settings'

export async function loadSettings(): Promise<Settings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return DEFAULT_SETTINGS
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const stored = (result as Record<string, unknown>)[STORAGE_KEY]
  if (stored && typeof stored === 'object') {
    return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) }
  }
  return DEFAULT_SETTINGS
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/shared/settings.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/shared/settings.ts src/shared/settings.test.ts
git commit -m "feat(settings): add Settings type and chrome.storage persistence"
```

---

### Task 2: SettingsProvider React Context

**Files:**
- Create: `src/shared/SettingsProvider.tsx`

**Step 1: Write the SettingsProvider**

```typescript
// src/shared/SettingsProvider.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from './settings'

interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
})

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next).catch(console.error)
      return next
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}
```

This file has no direct tests — it's a thin Context wrapper. It will be tested via integration with components later.

**Step 2: Commit**

```bash
git add src/shared/SettingsProvider.tsx
git commit -m "feat(settings): add SettingsProvider React context"
```

---

### Task 3: Wire SettingsProvider into Forge + DevTools entry points

**Files:**
- Modify: `src/forge/main.tsx`
- Modify: `src/devtools/panel/main.tsx`

**Step 1: Wrap Forge App with SettingsProvider**

In `src/forge/main.tsx`, add import and wrap:

```typescript
// src/forge/main.tsx
import './monaco-setup'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsProvider } from '../shared/SettingsProvider'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>
)
```

**Step 2: Wrap DevTools PanelApp with SettingsProvider**

In `src/devtools/panel/main.tsx`, add import and wrap:

```typescript
// src/devtools/panel/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import PanelApp from './PanelApp'
import { SettingsProvider } from '../../shared/SettingsProvider'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <PanelApp />
    </SettingsProvider>
  </React.StrictMode>
)
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/forge/main.tsx src/devtools/panel/main.tsx
git commit -m "feat(settings): wire SettingsProvider into Forge and DevTools"
```

---

## Group 2: Theme System (Tasks 4–7)

### Task 4: CSS Custom Properties + Light Theme

**Files:**
- Modify: `src/forge/index.css`
- Modify: `src/devtools/panel/index.css`

**Step 1: Add CSS variables to forge/index.css**

Replace the body styles with CSS custom properties and add light theme:

```css
/* src/forge/index.css */
@import "tailwindcss";

:root {
  --jf-bg: #1e1e2e;
  --jf-bg-secondary: #181825;
  --jf-surface: #313244;
  --jf-surface-hover: #45475a;
  --jf-text: #cdd6f4;
  --jf-text-secondary: #a6adc8;
  --jf-text-muted: #6c7086;
  --jf-primary: #89b4fa;
  --jf-primary-hover: #74c7ec;
  --jf-primary-text: #1e1e2e;
  --jf-success: #a6e3a1;
  --jf-warning: #f9e2af;
  --jf-error: #f38ba8;
  --jf-purple: #cba6f7;
  --jf-syn-key: #9cdcfe;
  --jf-syn-string: #ce9178;
  --jf-syn-number: #b5cea8;
  --jf-syn-boolean: #569cd6;
  --jf-syn-null: #808080;
  --jf-border: #313244;
}

[data-theme="light"] {
  --jf-bg: #ffffff;
  --jf-bg-secondary: #f5f5f5;
  --jf-surface: #e0e0e0;
  --jf-surface-hover: #d0d0d0;
  --jf-text: #1e1e2e;
  --jf-text-secondary: #4a4a5a;
  --jf-text-muted: #8a8a9a;
  --jf-primary: #2563eb;
  --jf-primary-hover: #1d4ed8;
  --jf-primary-text: #ffffff;
  --jf-success: #16a34a;
  --jf-warning: #ca8a04;
  --jf-error: #dc2626;
  --jf-purple: #9333ea;
  --jf-syn-key: #0451a5;
  --jf-syn-string: #a31515;
  --jf-syn-number: #098658;
  --jf-syn-boolean: #0000ff;
  --jf-syn-null: #808080;
  --jf-border: #d0d0d0;
}

body {
  margin: 0;
  background: var(--jf-bg);
  color: var(--jf-text);
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
}

* {
  box-sizing: border-box;
}
```

**Step 2: Add same CSS variables to devtools/panel/index.css**

```css
/* src/devtools/panel/index.css */
@import "tailwindcss";

:root {
  --jf-bg: #1e1e2e;
  --jf-bg-secondary: #181825;
  --jf-surface: #313244;
  --jf-surface-hover: #45475a;
  --jf-text: #cdd6f4;
  --jf-text-secondary: #a6adc8;
  --jf-text-muted: #6c7086;
  --jf-primary: #89b4fa;
  --jf-primary-hover: #74c7ec;
  --jf-primary-text: #1e1e2e;
  --jf-success: #a6e3a1;
  --jf-warning: #f9e2af;
  --jf-error: #f38ba8;
  --jf-purple: #cba6f7;
  --jf-syn-key: #9cdcfe;
  --jf-syn-string: #ce9178;
  --jf-syn-number: #b5cea8;
  --jf-syn-boolean: #569cd6;
  --jf-syn-null: #808080;
  --jf-border: #313244;
}

[data-theme="light"] {
  --jf-bg: #ffffff;
  --jf-bg-secondary: #f5f5f5;
  --jf-surface: #e0e0e0;
  --jf-surface-hover: #d0d0d0;
  --jf-text: #1e1e2e;
  --jf-text-secondary: #4a4a5a;
  --jf-text-muted: #8a8a9a;
  --jf-primary: #2563eb;
  --jf-primary-hover: #1d4ed8;
  --jf-primary-text: #ffffff;
  --jf-success: #16a34a;
  --jf-warning: #ca8a04;
  --jf-error: #dc2626;
  --jf-purple: #9333ea;
  --jf-syn-key: #0451a5;
  --jf-syn-string: #a31515;
  --jf-syn-number: #098658;
  --jf-syn-boolean: #0000ff;
  --jf-syn-null: #808080;
  --jf-border: #d0d0d0;
}

body {
  margin: 0;
  background: var(--jf-bg);
  color: var(--jf-text);
  font-family: system-ui, -apple-system, sans-serif;
}
```

**Step 3: Commit**

```bash
git add src/forge/index.css src/devtools/panel/index.css
git commit -m "feat(theme): add CSS custom properties with dark/light theme definitions"
```

---

### Task 5: Theme Application Hook + Monaco Themes

**Files:**
- Create: `src/shared/useTheme.ts`

**Step 1: Create the useTheme hook**

This hook reads the `theme` setting, listens for `prefers-color-scheme` media query changes when `auto`, and applies `data-theme` attribute on `<html>`. It also defines and returns the correct Monaco theme name.

```typescript
// src/shared/useTheme.ts
import { useEffect, useState } from 'react'
import { useSettings } from './SettingsProvider'
import * as monaco from 'monaco-editor'

// Register custom Monaco themes once
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

  // Register Monaco themes on first use
  useEffect(() => {
    registerMonacoThemes()
  }, [])

  const monacoTheme = resolved === 'dark' ? 'jf-dark' : 'jf-light'

  return { resolved, monacoTheme }
}
```

**Step 2: Commit**

```bash
git add src/shared/useTheme.ts
git commit -m "feat(theme): add useTheme hook with Monaco theme registration and auto detection"
```

---

### Task 6: Migrate All Hardcoded Colors to CSS Variables

This is the largest single task. Replace all `#hexcolor` references in Tailwind classes and inline styles with CSS variable equivalents across all component files.

**Files to modify** (complete list):
- `src/forge/components/Layout.tsx`
- `src/forge/components/TabBar.tsx`
- `src/forge/components/SplitPane.tsx`
- `src/forge/features/editor/EditorPanel.tsx`
- `src/forge/features/editor/ExportBar.tsx`
- `src/forge/features/schema/SchemaPanel.tsx`
- `src/forge/features/codegen/CodeGenPanel.tsx`
- `src/forge/features/mock/MockPanel.tsx`
- `src/forge/features/diff/DiffPanel.tsx`
- `src/forge/features/query/QueryPanel.tsx`
- `src/forge/features/apidoc/ApiDocPanel.tsx`
- `src/forge/features/validate/ValidatePanel.tsx`
- `src/forge/features/history/HistoryDrawer.tsx`
- `src/forge/features/workbench/ToolPanel.tsx` (no colors, but verify)
- `src/devtools/panel/PanelApp.tsx`
- `src/devtools/panel/RequestList.tsx`
- `src/devtools/panel/RequestDetail.tsx`
- `src/devtools/panel/EndpointList.tsx`
- `src/popup/Popup.tsx`
- `src/content/toolbar.ts`
- `src/content/renderer.css`

**Color mapping (find → replace in Tailwind classes):**

| Old Pattern | New Pattern |
|---|---|
| `bg-[#1e1e2e]` | `bg-[var(--jf-bg)]` |
| `bg-[#181825]` | `bg-[var(--jf-bg-secondary)]` |
| `bg-[#313244]` | `bg-[var(--jf-surface)]` |
| `hover:bg-[#45475a]` | `hover:bg-[var(--jf-surface-hover)]` |
| `bg-[#45475a]` | `bg-[var(--jf-surface-hover)]` |
| `text-[#cdd6f4]` | `text-[var(--jf-text)]` |
| `text-[#a6adc8]` | `text-[var(--jf-text-secondary)]` |
| `text-[#6c7086]` | `text-[var(--jf-text-muted)]` |
| `text-[#89b4fa]` | `text-[var(--jf-primary)]` |
| `bg-[#89b4fa]` | `bg-[var(--jf-primary)]` |
| `hover:bg-[#b4d0fe]` | `hover:bg-[var(--jf-primary-hover)]` |
| `hover:text-[#b4d0fe]` | `hover:text-[var(--jf-primary-hover)]` |
| `text-[#1e1e2e]` (on colored bg) | `text-[var(--jf-primary-text)]` |
| `text-[#a6e3a1]` | `text-[var(--jf-success)]` |
| `text-[#f9e2af]` | `text-[var(--jf-warning)]` |
| `text-[#f38ba8]` | `text-[var(--jf-error)]` |
| `bg-[#f38ba8]` | `bg-[var(--jf-error)]` |
| `text-[#cba6f7]` | `text-[var(--jf-purple)]` |
| `bg-[#cba6f7]` | `bg-[var(--jf-purple)]` |
| `bg-[#a6e3a1]` | `bg-[var(--jf-success)]` |
| `border-[#313244]` | `border-[var(--jf-border)]` |
| `border-[#89b4fa]` | `border-[var(--jf-primary)]` |
| `border-[#45475a]` | `border-[var(--jf-surface-hover)]` |
| `border-[#181825]` | `border-[var(--jf-bg-secondary)]` |
| `focus:border-[#89b4fa]` | `focus:border-[var(--jf-primary)]` |
| `focus:ring-[#89b4fa]` | `focus:ring-[var(--jf-primary)]` |
| `accent-[#89b4fa]` | `accent-[var(--jf-primary)]` |
| `placeholder-[#6c7086]` | `placeholder-[var(--jf-text-muted)]` |

**For inline styles** (Popup.tsx, toolbar.ts, RequestList.tsx, RequestDetail.tsx):

| Old | New |
|---|---|
| `'#1e1e2e'` / `'#181825'` etc. | `'var(--jf-bg)'` / `'var(--jf-bg-secondary)'` etc. |

**For renderer.css** — replace hex values with `var(--jf-*)`:

| Old | New |
|---|---|
| `background: #1e1e2e` | `background: var(--jf-bg)` |
| `color: #cdd6f4` | `color: var(--jf-text)` |
| `color: #9cdcfe` | `color: var(--jf-syn-key)` |
| `color: #ce9178` | `color: var(--jf-syn-string)` |
| `color: #b5cea8` | `color: var(--jf-syn-number)` |
| `color: #569cd6` | `color: var(--jf-syn-boolean)` |
| `color: #808080` | `color: var(--jf-syn-null)` |
| `color: #6c7086` | `color: var(--jf-text-muted)` |

**For `methodColor()` functions** in `RequestList.tsx` and `RequestDetail.tsx`:
Replace the hex return values with CSS variable references:
```typescript
function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':    return 'var(--jf-success)'
    case 'POST':   return 'var(--jf-warning)'
    case 'PUT':    return 'var(--jf-primary)'
    case 'PATCH':  return 'var(--jf-purple)'
    case 'DELETE': return 'var(--jf-error)'
    default:       return 'var(--jf-text)'
  }
}
```

Similarly for `statusColor()` in `RequestList.tsx`:
```typescript
function statusColor(status: number): string {
  if (status < 300) return 'var(--jf-success)'
  if (status < 400) return 'var(--jf-warning)'
  return 'var(--jf-error)'
}
```

**For ValidatePanel.tsx** `severityStyle` and `bg-[#color]/10` patterns:
Replace with CSS variable + opacity:
```typescript
const severityStyle: Record<string, string> = {
  breaking: 'text-[var(--jf-error)] bg-[var(--jf-error)]/10',
  warning: 'text-[var(--jf-warning)] bg-[var(--jf-warning)]/10',
  safe: 'text-[var(--jf-success)] bg-[var(--jf-success)]/10',
}
```

Note: Tailwind v4 does not support `bg-[var(--jf-error)]/10` opacity shorthand with CSS variables. Use explicit style instead:
```typescript
// For opacity patterns, replace inline:
// Old: className="text-[#f38ba8] bg-[#f38ba8]/10"
// New: use two separate classes or a style attribute
// Simplest: use Tailwind bg-opacity or just inline style
className="text-[var(--jf-error)]" style={{ backgroundColor: 'color-mix(in srgb, var(--jf-error) 10%, transparent)' }}
```

Actually, Tailwind v4 with arbitrary values handles this as: `bg-[color-mix(in_srgb,var(--jf-error)_10%,transparent)]`. But for readability, keep it simple by adding a utility approach. The simplest approach: just use the Tailwind class without opacity for the background too, since the accent colors work in both themes:
```
// Simplest: keep semantic classes that work in both themes
className="text-[var(--jf-error)] bg-[var(--jf-error)]/10"
```

Test: Tailwind v4 arbitrary values should support `bg-[var(--jf-error)]/10` — if not, fall back to inline style.

**Step 1: Migrate all Forge component colors**

Do all `src/forge/` files first (Layout, TabBar, SplitPane, EditorPanel, ExportBar, HistoryDrawer, SchemaPanel, CodeGenPanel, MockPanel, DiffPanel, QueryPanel, ApiDocPanel, ValidatePanel).

**Step 2: Migrate all DevTools panel colors**

Do all `src/devtools/panel/` files (PanelApp, RequestList, RequestDetail, EndpointList).

**Step 3: Migrate Popup and content script colors**

Do `src/popup/Popup.tsx`, `src/content/toolbar.ts`, `src/content/renderer.css`.

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no color-related warnings

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(theme): migrate all hardcoded colors to CSS custom properties"
```

---

### Task 7: Wire useTheme + Monaco Theme into All Editor Components

**Files:**
- Modify: `src/forge/App.tsx` (add useTheme call)
- Modify: `src/forge/features/editor/EditorPanel.tsx` (use monacoTheme + settings)
- Modify: `src/forge/features/schema/SchemaPanel.tsx`
- Modify: `src/forge/features/codegen/CodeGenPanel.tsx`
- Modify: `src/forge/features/validate/ValidatePanel.tsx` (AssertionsMode)
- Modify: `src/forge/features/apidoc/ApiDocPanel.tsx`

**Step 1: Add useTheme to App.tsx**

```typescript
// In src/forge/App.tsx, add at top of App component:
import { useTheme } from '../shared/useTheme'

export default function App() {
  useTheme() // applies data-theme attribute + registers Monaco themes
  // ... rest unchanged
```

**Step 2: Add useTheme to PanelApp.tsx**

```typescript
// In src/devtools/panel/PanelApp.tsx:
import { useTheme } from '../../shared/useTheme'

export default function PanelApp() {
  useTheme()
  // ... rest unchanged
```

**Step 3: Replace `theme="vs-dark"` with dynamic monacoTheme in all Editor components**

Each editor component needs access to the Monaco theme name. Since `useTheme()` is already called at the App level and registers the themes, components just need the resolved theme name.

Add a simple context export from useTheme, or pass monacoTheme as prop. The simplest approach: each Editor component calls `useTheme()` directly (it's cheap — just reads context + returns string).

In each file with `<Editor theme="vs-dark" ...>`:

```typescript
import { useTheme } from '../../../shared/useTheme'  // adjust path per file
// ... inside component:
const { monacoTheme } = useTheme()
// ... in JSX:
<Editor theme={monacoTheme} ... />
```

Files to update:
- `EditorPanel.tsx`: `theme="vs-dark"` → `theme={monacoTheme}` (import from `../../shared/useTheme`)
- `SchemaPanel.tsx`: same (import from `../../shared/useTheme`)
- `CodeGenPanel.tsx`: same (import from `../../shared/useTheme`)
- `ValidatePanel.tsx` (AssertionsMode): same (import from `../../../shared/useTheme`)
- `ApiDocPanel.tsx`: same (import from `../../../shared/useTheme`)

**Step 4: Wire editor settings (fontSize, tabSize, wordWrap, minimap)**

In `EditorPanel.tsx`, use settings for the main editor:

```typescript
import { useSettings } from '../../shared/SettingsProvider'

// Inside component:
const { settings } = useSettings()

// In Editor options:
options={{
  minimap: { enabled: settings.minimap },
  fontSize: settings.fontSize,
  tabSize: settings.tabSize,
  wordWrap: settings.wordWrap ? 'on' : 'off',
  scrollBeyondLastLine: false,
}}
```

For read-only editors (Schema, CodeGen, Validate, ApiDoc), only use `fontSize` from settings — keep minimap off, wordWrap on.

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(theme): wire useTheme and dynamic Monaco themes into all editors"
```

---

## Group 3: i18n System (Tasks 8–10)

### Task 8: Translation Files

**Files:**
- Create: `src/i18n/locales/en.json`
- Create: `src/i18n/locales/zh.json`

**Step 1: Create English translation file**

```json
{
  "common.copy": "Copy",
  "common.download": "Download",
  "common.generate": "Generate",
  "common.close": "Close",
  "common.copied": "Copied!",
  "common.downloaded": "Downloaded!",
  "common.clear": "Clear",
  "common.refresh": "Refresh",
  "common.search": "Search",
  "common.loading": "Loading...",
  "common.selectAll": "Select all",
  "common.deselectAll": "Deselect all",

  "editor.format": "Format",
  "editor.minify": "Minify",
  "editor.fix": "Fix",
  "editor.escape": "Escape",
  "editor.unescape": "Unescape",
  "editor.validJson": "Valid JSON",
  "editor.invalidJson": "Invalid JSON",

  "tabs.schema": "Schema",
  "tabs.codegen": "CodeGen",
  "tabs.mock": "Mock",
  "tabs.diff": "Diff",
  "tabs.query": "Query",
  "tabs.apiDoc": "API Doc",
  "tabs.validate": "Validate",

  "devtools.title": "JSON Forge",
  "devtools.requests": "Requests",
  "devtools.endpoints": "Endpoints",
  "devtools.recording": "Recording",
  "devtools.paused": "Paused",
  "devtools.requestCount": "{count} request(s)",
  "devtools.savedEndpoints": "Saved endpoints",
  "devtools.noRequests": "No JSON requests captured yet.",
  "devtools.noEndpoints": "No saved endpoints. Click \"Save Endpoint\" on a request.",
  "devtools.sendToForge": "Send to Forge",
  "devtools.generateSchema": "Generate Schema",
  "devtools.saveEndpoint": "Save Endpoint",
  "devtools.copyJson": "Copy JSON",
  "devtools.endpointSaved": "Endpoint saved",
  "devtools.filterEndpoints": "Filter endpoints...",
  "devtools.response": "Response",
  "devtools.request": "Request",
  "devtools.headers": "Headers",
  "devtools.responseHeaders": "Response Headers",
  "devtools.requestHeaders": "Request Headers",
  "devtools.noRequestBody": "(no request body)",

  "forge.title": "JSON Forge",
  "forge.subtitle": "API Developer's JSON Workbench",

  "schema.version": "Version",
  "codegen.language": "Language",
  "mock.regenerate": "Regenerate",
  "mock.generating": "Generating...",
  "mock.schemaMode": "Schema Mode",
  "mock.count": "Count:",
  "mock.hint": "Click Regenerate to generate mock data",
  "diff.pasteNew": "Paste new JSON here to compare...",
  "diff.fromHistory": "From History",
  "diff.showUnchanged": "Show unchanged",
  "diff.copyReport": "Copy Report",
  "diff.hint": "Paste JSON above. The original is pre-filled from the editor.",
  "diff.noEndpoints": "No saved endpoints.",
  "query.placeholder": "Enter JSONPath expression...",
  "query.hint": "Enter a JSONPath expression above. Examples:",
  "query.matchCount": "{count} match(es)",
  "validate.validate": "Validate",
  "validate.compare": "Compare",
  "validate.assertions": "Assertions",
  "validate.loadSchema": "Load Schema",
  "validate.valid": "Valid",
  "validate.errorCount": "{count} error(s)",
  "validate.noSchemaEndpoints": "No endpoints with saved schemas.",
  "validate.pasteSchema": "Paste JSON Schema here...",
  "validate.pasteSchemaFirst": "Paste or load a JSON Schema first",
  "validate.schemaInvalid": "Schema is not valid JSON",
  "validate.oldSchema": "Old Schema",
  "validate.newSchema": "New Schema",
  "validate.pasteOldSchema": "Paste old JSON Schema...",
  "validate.pasteNewSchema": "Paste new JSON Schema...",
  "validate.bothRequired": "Both schemas are required",
  "validate.oldSchemaInvalid": "Old Schema is not valid JSON",
  "validate.newSchemaInvalid": "New Schema is not valid JSON",
  "validate.compareHint": "Paste two schemas and click Compare to detect breaking changes.",

  "apidoc.title": "API Documentation",
  "apidoc.version": "1.0.0",
  "apidoc.titlePlaceholder": "Title",
  "apidoc.versionPlaceholder": "Version",
  "apidoc.noEndpoints": "No saved endpoints. Capture API requests in DevTools first.",

  "history.title": "History",
  "history.noHistory": "No history yet. JSON sessions will appear here.",
  "history.load": "Load",
  "history.clearAll": "Clear All",

  "settings.title": "Settings",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.themeAuto": "Auto",
  "settings.language": "Language",
  "settings.editor": "Editor",
  "settings.fontSize": "Font Size",
  "settings.tabSize": "Tab Size",
  "settings.wordWrap": "Word Wrap",
  "settings.minimap": "Minimap",
  "settings.shortcuts": "Keyboard Shortcuts",
  "settings.about": "About",
  "settings.version": "Version",
  "settings.showWelcome": "Show Welcome Guide",

  "popup.openForge": "Open Forge",
  "popup.hint": "Visit any JSON URL to auto-render",

  "welcome.title": "Welcome to JSON Forge",
  "welcome.step1Title": "Your API Workbench",
  "welcome.step1Desc": "Format, validate, and transform JSON right in your browser.",
  "welcome.step2Title": "Capture API Traffic",
  "welcome.step2Desc": "Open DevTools and switch to the JSON Forge tab to capture live API requests.",
  "welcome.step3Title": "7 Powerful Tools",
  "welcome.step3Desc": "Schema, CodeGen, Mock, Diff, Query, API Doc, and Validate — all in one place.",
  "welcome.getStarted": "Get Started",
  "welcome.next": "Next",
  "welcome.back": "Back"
}
```

**Step 2: Create Chinese translation file**

```json
{
  "common.copy": "复制",
  "common.download": "下载",
  "common.generate": "生成",
  "common.close": "关闭",
  "common.copied": "已复制！",
  "common.downloaded": "已下载！",
  "common.clear": "清空",
  "common.refresh": "刷新",
  "common.search": "搜索",
  "common.loading": "加载中...",
  "common.selectAll": "全选",
  "common.deselectAll": "取消全选",

  "editor.format": "格式化",
  "editor.minify": "压缩",
  "editor.fix": "修复",
  "editor.escape": "转义",
  "editor.unescape": "反转义",
  "editor.validJson": "有效 JSON",
  "editor.invalidJson": "无效 JSON",

  "tabs.schema": "Schema",
  "tabs.codegen": "代码生成",
  "tabs.mock": "Mock",
  "tabs.diff": "对比",
  "tabs.query": "查询",
  "tabs.apiDoc": "API 文档",
  "tabs.validate": "校验",

  "devtools.title": "JSON Forge",
  "devtools.requests": "请求",
  "devtools.endpoints": "端点",
  "devtools.recording": "录制中",
  "devtools.paused": "已暂停",
  "devtools.requestCount": "{count} 个请求",
  "devtools.savedEndpoints": "已保存的端点",
  "devtools.noRequests": "暂无捕获的 JSON 请求。",
  "devtools.noEndpoints": "暂无保存的端点。请在请求上点击「保存端点」。",
  "devtools.sendToForge": "发送到 Forge",
  "devtools.generateSchema": "生成 Schema",
  "devtools.saveEndpoint": "保存端点",
  "devtools.copyJson": "复制 JSON",
  "devtools.endpointSaved": "端点已保存",
  "devtools.filterEndpoints": "筛选端点...",
  "devtools.response": "响应",
  "devtools.request": "请求",
  "devtools.headers": "请求头",
  "devtools.responseHeaders": "响应头",
  "devtools.requestHeaders": "请求头",
  "devtools.noRequestBody": "（无请求体）",

  "forge.title": "JSON Forge",
  "forge.subtitle": "API 开发者的 JSON 工作台",

  "schema.version": "版本",
  "codegen.language": "语言",
  "mock.regenerate": "重新生成",
  "mock.generating": "生成中...",
  "mock.schemaMode": "Schema 模式",
  "mock.count": "数量：",
  "mock.hint": "点击「重新生成」以生成 Mock 数据",
  "diff.pasteNew": "在此粘贴新 JSON 进行对比...",
  "diff.fromHistory": "历史记录",
  "diff.showUnchanged": "显示未变更",
  "diff.copyReport": "复制报告",
  "diff.hint": "在上方粘贴 JSON，左侧编辑器内容将作为原始数据。",
  "diff.noEndpoints": "暂无保存的端点。",
  "query.placeholder": "输入 JSONPath 表达式...",
  "query.hint": "在上方输入 JSONPath 表达式。示例：",
  "query.matchCount": "{count} 个匹配",
  "validate.validate": "校验",
  "validate.compare": "对比",
  "validate.assertions": "断言",
  "validate.loadSchema": "加载 Schema",
  "validate.valid": "有效",
  "validate.errorCount": "{count} 个错误",
  "validate.noSchemaEndpoints": "暂无包含 Schema 的端点。",
  "validate.pasteSchema": "在此粘贴 JSON Schema...",
  "validate.pasteSchemaFirst": "请先粘贴或加载 JSON Schema",
  "validate.schemaInvalid": "Schema 不是有效的 JSON",
  "validate.oldSchema": "旧 Schema",
  "validate.newSchema": "新 Schema",
  "validate.pasteOldSchema": "粘贴旧的 JSON Schema...",
  "validate.pasteNewSchema": "粘贴新的 JSON Schema...",
  "validate.bothRequired": "两个 Schema 都是必填的",
  "validate.oldSchemaInvalid": "旧 Schema 不是有效的 JSON",
  "validate.newSchemaInvalid": "新 Schema 不是有效的 JSON",
  "validate.compareHint": "粘贴两个 Schema 并点击「对比」来检测破坏性变更。",

  "apidoc.title": "API 文档",
  "apidoc.version": "1.0.0",
  "apidoc.titlePlaceholder": "标题",
  "apidoc.versionPlaceholder": "版本",
  "apidoc.noEndpoints": "暂无保存的端点。请先在 DevTools 中捕获 API 请求。",

  "history.title": "历史记录",
  "history.noHistory": "暂无历史记录。JSON 编辑内容将自动保存在此处。",
  "history.load": "加载",
  "history.clearAll": "清空全部",

  "settings.title": "设置",
  "settings.appearance": "外观",
  "settings.theme": "主题",
  "settings.themeLight": "浅色",
  "settings.themeDark": "深色",
  "settings.themeAuto": "自动",
  "settings.language": "语言",
  "settings.editor": "编辑器",
  "settings.fontSize": "字号",
  "settings.tabSize": "缩进",
  "settings.wordWrap": "自动换行",
  "settings.minimap": "缩略图",
  "settings.shortcuts": "快捷键",
  "settings.about": "关于",
  "settings.version": "版本",
  "settings.showWelcome": "显示欢迎引导",

  "popup.openForge": "打开 Forge",
  "popup.hint": "访问任意 JSON 链接即可自动渲染",

  "welcome.title": "欢迎使用 JSON Forge",
  "welcome.step1Title": "你的 API 工作台",
  "welcome.step1Desc": "在浏览器中直接格式化、校验和转换 JSON。",
  "welcome.step2Title": "捕获 API 流量",
  "welcome.step2Desc": "打开 DevTools，切换到 JSON Forge 标签页即可捕获实时 API 请求。",
  "welcome.step3Title": "7 大工具",
  "welcome.step3Desc": "Schema、代码生成、Mock、Diff、查询、API 文档、校验 —— 一应俱全。",
  "welcome.getStarted": "开始使用",
  "welcome.next": "下一步",
  "welcome.back": "上一步"
}
```

**Step 3: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json
git commit -m "feat(i18n): add English and Chinese translation files"
```

---

### Task 9: I18nProvider + useI18n Hook

**Files:**
- Create: `src/i18n/i18n.tsx`
- Test: `src/i18n/i18n.test.ts`

**Step 1: Write the failing test**

```typescript
// src/i18n/i18n.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/i18n/i18n.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/i18n/i18n.tsx
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/i18n/i18n.test.ts`
Expected: 5 tests PASS

**Step 5: Wire I18nProvider into entry points**

In `src/forge/main.tsx`, wrap with I18nProvider (inside SettingsProvider):

```typescript
import { I18nProvider } from '../i18n/i18n'
// ...
<SettingsProvider>
  <I18nProvider>
    <App />
  </I18nProvider>
</SettingsProvider>
```

In `src/devtools/panel/main.tsx`:

```typescript
import { I18nProvider } from '../../i18n/i18n'
// ...
<SettingsProvider>
  <I18nProvider>
    <PanelApp />
  </I18nProvider>
</SettingsProvider>
```

**Step 6: Commit**

```bash
git add src/i18n/i18n.tsx src/i18n/i18n.test.ts src/forge/main.tsx src/devtools/panel/main.tsx
git commit -m "feat(i18n): add I18nProvider, useI18n hook, and wire into entry points"
```

---

### Task 10: Migrate All Hardcoded Strings to i18n Keys

Replace all hardcoded user-facing strings with `t('key')` calls using `useI18n()`.

**Files to modify** (every file with UI text):
- `src/forge/components/Layout.tsx`
- `src/forge/features/editor/EditorPanel.tsx`
- `src/forge/features/editor/ExportBar.tsx`
- `src/forge/features/schema/SchemaPanel.tsx`
- `src/forge/features/codegen/CodeGenPanel.tsx`
- `src/forge/features/mock/MockPanel.tsx`
- `src/forge/features/diff/DiffPanel.tsx`
- `src/forge/features/query/QueryPanel.tsx`
- `src/forge/features/apidoc/ApiDocPanel.tsx`
- `src/forge/features/validate/ValidatePanel.tsx`
- `src/forge/features/history/HistoryDrawer.tsx`
- `src/forge/features/workbench/ToolPanel.tsx` (tab labels)
- `src/devtools/panel/PanelApp.tsx`
- `src/devtools/panel/RequestList.tsx`
- `src/devtools/panel/RequestDetail.tsx`
- `src/devtools/panel/EndpointList.tsx`
- `src/popup/Popup.tsx`

**Pattern for every component:**

```typescript
import { useI18n } from '../../i18n/i18n'  // adjust path per file

// Inside component:
const t = useI18n()

// Replace hardcoded strings:
// "Copy" → t('common.copy')
// "Format" → t('editor.format')
// etc.
```

**Key examples per component:**

**Layout.tsx:**
```
"⚒ JSON Forge" → `⚒ ${t('forge.title')}`
"API Developer's JSON Workbench" → t('forge.subtitle')
"History ⌛" → `${t('history.title')} ⌛`
```

**EditorPanel.tsx:**
```
"Format" → t('editor.format')
"Minify" → t('editor.minify')
"Fix" → t('editor.fix')
"Escape" → t('editor.escape')
"Unescape" → t('editor.unescape')
"✓ Valid JSON" → `✓ ${t('editor.validJson')}`
```

**ToolPanel.tsx:** Update TABS array to use `t()` — but since TABS is a constant, make it a function or move inside the component:
```typescript
export default function ToolPanel({ json }: Props) {
  const t = useI18n()
  const tabs = [
    { id: 'schema', label: t('tabs.schema') },
    { id: 'codegen', label: t('tabs.codegen') },
    // ...
  ]
```

**PanelApp.tsx:**
```
"Requests" → t('devtools.requests')
"Endpoints" → t('devtools.endpoints')
"Recording" → t('devtools.recording')
"Paused" → t('devtools.paused')
"Clear" → t('common.clear')
```

**RequestDetail.tsx:**
```
"Response" → t('devtools.response')
"Request" → t('devtools.request')
"Headers" → t('devtools.headers')
"Send to Forge" → t('devtools.sendToForge')
"Generate Schema" → t('devtools.generateSchema')
"Save Endpoint" → t('devtools.saveEndpoint')
"Copied!" → t('common.copied')
"Copy JSON" → t('devtools.copyJson')
```

**Popup.tsx** — Note: Popup does not have a React entry point with SettingsProvider. For the popup, use a simpler approach: import `translate` directly and use `navigator.language` to detect locale:

```typescript
import { translate } from '../i18n/i18n'

const locale = navigator.language.startsWith('zh') ? 'zh' : 'en'
const t = (key: string) => translate(key, locale)
```

**Step 1: Migrate all Forge component strings**
**Step 2: Migrate all DevTools panel strings**
**Step 3: Migrate Popup strings**
**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(i18n): migrate all hardcoded UI strings to i18n translation keys"
```

---

## Group 4: Toast System (Tasks 11–13)

### Task 11: Toast Component + Hook

**Files:**
- Create: `src/shared/ToastProvider.tsx`

**Step 1: Create Toast component with Context and hook**

```typescript
// src/shared/ToastProvider.tsx
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextValue>({
  toast: {
    success: () => {},
    error: () => {},
    info: () => {},
  },
})

export function useToast() {
  return useContext(ToastContext).toast
}

function ToastMessage({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(item.id), 200) // wait for exit animation
    }, item.duration)
    return () => clearTimeout(timer)
  }, [item, onRemove])

  const bgColor = {
    success: 'var(--jf-success)',
    error: 'var(--jf-error)',
    info: 'var(--jf-primary)',
  }[item.type]

  return (
    <div
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--jf-primary-text)',
        backgroundColor: bgColor,
        transition: 'all 0.2s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: 'auto',
      }}
    >
      {item.message}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const add = useCallback((message: string, type: ToastType, duration = 2000) => {
    const id = crypto.randomUUID()
    setItems(prev => [...prev, { id, message, type, duration }])
  }, [])

  const toast = {
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {items.map(item => (
          <ToastMessage key={item.id} item={item} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
```

**Step 2: Commit**

```bash
git add src/shared/ToastProvider.tsx
git commit -m "feat(toast): add ToastProvider with success/error/info notifications"
```

---

### Task 12: Wire ToastProvider into Entry Points

**Files:**
- Modify: `src/forge/main.tsx`
- Modify: `src/devtools/panel/main.tsx`

**Step 1: Add ToastProvider to Forge**

```typescript
// src/forge/main.tsx — wrap inside I18nProvider:
import { ToastProvider } from '../shared/ToastProvider'

<SettingsProvider>
  <I18nProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </I18nProvider>
</SettingsProvider>
```

**Step 2: Add ToastProvider to DevTools**

```typescript
// src/devtools/panel/main.tsx:
import { ToastProvider } from '../../shared/ToastProvider'

<SettingsProvider>
  <I18nProvider>
    <ToastProvider>
      <PanelApp />
    </ToastProvider>
  </I18nProvider>
</SettingsProvider>
```

**Step 3: Commit**

```bash
git add src/forge/main.tsx src/devtools/panel/main.tsx
git commit -m "feat(toast): wire ToastProvider into Forge and DevTools entry points"
```

---

### Task 13: Migrate All Copy/Download Operations to Toast

**Files to modify** (every file with `navigator.clipboard.writeText`):
- `src/forge/features/editor/ExportBar.tsx`
- `src/forge/features/schema/SchemaPanel.tsx`
- `src/forge/features/codegen/CodeGenPanel.tsx`
- `src/forge/features/mock/MockPanel.tsx`
- `src/forge/features/diff/DiffPanel.tsx`
- `src/forge/features/query/QueryPanel.tsx`
- `src/forge/features/apidoc/ApiDocPanel.tsx`
- `src/forge/features/validate/ValidatePanel.tsx` (CompareMode, AssertionsMode)
- `src/devtools/panel/RequestDetail.tsx`

**Pattern for each file:**

```typescript
import { useToast } from '../../shared/ToastProvider'  // adjust path
import { useI18n } from '../../i18n/i18n'  // if not already imported

// Inside component:
const toast = useToast()
const t = useI18n()  // if not already

// Replace clipboard operations:
// Old: navigator.clipboard.writeText(output).catch(console.error)
// New:
navigator.clipboard.writeText(output)
  .then(() => toast.success(t('common.copied')))
  .catch(() => toast.error('Copy failed'))
```

**For download operations** (in ExportBar, SchemaPanel, MockPanel, CodeGenPanel, ApiDocPanel):
```typescript
// After the download logic:
toast.success(t('common.downloaded'))
```

**For RequestDetail.tsx** — remove the local `copied` state and `setCopied`/`setTimeout` pattern, replace with toast:
```typescript
// Old:
const [copied, setCopied] = useState(false)
const handleCopyJson = () => {
  navigator.clipboard.writeText(responseBody).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  })
}
// ...
{copied ? 'Copied!' : 'Copy JSON'}

// New:
const toast = useToast()
const handleCopyJson = () => {
  navigator.clipboard.writeText(responseBody)
    .then(() => toast.success(t('common.copied')))
    .catch(() => toast.error('Copy failed'))
}
// ...
{t('devtools.copyJson')}
```

Also add toast for Save Endpoint:
```typescript
const handleSaveEndpoint = () => {
  // ... existing logic ...
  sendMessage({ type: 'SAVE_ENDPOINT', payload: endpoint })
  toast.success(t('devtools.endpointSaved'))
}
```

**Step 1: Migrate all Forge component clipboard operations**
**Step 2: Migrate DevTools RequestDetail clipboard operations**
**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(toast): replace silent clipboard operations with toast notifications"
```

---

## Group 5: Keyboard Shortcuts (Tasks 14–15)

### Task 14: Shortcut Definitions

**Files:**
- Create: `src/shared/shortcuts.ts`

**Step 1: Create shortcut definitions**

```typescript
// src/shared/shortcuts.ts
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
  if (shortcut.mod) parts.push(isMac ? '⌘' : 'Ctrl')
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift')
  parts.push(shortcut.key === 'Escape' ? 'Esc' : shortcut.key.toUpperCase())
  return parts.join(isMac ? '' : '+')
}

export function matchesShortcut(e: KeyboardEvent, shortcut: Shortcut): boolean {
  const modKey = isMac ? e.metaKey : e.ctrlKey
  if (shortcut.mod && !modKey) return false
  if (!shortcut.mod && modKey) return false
  if (shortcut.shift && !e.shiftKey) return false
  if (!shortcut.shift && e.shiftKey) return false
  return e.key.toLowerCase() === shortcut.key.toLowerCase()
}
```

**Step 2: Commit**

```bash
git add src/shared/shortcuts.ts
git commit -m "feat(shortcuts): add keyboard shortcut definitions and matching utilities"
```

---

### Task 15: Wire Keyboard Shortcuts into Forge App

**Files:**
- Modify: `src/forge/App.tsx`
- Modify: `src/forge/features/workbench/ToolPanel.tsx`

The Forge App needs to listen for keyboard events and dispatch actions. ToolPanel needs to expose a way to set the active tab from outside (via a callback or ref).

**Step 1: Lift tab state to App.tsx**

Move `activeTab` state from ToolPanel to App so shortcuts can control it:

```typescript
// In App.tsx:
import { SHORTCUTS, matchesShortcut } from '../shared/shortcuts'
import { formatJson, minifyJson } from './features/editor/jsonUtils'

export default function App() {
  // ... existing state ...
  const [activeTab, setActiveTab] = useState('schema')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of SHORTCUTS) {
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault()
          switch (shortcut.action) {
            case 'format':
              try { setValue(formatJson(value)) } catch {}
              break
            case 'minify':
              try { setValue(minifyJson(value)) } catch {}
              break
            case 'copy':
              navigator.clipboard.writeText(value).catch(console.error)
              break
            case 'download': {
              const blob = new Blob([value], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = 'data.json'; a.click()
              URL.revokeObjectURL(url)
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
  }, [value])

  // Pass activeTab/setActiveTab to ToolPanel:
  <ToolPanel json={value} activeTab={activeTab} onTabChange={setActiveTab} />
```

**Step 2: Update ToolPanel to accept controlled tab state**

```typescript
// src/forge/features/workbench/ToolPanel.tsx
interface Props {
  json: string
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function ToolPanel({ json, activeTab, onTabChange }: Props) {
  const t = useI18n()
  const tabs = [
    { id: 'schema', label: t('tabs.schema') },
    // ... etc.
  ]

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={tabs} active={activeTab} onChange={onTabChange} />
      {/* ... panels ... */}
    </div>
  )
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/forge/App.tsx src/forge/features/workbench/ToolPanel.tsx
git commit -m "feat(shortcuts): wire keyboard shortcuts into Forge app with tab switching"
```

---

## Group 6: Settings Panel (Tasks 16–17)

### Task 16: Settings Drawer Component

**Files:**
- Create: `src/forge/features/settings/SettingsDrawer.tsx`

**Step 1: Create the SettingsDrawer**

Follow the same drawer pattern as HistoryDrawer (backdrop + right-side panel):

```typescript
// src/forge/features/settings/SettingsDrawer.tsx
import { useSettings } from '../../../shared/SettingsProvider'
import { useI18n } from '../../../i18n/i18n'
import { SHORTCUTS, formatShortcut } from '../../../shared/shortcuts'
import type { Settings } from '../../../shared/settings'

interface Props {
  onClose: () => void
  onShowWelcome: () => void
}

export default function SettingsDrawer({ onClose, onShowWelcome }: Props) {
  const { settings, updateSettings } = useSettings()
  const t = useI18n()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-10"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 bg-[var(--jf-bg)] border-l border-[var(--jf-border)] flex flex-col z-20">
        <div className="flex items-center px-4 py-3 border-b border-[var(--jf-border)] shrink-0">
          <span className="text-[var(--jf-text)] font-medium">{t('settings.title')}</span>
          <button onClick={onClose} className="ml-auto text-[var(--jf-text-muted)] hover:text-[var(--jf-text)] text-lg cursor-pointer">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Appearance */}
          <Section title={t('settings.appearance')}>
            <Row label={t('settings.theme')}>
              <SegmentedControl
                options={[
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                  { value: 'auto', label: t('settings.themeAuto') },
                ]}
                value={settings.theme}
                onChange={(v) => updateSettings({ theme: v as Settings['theme'] })}
              />
            </Row>
            <Row label={t('settings.language')}>
              <select
                value={settings.locale}
                onChange={e => updateSettings({ locale: e.target.value as Settings['locale'] })}
                className="px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border-0 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </Row>
          </Section>

          {/* Editor */}
          <Section title={t('settings.editor')}>
            <Row label={t('settings.fontSize')}>
              <input
                type="number"
                min={12}
                max={20}
                value={settings.fontSize}
                onChange={e => updateSettings({ fontSize: Math.min(20, Math.max(12, Number(e.target.value))) })}
                className="w-16 px-2 py-1 text-sm bg-[var(--jf-surface)] text-[var(--jf-text)] rounded border-0"
              />
            </Row>
            <Row label={t('settings.tabSize')}>
              <SegmentedControl
                options={[
                  { value: '2', label: '2' },
                  { value: '4', label: '4' },
                ]}
                value={String(settings.tabSize)}
                onChange={(v) => updateSettings({ tabSize: Number(v) as 2 | 4 })}
              />
            </Row>
            <Row label={t('settings.wordWrap')}>
              <Toggle checked={settings.wordWrap} onChange={(v) => updateSettings({ wordWrap: v })} />
            </Row>
            <Row label={t('settings.minimap')}>
              <Toggle checked={settings.minimap} onChange={(v) => updateSettings({ minimap: v })} />
            </Row>
          </Section>

          {/* Keyboard Shortcuts */}
          <Section title={t('settings.shortcuts')}>
            <div className="space-y-1">
              {SHORTCUTS.map(s => (
                <div key={s.action} className="flex justify-between text-sm py-1">
                  <span className="text-[var(--jf-text-secondary)]">{t(s.labelKey)}</span>
                  <kbd className="px-1.5 py-0.5 text-xs bg-[var(--jf-surface)] text-[var(--jf-text-muted)] rounded font-mono">
                    {formatShortcut(s)}
                  </kbd>
                </div>
              ))}
            </div>
          </Section>

          {/* About */}
          <Section title={t('settings.about')}>
            <div className="text-sm text-[var(--jf-text-secondary)]">
              {t('settings.version')}: 0.1.0
            </div>
            <button
              onClick={() => { onShowWelcome(); onClose() }}
              className="mt-2 px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
            >
              {t('settings.showWelcome')}
            </button>
          </Section>
        </div>
      </div>
    </>
  )
}

// -- Helper sub-components (private to this file) --

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[var(--jf-text-muted)] uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--jf-text)]">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[var(--jf-primary)]' : 'bg-[var(--jf-surface)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex bg-[var(--jf-surface)] rounded text-xs">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
            value === opt.value
              ? 'bg-[var(--jf-surface-hover)] text-[var(--jf-text)]'
              : 'text-[var(--jf-text-muted)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/forge/features/settings/SettingsDrawer.tsx
git commit -m "feat(settings): add SettingsDrawer with theme, language, editor, and shortcuts sections"
```

---

### Task 17: Wire Settings Drawer into Layout + App

**Files:**
- Modify: `src/forge/components/Layout.tsx` — add gear icon button
- Modify: `src/forge/App.tsx` — add settingsOpen state and render SettingsDrawer

**Step 1: Add settings button to Layout**

```typescript
// Layout.tsx — add onSettingsClick prop alongside onHistoryClick
interface Props {
  children: ReactNode
  onHistoryClick?: () => void
  onSettingsClick?: () => void
}

export default function Layout({ children, onHistoryClick, onSettingsClick }: Props) {
  const t = useI18n()
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-4 py-2 border-b border-[var(--jf-border)] bg-[var(--jf-bg-secondary)] shrink-0">
        <span className="text-[var(--jf-primary)] font-bold text-lg">⚒ {t('forge.title')}</span>
        <span className="ml-3 text-[var(--jf-text-muted)] text-sm">{t('forge.subtitle')}</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onSettingsClick}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
            title={t('settings.title')}
          >
            ⚙
          </button>
          <button
            onClick={onHistoryClick}
            className="px-3 py-1 text-sm bg-[var(--jf-surface)] hover:bg-[var(--jf-surface-hover)] rounded text-[var(--jf-text)] transition-colors cursor-pointer"
          >
            {t('history.title')} ⌛
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
```

**Step 2: Wire into App.tsx**

```typescript
// In App.tsx, add:
import SettingsDrawer from './features/settings/SettingsDrawer'

// In render:
<Layout
  onHistoryClick={() => setHistoryOpen(true)}
  onSettingsClick={() => setSettingsOpen(true)}
>
  {/* ... */}
</Layout>
{settingsOpen && (
  <SettingsDrawer
    onClose={() => setSettingsOpen(false)}
    onShowWelcome={() => setWelcomeOpen(true)}
  />
)}
```

(Note: `welcomeOpen` state will be added in Task 18.)

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/forge/components/Layout.tsx src/forge/App.tsx
git commit -m "feat(settings): wire SettingsDrawer into Layout header and App"
```

---

## Group 7: Welcome Modal (Tasks 18–19)

### Task 18: WelcomeModal Component

**Files:**
- Create: `src/forge/features/welcome/WelcomeModal.tsx`

**Step 1: Create the WelcomeModal**

```typescript
// src/forge/features/welcome/WelcomeModal.tsx
import { useState } from 'react'
import { useI18n } from '../../../i18n/i18n'

interface Props {
  onComplete: () => void
}

interface Step {
  titleKey: string
  descKey: string
  icon: string
}

const STEPS: Step[] = [
  { titleKey: 'welcome.step1Title', descKey: 'welcome.step1Desc', icon: '🛠' },
  { titleKey: 'welcome.step2Title', descKey: 'welcome.step2Desc', icon: '📡' },
  { titleKey: 'welcome.step3Title', descKey: 'welcome.step3Desc', icon: '⚡' },
]

export default function WelcomeModal({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const t = useI18n()
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" />
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="bg-[var(--jf-bg)] border border-[var(--jf-border)] rounded-lg shadow-2xl w-96 max-w-[90vw] p-8 text-center"
        >
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-xl font-bold text-[var(--jf-text)] mb-2">
            {t(current.titleKey)}
          </h2>
          <p className="text-sm text-[var(--jf-text-secondary)] mb-6">
            {t(current.descKey)}
          </p>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === step ? 'bg-[var(--jf-primary)]' : 'bg-[var(--jf-surface)]'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm text-[var(--jf-text-muted)] hover:text-[var(--jf-text)] cursor-pointer transition-colors"
              >
                {t('welcome.back')}
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={() => isLast ? onComplete() : setStep(step + 1)}
              className="px-4 py-2 text-sm font-medium bg-[var(--jf-primary)] text-[var(--jf-primary-text)] rounded cursor-pointer hover:opacity-90 transition-opacity"
            >
              {isLast ? t('welcome.getStarted') : t('welcome.next')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/forge/features/welcome/WelcomeModal.tsx
git commit -m "feat(welcome): add 3-step WelcomeModal onboarding component"
```

---

### Task 19: Wire WelcomeModal into App with First-Run Logic

**Files:**
- Modify: `src/forge/App.tsx`

**Step 1: Add welcome logic to App**

```typescript
// In App.tsx, add:
import WelcomeModal from './features/welcome/WelcomeModal'

// Add state:
const [welcomeOpen, setWelcomeOpen] = useState(false)

// Add effect to check first-run:
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

// In render (after Layout):
{welcomeOpen && <WelcomeModal onComplete={handleWelcomeComplete} />}
```

**Step 2: Wire "Show Welcome Guide" from SettingsDrawer**

The `onShowWelcome` callback already set in Task 17:
```typescript
onShowWelcome={() => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.remove('jf-welcomed').catch(console.error)
  }
  setWelcomeOpen(true)
}}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/forge/App.tsx
git commit -m "feat(welcome): wire WelcomeModal with first-run detection and settings re-trigger"
```

---

## Group 8: Chrome Native i18n + Integration (Tasks 20–22)

### Task 20: Chrome `_locales` for Extension Metadata

**Files:**
- Create: `src/_locales/en/messages.json`
- Create: `src/_locales/zh_CN/messages.json`
- Modify: `src/manifest.ts`

**Step 1: Create locale files**

```json
// src/_locales/en/messages.json
{
  "extName": { "message": "JSON Forge" },
  "extDescription": { "message": "The API developer's JSON workbench" }
}
```

```json
// src/_locales/zh_CN/messages.json
{
  "extName": { "message": "JSON Forge" },
  "extDescription": { "message": "API 开发者的 JSON 工作台" }
}
```

**Step 2: Update manifest to use i18n message references**

```typescript
// src/manifest.ts — change:
name: '__MSG_extName__',
description: '__MSG_extDescription__',
default_locale: 'en',
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds (CRXJS copies `_locales` to dist)

**Step 4: Commit**

```bash
git add src/_locales src/manifest.ts
git commit -m "feat(i18n): add Chrome _locales for extension name/description"
```

---

### Task 21: Run All Tests

**Step 1: Run full test suite**

Run: `pnpm vitest run`
Expected: All existing tests pass (196+), plus new settings and i18n tests

If any test fails due to missing CSS variable context or chrome mock, fix accordingly. Common issues:
- Components using `useI18n()` in tests need wrapping with providers or mock
- Components using `useSettings()` in tests need wrapping or mock

For test files that render components with providers, add test setup:
```typescript
// If needed in src/test-setup.ts, add:
vi.stubGlobal('chrome', {
  storage: { local: { get: vi.fn(() => Promise.resolve({})), set: vi.fn(() => Promise.resolve()), remove: vi.fn(() => Promise.resolve()) } },
  runtime: { getURL: vi.fn((path: string) => path), sendMessage: vi.fn() },
})
```

**Step 2: Fix any failures and re-run**

Run: `pnpm vitest run`
Expected: All tests PASS

**Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "test: fix test setup for settings/i18n providers"
```

---

### Task 22: Build Verification + Final Commit

**Step 1: Production build**

Run: `pnpm build`
Expected: Build succeeds, `dist/` contains all updated files

**Step 2: Verify dist contents**

Run: `ls dist/src/forge/index.html dist/src/devtools/panel/panel.html`
Expected: Both files exist

**Step 3: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat(ux): complete UX enhancements — theme, i18n, toast, shortcuts, settings, welcome"
```

---

## Task Dependency Graph

```
Task 1 (Settings type) ─→ Task 2 (SettingsProvider) ─→ Task 3 (Wire providers)
                                    │
                                    ├─→ Task 4 (CSS vars) ─→ Task 5 (useTheme) ─→ Task 6 (Color migration) ─→ Task 7 (Monaco themes)
                                    │
                                    ├─→ Task 8 (Translations) ─→ Task 9 (I18nProvider) ─→ Task 10 (String migration)
                                    │
                                    └─→ Task 11 (Toast) ─→ Task 12 (Wire toast) ─→ Task 13 (Migrate clipboard)

Task 14 (Shortcuts def) ─→ Task 15 (Wire shortcuts) ─depends on Task 10 for i18n labels─

Task 16 (SettingsDrawer) ─→ Task 17 (Wire settings) ─depends on Tasks 5, 9, 14─

Task 18 (WelcomeModal) ─→ Task 19 (Wire welcome) ─depends on Task 17─

Task 20 (Chrome locales) ─independent─

Task 21 (Tests) ─→ Task 22 (Build verification) ─depends on all above─
```

**Recommended execution order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22

Tasks that can run in parallel:
- Tasks 4+8+11+14+20 (CSS vars, translations, toast, shortcuts, chrome locales) are independent after Task 3
- But for simplicity and avoiding merge conflicts in shared files (main.tsx), sequential is safer
