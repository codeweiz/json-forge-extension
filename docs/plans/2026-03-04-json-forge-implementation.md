# JSON Forge Chrome Extension — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome MV3 extension that auto-renders JSON pages in-browser and provides a full-screen "Forge" workbench for TypeScript generation, Mock data, Schema, and Diff.

**Architecture:** Content script detects pure-JSON pages and replaces raw text with a syntax-highlighted tree; a toolbar button relays the JSON to a full-screen Forge SPA via `chrome.storage.session`; the Forge page hosts Monaco Editor + feature panels. Phase 1 covers the full in-page render + Forge MVP (format, TS gen, export).

**Tech Stack:** React 18, TypeScript 5, Vite + CRXJS, Tailwind CSS v4, Monaco Editor, Vitest, `json-to-typescript`, `@faker-js/faker`, `jsondiffpatch`, `jq-web`

---

## Prerequisites

```bash
node -v   # Need 18+
pnpm -v   # Use pnpm throughout (faster installs)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Create: `src/manifest.ts` (typed manifest, CRXJS reads this)

**Step 1: Scaffold with Vite + CRXJS**

```bash
pnpm create vite@latest . --template react-ts
pnpm add -D @crxjs/vite-plugin vite
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
pnpm add monaco-editor @monaco-editor/react
pnpm add json-schema-to-typescript
pnpm add @faker-js/faker
pnpm add jsondiffpatch
```

**Step 2: Configure `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './src/manifest'

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

**Step 3: Create `src/manifest.ts`**

```typescript
import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'JSON Forge',
  version: '0.1.0',
  description: 'The API developer\'s JSON workbench',
  permissions: ['storage', 'tabs'],
  host_permissions: ['<all_urls>'],
  action: { default_popup: 'src/popup/index.html', default_icon: 'icons/icon48.png' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  content_scripts: [{
    matches: ['<all_urls>'],
    js: ['src/content/index.ts'],
    run_at: 'document_end',
  }],
})
```

**Step 4: Create `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

**Step 5: Create placeholder icons**

```bash
mkdir -p public/icons
# Add 16x16, 48x48, 128x128 PNG icons (can use placeholder for now)
```

**Step 6: Verify dev build starts**

```bash
pnpm dev
```
Expected: Vite starts, CRXJS outputs to `dist/`, no errors.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + CRXJS + React + Tailwind + Vitest project"
```

---

## Task 2: JSON Detector (Content Script)

**Files:**
- Create: `src/content/detector.ts`
- Create: `src/content/detector.test.ts`
- Create: `src/content/index.ts`

**Step 1: Write failing tests for detector**

```typescript
// src/content/detector.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { isJsonPage, extractJson } from './detector'

describe('isJsonPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  it('returns true when content-type is application/json', () => {
    // Simulate a pure JSON page: body contains only a <pre> with JSON
    document.body.innerHTML = '<pre>{"hello": "world"}</pre>'
    expect(isJsonPage()).toBe(true)
  })

  it('returns false when page has normal HTML structure', () => {
    document.body.innerHTML = '<div><p>Hello</p></div>'
    expect(isJsonPage()).toBe(false)
  })

  it('returns false when pre content is not valid JSON', () => {
    document.body.innerHTML = '<pre>not json</pre>'
    expect(isJsonPage()).toBe(false)
  })
})

describe('extractJson', () => {
  it('parses JSON from body pre tag', () => {
    document.body.innerHTML = '<pre>{"key": 1}</pre>'
    expect(extractJson()).toEqual({ key: 1 })
  })

  it('returns null when no JSON found', () => {
    document.body.innerHTML = '<div>text</div>'
    expect(extractJson()).toBeNull()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/content/detector.test.ts
```
Expected: FAIL — `isJsonPage` not found.

**Step 3: Implement `src/content/detector.ts`**

```typescript
export function isJsonPage(): boolean {
  const body = document.body
  if (!body) return false
  // Heuristic: body has exactly one child which is <pre> containing valid JSON
  const children = Array.from(body.children)
  if (children.length !== 1) return false
  const pre = children[0]
  if (pre.tagName !== 'PRE') return false
  return isValidJson(pre.textContent ?? '')
}

export function extractJson(): unknown | null {
  const pre = document.body?.querySelector('pre')
  if (!pre) return null
  try {
    return JSON.parse(pre.textContent ?? '')
  } catch {
    return null
  }
}

function isValidJson(text: string): boolean {
  if (!text.trim()) return false
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/content/detector.test.ts
```
Expected: PASS (5 tests).

**Step 5: Create `src/content/index.ts` entry**

```typescript
import { isJsonPage, extractJson } from './detector'

if (isJsonPage()) {
  const json = extractJson()
  if (json !== null) {
    // Will be wired up in Task 3 and Task 4
    console.log('[JSON Forge] JSON page detected', json)
  }
}
```

**Step 6: Commit**

```bash
git add src/content/
git commit -m "feat(content): JSON page detector with tests"
```

---

## Task 3: In-Page Renderer

**Files:**
- Create: `src/content/renderer.ts`
- Create: `src/content/renderer.test.ts`

The renderer replaces the raw `<pre>` text with a styled tree. For Phase 1 we use a lightweight recursive DOM approach (no React, to keep the content script bundle small).

**Step 1: Write failing tests**

```typescript
// src/content/renderer.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderJsonTree } from './renderer'

describe('renderJsonTree', () => {
  it('renders a string value', () => {
    const el = renderJsonTree('hello')
    expect(el.textContent).toContain('hello')
    expect(el.querySelector('.jf-string')).toBeTruthy()
  })

  it('renders a number value', () => {
    const el = renderJsonTree(42)
    expect(el.querySelector('.jf-number')).toBeTruthy()
  })

  it('renders null value', () => {
    const el = renderJsonTree(null)
    expect(el.querySelector('.jf-null')).toBeTruthy()
  })

  it('renders an object with keys', () => {
    const el = renderJsonTree({ name: 'Alice', age: 30 })
    expect(el.textContent).toContain('name')
    expect(el.textContent).toContain('Alice')
    expect(el.textContent).toContain('age')
  })

  it('renders an array', () => {
    const el = renderJsonTree([1, 2, 3])
    expect(el.querySelectorAll('.jf-array-item').length).toBe(3)
  })
})
```

**Step 2: Run tests — verify fail**

```bash
pnpm vitest run src/content/renderer.test.ts
```

**Step 3: Implement `src/content/renderer.ts`**

```typescript
export function renderJsonTree(value: unknown): HTMLElement {
  const root = document.createElement('span')
  root.className = 'jf-node'
  root.appendChild(renderValue(value))
  return root
}

function renderValue(value: unknown): HTMLElement {
  if (value === null) return span('jf-null', 'null')
  if (typeof value === 'boolean') return span('jf-boolean', String(value))
  if (typeof value === 'number') return span('jf-number', String(value))
  if (typeof value === 'string') return span('jf-string', `"${value}"`)
  if (Array.isArray(value)) return renderArray(value)
  if (typeof value === 'object') return renderObject(value as Record<string, unknown>)
  return span('jf-unknown', String(value))
}

function renderObject(obj: Record<string, unknown>): HTMLElement {
  const el = document.createElement('span')
  el.className = 'jf-object'
  const entries = Object.entries(obj)
  el.appendChild(text('{'))
  entries.forEach(([key, val], i) => {
    const row = document.createElement('div')
    row.className = 'jf-object-row'
    row.style.paddingLeft = '1.5rem'
    const keyEl = span('jf-key', `"${key}"`)
    row.appendChild(keyEl)
    row.appendChild(text(': '))
    row.appendChild(renderValue(val))
    if (i < entries.length - 1) row.appendChild(text(','))
    el.appendChild(row)
  })
  el.appendChild(text('}'))
  return el
}

function renderArray(arr: unknown[]): HTMLElement {
  const el = document.createElement('span')
  el.className = 'jf-array'
  el.appendChild(text('['))
  arr.forEach((item, i) => {
    const row = document.createElement('div')
    row.className = 'jf-array-item'
    row.style.paddingLeft = '1.5rem'
    row.appendChild(renderValue(item))
    if (i < arr.length - 1) row.appendChild(text(','))
    el.appendChild(row)
  })
  el.appendChild(text(']'))
  return el
}

function span(className: string, content: string): HTMLElement {
  const el = document.createElement('span')
  el.className = className
  el.textContent = content
  return el
}

function text(content: string): Text {
  return document.createTextNode(content)
}
```

**Step 4: Create `src/content/renderer.css`** (injected via content script)

```css
.jf-root { font-family: 'Menlo', 'Monaco', monospace; font-size: 13px; line-height: 1.6; padding: 1rem; }
.jf-key { color: #9cdcfe; }
.jf-string { color: #ce9178; }
.jf-number { color: #b5cea8; }
.jf-boolean { color: #569cd6; }
.jf-null { color: #808080; }
```

**Step 5: Run tests — verify pass**

```bash
pnpm vitest run src/content/renderer.test.ts
```

**Step 6: Commit**

```bash
git add src/content/renderer.ts src/content/renderer.test.ts src/content/renderer.css
git commit -m "feat(content): lightweight JSON tree renderer with tests"
```

---

## Task 4: Toolbar Injection ("Open in Forge")

**Files:**
- Create: `src/content/toolbar.ts`

**Step 1: Implement `src/content/toolbar.ts`**

```typescript
export function injectToolbar(onOpenForge: () => void): void {
  const toolbar = document.createElement('div')
  toolbar.id = 'jf-toolbar'
  toolbar.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px; background: #1e1e2e; border-bottom: 1px solid #313244;
    font-family: system-ui; font-size: 13px; color: #cdd6f4;
  `

  const logo = document.createElement('span')
  logo.textContent = '⚒ JSON Forge'
  logo.style.fontWeight = '600'

  const openBtn = document.createElement('button')
  openBtn.textContent = 'Open in Forge →'
  openBtn.style.cssText = `
    margin-left: auto; padding: 4px 12px; background: #89b4fa;
    color: #1e1e2e; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
  `
  openBtn.onclick = onOpenForge

  toolbar.appendChild(logo)
  toolbar.appendChild(openBtn)
  document.body.prepend(toolbar)
  document.body.style.paddingTop = '36px'
}
```

**Step 2: Wire everything in `src/content/index.ts`**

```typescript
import { isJsonPage, extractJson } from './detector'
import { renderJsonTree } from './renderer'
import { injectToolbar } from './toolbar'

async function init() {
  if (!isJsonPage()) return

  const json = extractJson()
  if (json === null) return

  // Replace raw <pre> with rendered tree
  const pre = document.body.querySelector('pre')!
  const root = document.createElement('div')
  root.id = 'jf-root'
  root.className = 'jf-root'
  root.appendChild(renderJsonTree(json))
  pre.replaceWith(root)

  // Inject toolbar
  injectToolbar(async () => {
    // Store JSON in session storage for Forge page to pick up
    await chrome.storage.session.set({ 'jf-payload': JSON.stringify(json) })
    chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
  })
}

init()
```

**Step 3: Commit**

```bash
git add src/content/
git commit -m "feat(content): inject toolbar with Open in Forge action"
```

---

## Task 5: Background Service Worker

**Files:**
- Create: `src/background/index.ts`

The background worker is minimal for Phase 1 — it just needs to exist as MV3 requires it. Data relay is handled directly in the content script via `chrome.storage.session`.

**Step 1: Create `src/background/index.ts`**

```typescript
// Minimal service worker — stays alive for MV3 compliance
// Future: handle cross-tab messaging, history sync

chrome.runtime.onInstalled.addListener(() => {
  console.log('[JSON Forge] Extension installed')
})
```

**Step 2: Commit**

```bash
git add src/background/
git commit -m "feat(background): minimal MV3 service worker"
```

---

## Task 6: Forge Page — Layout & Routing

**Files:**
- Create: `src/forge/index.html`
- Create: `src/forge/main.tsx`
- Create: `src/forge/App.tsx`
- Create: `src/forge/components/Layout.tsx`

**Step 1: Create `src/forge/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JSON Forge</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

**Step 2: Create `src/forge/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 3: Create `src/forge/index.css`**

```css
@import "tailwindcss";

body {
  margin: 0;
  background: #1e1e2e;
  color: #cdd6f4;
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
}
```

**Step 4: Create `src/forge/App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import ForgeEditor from './features/editor/ForgeEditor'

export default function App() {
  const [initialJson, setInitialJson] = useState<string>('')

  useEffect(() => {
    // Load JSON passed from content script via chrome.storage.session
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.session.get('jf-payload', (result) => {
        if (result['jf-payload']) {
          setInitialJson(result['jf-payload'] as string)
          chrome.storage.session.remove('jf-payload')
        }
      })
    }
  }, [])

  return (
    <Layout>
      <ForgeEditor initialValue={initialJson} />
    </Layout>
  )
}
```

**Step 5: Create `src/forge/components/Layout.tsx`**

```tsx
import { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-4 py-2 border-b border-[#313244] bg-[#181825]">
        <span className="text-[#89b4fa] font-bold text-lg">⚒ JSON Forge</span>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/forge/
git commit -m "feat(forge): Forge page layout and App shell"
```

---

## Task 7: Forge Editor — Monaco + Format/Minify

**Files:**
- Create: `src/forge/features/editor/ForgeEditor.tsx`
- Create: `src/forge/features/editor/ForgeEditor.test.tsx`
- Create: `src/forge/features/editor/jsonUtils.ts`
- Create: `src/forge/features/editor/jsonUtils.test.ts`

**Step 1: Write failing tests for jsonUtils**

```typescript
// src/forge/features/editor/jsonUtils.test.ts
import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson, isValidJson, fixJson } from './jsonUtils'

describe('formatJson', () => {
  it('formats compact JSON with 2-space indent', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('throws on invalid JSON', () => {
    expect(() => formatJson('{bad}')).toThrow()
  })
})

describe('minifyJson', () => {
  it('removes all whitespace', () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
  })
})

describe('isValidJson', () => {
  it('returns true for valid JSON', () => {
    expect(isValidJson('{"a":1}')).toBe(true)
  })

  it('returns false for invalid JSON', () => {
    expect(isValidJson('{bad}')).toBe(false)
  })
})

describe('fixJson', () => {
  it('fixes trailing commas', () => {
    const result = fixJson('{"a":1,}')
    expect(isValidJson(result)).toBe(true)
  })

  it('fixes single quotes', () => {
    const result = fixJson("{'a':1}")
    expect(isValidJson(result)).toBe(true)
  })
})
```

**Step 2: Run tests — verify fail**

```bash
pnpm vitest run src/forge/features/editor/jsonUtils.test.ts
```

**Step 3: Implement `src/forge/features/editor/jsonUtils.ts`**

```typescript
export function formatJson(input: string, indent = 2): string {
  return JSON.stringify(JSON.parse(input), null, indent)
}

export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input))
}

export function isValidJson(input: string): boolean {
  if (!input.trim()) return false
  try { JSON.parse(input); return true } catch { return false }
}

export function fixJson(input: string): string {
  let fixed = input
    .replace(/'/g, '"')                          // single → double quotes
    .replace(/,\s*([}\]])/g, '$1')               // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')  // unquoted keys
  return fixed
}

export function escapeJson(input: string): string {
  return JSON.stringify(input)
}

export function unescapeJson(input: string): string {
  try { return JSON.parse(input) } catch { return input }
}
```

**Step 4: Run tests — verify pass**

```bash
pnpm vitest run src/forge/features/editor/jsonUtils.test.ts
```

**Step 5: Create `src/forge/features/editor/ForgeEditor.tsx`**

```tsx
import Editor from '@monaco-editor/react'
import { useState, useCallback } from 'react'
import { formatJson, minifyJson, isValidJson, fixJson } from './jsonUtils'

interface Props { initialValue: string }

export default function ForgeEditor({ initialValue }: Props) {
  const [value, setValue] = useState(initialValue || '{}')
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback((v: string) => {
    setError(isValidJson(v) ? null : 'Invalid JSON')
  }, [])

  const handleChange = (v: string | undefined) => {
    const next = v ?? ''
    setValue(next)
    validate(next)
  }

  const format = () => {
    try { setValue(formatJson(value)); setError(null) }
    catch (e) { setError(String(e)) }
  }

  const minify = () => {
    try { setValue(minifyJson(value)); setError(null) }
    catch (e) { setError(String(e)) }
  }

  const fix = () => {
    const fixed = fixJson(value)
    setValue(fixed)
    validate(fixed)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex gap-2 px-3 py-2 bg-[#181825] border-b border-[#313244]">
        <ToolBtn onClick={format}>Format</ToolBtn>
        <ToolBtn onClick={minify}>Minify</ToolBtn>
        <ToolBtn onClick={fix}>Fix</ToolBtn>
        {error && <span className="ml-auto text-[#f38ba8] text-sm">{error}</span>}
      </div>
      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={handleChange}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 13, tabSize: 2 }}
        />
      </div>
    </div>
  )
}

function ToolBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors"
    >
      {children}
    </button>
  )
}
```

**Step 6: Commit**

```bash
git add src/forge/features/editor/
git commit -m "feat(forge): Monaco editor with format/minify/fix + unit tests"
```

---

## Task 8: TypeScript Interface Generator

**Files:**
- Create: `src/forge/features/ts-gen/tsGenerator.ts`
- Create: `src/forge/features/ts-gen/tsGenerator.test.ts`
- Create: `src/forge/features/ts-gen/TsGenPanel.tsx`

**Step 1: Write failing tests**

```typescript
// src/forge/features/ts-gen/tsGenerator.test.ts
import { describe, it, expect } from 'vitest'
import { jsonToTypeScript } from './tsGenerator'

describe('jsonToTypeScript', () => {
  it('generates interface for flat object', () => {
    const result = jsonToTypeScript('{"name":"Alice","age":30}', 'Root')
    expect(result).toContain('interface Root')
    expect(result).toContain('name: string')
    expect(result).toContain('age: number')
  })

  it('generates nested interface', () => {
    const result = jsonToTypeScript('{"user":{"id":1}}', 'Root')
    expect(result).toContain('user: User')
    expect(result).toContain('interface User')
    expect(result).toContain('id: number')
  })

  it('generates array type', () => {
    const result = jsonToTypeScript('[{"id":1}]', 'Root')
    expect(result).toContain('Root[]') // or Array<RootItem>
  })

  it('handles null as optional', () => {
    const result = jsonToTypeScript('{"val":null}', 'Root')
    expect(result).toContain('val')
  })

  it('handles boolean', () => {
    const result = jsonToTypeScript('{"active":true}', 'Root')
    expect(result).toContain('active: boolean')
  })
})
```

**Step 2: Run tests — verify fail**

```bash
pnpm vitest run src/forge/features/ts-gen/tsGenerator.test.ts
```

**Step 3: Implement `src/forge/features/ts-gen/tsGenerator.ts`**

```typescript
interface TypeContext {
  interfaces: Map<string, string>
}

export function jsonToTypeScript(jsonStr: string, rootName = 'Root'): string {
  const value = JSON.parse(jsonStr)
  const ctx: TypeContext = { interfaces: new Map() }
  const rootType = inferType(value, rootName, ctx)

  // If root is an array, export a type alias
  const interfaces = Array.from(ctx.interfaces.values()).join('\n\n')
  if (!ctx.interfaces.has(rootName)) {
    return `${interfaces}\n\nexport type ${rootName} = ${rootType}`
  }
  return interfaces
}

function inferType(value: unknown, name: string, ctx: TypeContext): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const itemName = `${name}Item`
    const itemType = inferType(value[0], itemName, ctx)
    return `${itemType}[]`
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const lines: string[] = []
    for (const [key, val] of Object.entries(obj)) {
      const childName = capitalize(key)
      const childType = inferType(val, childName, ctx)
      const optional = val === null ? '?' : ''
      lines.push(`  ${key}${optional}: ${val === null ? childType + ' | null' : childType}`)
    }
    ctx.interfaces.set(name, `export interface ${name} {\n${lines.join('\n')}\n}`)
    return name
  }

  return 'unknown'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

**Step 4: Run tests — verify pass**

```bash
pnpm vitest run src/forge/features/ts-gen/tsGenerator.test.ts
```

**Step 5: Create `src/forge/features/ts-gen/TsGenPanel.tsx`**

```tsx
import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { jsonToTypeScript } from './tsGenerator'

interface Props { json: string }

export default function TsGenPanel({ json }: Props) {
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const generate = () => {
    try {
      setOutput(jsonToTypeScript(json, 'Root'))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-3 py-2 bg-[#181825] border-b border-[#313244]">
        <button onClick={generate} className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium">
          Generate TypeScript
        </button>
        {output && (
          <button
            onClick={() => navigator.clipboard.writeText(output)}
            className="px-3 py-1 text-sm bg-[#313244] rounded text-[#cdd6f4]"
          >
            Copy
          </button>
        )}
        {error && <span className="ml-auto text-[#f38ba8] text-sm">{error}</span>}
      </div>
      <div className="flex-1">
        <Editor height="100%" defaultLanguage="typescript" value={output} theme="vs-dark"
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
      </div>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/forge/features/ts-gen/
git commit -m "feat(forge): TypeScript interface generator with unit tests"
```

---

## Task 9: Forge Tabs — Wire Panels Together

**Files:**
- Modify: `src/forge/features/editor/ForgeEditor.tsx`
- Create: `src/forge/components/TabBar.tsx`

**Step 1: Create `src/forge/components/TabBar.tsx`**

```tsx
interface Tab { id: string; label: string }
interface Props {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex border-b border-[#313244] bg-[#181825]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm transition-colors ${
            active === tab.id
              ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
              : 'text-[#6c7086] hover:text-[#cdd6f4]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

**Step 2: Update `src/forge/features/editor/ForgeEditor.tsx` to add tabs**

Add imports at top:
```tsx
import TabBar from '../../components/TabBar'
import TsGenPanel from '../ts-gen/TsGenPanel'
```

Add state and tabs below existing state:
```tsx
const [activeTab, setActiveTab] = useState('editor')
const tabs = [
  { id: 'editor', label: 'Editor' },
  { id: 'typescript', label: 'TypeScript' },
]
```

Wrap the return to include tabs:
```tsx
return (
  <div className="flex flex-col h-full">
    <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
    {activeTab === 'editor' && (
      <>
        <div className="flex gap-2 px-3 py-2 bg-[#181825] border-b border-[#313244]">
          {/* existing toolbar buttons */}
        </div>
        <div className="flex-1">
          <Editor ... />
        </div>
      </>
    )}
    {activeTab === 'typescript' && <TsGenPanel json={value} />}
  </div>
)
```

**Step 3: Commit**

```bash
git add src/forge/
git commit -m "feat(forge): tabbed panel layout with TypeScript tab"
```

---

## Task 10: Export Features

**Files:**
- Create: `src/forge/features/editor/ExportBar.tsx`
- Modify: `src/forge/features/editor/ForgeEditor.tsx`

**Step 1: Create `src/forge/features/editor/ExportBar.tsx`**

```tsx
interface Props { value: string; filename?: string }

export default function ExportBar({ value, filename = 'data.json' }: Props) {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value)
  }

  const downloadFile = () => {
    const blob = new Blob([value], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2 ml-auto">
      <button onClick={copyToClipboard}
        className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4]">
        Copy
      </button>
      <button onClick={downloadFile}
        className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4]">
        Download
      </button>
    </div>
  )
}
```

**Step 2: Add ExportBar to ForgeEditor toolbar**

In `ForgeEditor.tsx`, add to toolbar div:
```tsx
import ExportBar from './ExportBar'
// inside toolbar div, after fix button:
<ExportBar value={value} />
```

**Step 3: Commit**

```bash
git add src/forge/features/editor/
git commit -m "feat(forge): copy to clipboard and download JSON export"
```

---

## Task 11: Popup Entry Point

**Files:**
- Create: `src/popup/index.html`
- Create: `src/popup/main.tsx`
- Create: `src/popup/Popup.tsx`

**Step 1: Create `src/popup/index.html`**

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>JSON Forge</title></head>
<body style="width:240px;min-height:100px;">
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

**Step 2: Create `src/popup/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './Popup'
import '../forge/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Popup /></React.StrictMode>
)
```

**Step 3: Create `src/popup/Popup.tsx`**

```tsx
export default function Popup() {
  const openForge = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
  }

  return (
    <div className="p-4 bg-[#1e1e2e] text-[#cdd6f4]">
      <h1 className="text-[#89b4fa] font-bold mb-3">⚒ JSON Forge</h1>
      <button onClick={openForge}
        className="w-full py-2 bg-[#89b4fa] text-[#1e1e2e] rounded font-medium text-sm">
        Open Forge
      </button>
      <p className="mt-2 text-xs text-[#6c7086]">Visit any JSON URL to auto-render</p>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/popup/
git commit -m "feat(popup): extension popup with Open Forge button"
```

---

## Task 12: Build & Manual QA

**Step 1: Build production bundle**

```bash
pnpm build
```
Expected: `dist/` directory created, no errors.

**Step 2: Load in Chrome**

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `dist/` folder
4. Visit `https://jsonplaceholder.typicode.com/todos/1`

Expected:
- Page renders formatted JSON with syntax highlighting
- Toolbar shows "⚒ JSON Forge" and "Open in Forge →" button
- Clicking the button opens a new tab with the Forge editor pre-loaded with the JSON

**Step 3: Run all unit tests**

```bash
pnpm vitest run
```
Expected: All tests pass.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 MVP complete — in-page render + Forge editor"
```

---

## Phase 1 Done Checklist

- [ ] JSON pages auto-detected and rendered with syntax highlighting
- [ ] Fold/unfold works on tree nodes
- [ ] "Open in Forge" toolbar button appears on JSON pages
- [ ] Forge page loads with JSON from page pre-loaded
- [ ] Format / Minify / Fix buttons work
- [ ] TypeScript interface generation works for nested objects
- [ ] Copy and Download export work
- [ ] Popup opens Forge page
- [ ] All unit tests pass
- [ ] Production build succeeds
