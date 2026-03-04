# JSON Forge Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Forge page into a left-right split workbench and add five new features: JSON Schema generation, Mock data generation, JSON Diff, JSONPath querying, and session History.

**Architecture:** The current `ForgeEditor.tsx` (top-tab layout) is replaced by a `SplitPane` layout — Monaco Editor always visible on the left, tool tabs (Schema / Mock / Diff / Query / TypeScript) on the right. `App.tsx` lifts the JSON value state and passes it down to both panels. History is managed via `chrome.storage.local` and surfaced through a drawer in the header.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, `@monaco-editor/react`, `@faker-js/faker` (already installed, lazy-loaded), `jsondiffpatch` (already installed), `jsonpath-plus` (needs install), `chrome.storage.local` for History.

---

## Task 1: Refactor — Split-Pane Workbench Layout

**Goal:** Replace the top-tab `ForgeEditor` with a left-right split workbench. Left = Monaco Editor + bottom toolbar. Right = tool tabs (initially empty panels as stubs).

**Files:**
- Create: `src/forge/components/SplitPane.tsx`
- Create: `src/forge/features/editor/EditorPanel.tsx`
- Create: `src/forge/features/workbench/ToolPanel.tsx`
- Modify: `src/forge/App.tsx`
- Modify: `src/forge/components/Layout.tsx`
- Keep: `src/forge/features/editor/ForgeEditor.tsx` (delete after Task 1 is complete)

**Step 1: Install jsonpath-plus**

```bash
pnpm add jsonpath-plus
pnpm add -D @types/jsonpath-plus
```

Expected: package installs without errors.

**Step 2: Create `src/forge/components/SplitPane.tsx`**

```tsx
import { useState, useRef, useCallback, ReactNode } from 'react'

interface Props {
  children: [ReactNode, ReactNode]
  defaultLeftPercent?: number
}

export default function SplitPane({ children, defaultLeftPercent = 50 }: Props) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setLeftPercent(Math.min(80, Math.max(20, pct)))
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onMouseMove)
  }, [onMouseMove])

  const handleDividerMouseDown = () => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp, { once: true })
  }

  return (
    <div ref={containerRef} className="flex h-full">
      <div style={{ width: `${leftPercent}%` }} className="flex flex-col min-w-0 overflow-hidden">
        {children[0]}
      </div>
      <div
        className="w-1 bg-[#313244] hover:bg-[#89b4fa] cursor-col-resize shrink-0 transition-colors"
        onMouseDown={handleDividerMouseDown}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {children[1]}
      </div>
    </div>
  )
}
```

**Step 3: Create `src/forge/features/editor/EditorPanel.tsx`**

This extracts the Monaco editor + bottom toolbar from `ForgeEditor.tsx`.

```tsx
import Editor from '@monaco-editor/react'
import { useCallback } from 'react'
import { formatJson, minifyJson, fixJson, escapeJson, unescapeJson } from './jsonUtils'
import ExportBar from './ExportBar'

interface Props {
  value: string
  onChange: (v: string) => void
  error: string | null
}

export default function EditorPanel({ value, onChange, error }: Props) {
  const handleEditorChange = useCallback(
    (v: string | undefined) => onChange(v ?? ''),
    [onChange],
  )

  const apply = (fn: (s: string) => string) => {
    try { onChange(fn(value)) } catch { /* ignore invalid JSON */ }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 13, tabSize: 2, wordWrap: 'on', scrollBeyondLastLine: false }}
        />
      </div>
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-t border-[#313244] shrink-0 flex-wrap">
        <ToolBtn onClick={() => apply(formatJson)}>Format</ToolBtn>
        <ToolBtn onClick={() => apply(minifyJson)}>Minify</ToolBtn>
        <ToolBtn onClick={() => apply(fixJson)}>Fix</ToolBtn>
        <ToolBtn onClick={() => apply(escapeJson)}>Escape</ToolBtn>
        <ToolBtn onClick={() => apply(unescapeJson)}>Unescape</ToolBtn>
        {error
          ? <span className="ml-2 text-[#f38ba8] text-sm">{error}</span>
          : <span className="ml-2 text-[#a6e3a1] text-sm">✓ Valid JSON</span>
        }
        <div className="ml-auto">
          <ExportBar value={value} />
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
    >
      {children}
    </button>
  )
}
```

**Step 4: Create `src/forge/features/workbench/ToolPanel.tsx`**

Stub panels for Schema/Mock/Diff/Query will be filled in Tasks 2–5.

```tsx
import { useState } from 'react'
import TabBar from '../../components/TabBar'
import TsGenPanel from '../ts-gen/TsGenPanel'

const TABS = [
  { id: 'schema', label: 'Schema' },
  { id: 'mock', label: 'Mock' },
  { id: 'diff', label: 'Diff' },
  { id: 'query', label: 'Query' },
  { id: 'typescript', label: 'TypeScript' },
]

interface Props {
  json: string
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-[#6c7086] text-sm">
      {label} — coming soon
    </div>
  )
}

export default function ToolPanel({ json }: Props) {
  const [activeTab, setActiveTab] = useState('schema')

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'schema' && <ComingSoon label="Schema" />}
        {activeTab === 'mock' && <ComingSoon label="Mock" />}
        {activeTab === 'diff' && <ComingSoon label="Diff" />}
        {activeTab === 'query' && <ComingSoon label="Query" />}
        {activeTab === 'typescript' && <TsGenPanel json={json} />}
      </div>
    </div>
  )
}
```

**Step 5: Update `src/forge/components/Layout.tsx`**

Add a History button that calls an optional `onHistoryClick` prop.

```tsx
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  onHistoryClick?: () => void
}

export default function Layout({ children, onHistoryClick }: Props) {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center px-4 py-2 border-b border-[#313244] bg-[#181825] shrink-0">
        <span className="text-[#89b4fa] font-bold text-lg">⚒ JSON Forge</span>
        <span className="ml-3 text-[#6c7086] text-sm">API Developer's JSON Workbench</span>
        <button
          onClick={onHistoryClick}
          className="ml-auto px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer"
        >
          History ⌛
        </button>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
```

**Step 6: Update `src/forge/App.tsx`**

Lift value state to App so History can inject JSON. Wire everything together.

```tsx
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
```

**Step 7: Delete `src/forge/features/editor/ForgeEditor.tsx`**

It is fully superseded by `EditorPanel` + `ToolPanel`. Delete the file.

**Step 8: Run tests**

```bash
pnpm test run
```

Expected: 25 tests pass (no regressions — ForgeEditor had no unit tests).

**Step 9: Build and verify**

```bash
pnpm build
```

Expected: build succeeds. Load extension, verify split pane appears, Monaco editor on left, TypeScript tab works on right, divider is draggable.

**Step 10: Commit**

```bash
git add src/forge/ && git commit -m "refactor: split-pane workbench layout, lift JSON state to App"
```

---

## Task 2: JSON Schema Generator

**Files:**
- Create: `src/forge/features/schema/schemaGenerator.ts`
- Create: `src/forge/features/schema/schemaGenerator.test.ts`
- Create: `src/forge/features/schema/SchemaPanel.tsx`
- Modify: `src/forge/features/workbench/ToolPanel.tsx`

**Step 1: Write the failing tests**

Create `src/forge/features/schema/schemaGenerator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { jsonToSchema } from './schemaGenerator'

describe('jsonToSchema - Draft-07', () => {
  it('generates schema for flat object', () => {
    const result = JSON.parse(jsonToSchema('{"id":1,"name":"Alice"}', 'draft-07'))
    expect(result.$schema).toBe('http://json-schema.org/draft-07/schema#')
    expect(result.type).toBe('object')
    expect(result.required).toEqual(['id', 'name'])
    expect(result.properties.id).toEqual({ type: 'number' })
    expect(result.properties.name).toEqual({ type: 'string' })
  })

  it('generates schema for boolean', () => {
    const result = JSON.parse(jsonToSchema('true', 'draft-07'))
    expect(result.type).toBe('boolean')
  })

  it('generates null as nullable string in draft-07', () => {
    const result = JSON.parse(jsonToSchema('{"x":null}', 'draft-07'))
    expect(result.properties.x.type).toEqual(['string', 'null'])
  })

  it('generates array schema', () => {
    const result = JSON.parse(jsonToSchema('[1,2,3]', 'draft-07'))
    expect(result.type).toBe('array')
    expect(result.items).toEqual({ type: 'number' })
  })

  it('generates oneOf for mixed arrays', () => {
    const result = JSON.parse(jsonToSchema('[1,"a"]', 'draft-07'))
    expect(result.items.oneOf).toHaveLength(2)
  })

  it('generates recursive nested schema', () => {
    const result = JSON.parse(jsonToSchema('{"user":{"age":30}}', 'draft-07'))
    expect(result.properties.user.type).toBe('object')
    expect(result.properties.user.properties.age).toEqual({ type: 'number' })
  })
})

describe('jsonToSchema - Draft-2020-12', () => {
  it('uses correct $schema URI', () => {
    const result = JSON.parse(jsonToSchema('{}', 'draft-2020-12'))
    expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
  })

  it('generates null as type null in draft-2020-12', () => {
    const result = JSON.parse(jsonToSchema('{"x":null}', 'draft-2020-12'))
    expect(result.properties.x.type).toBe('null')
  })
})

describe('jsonToSchema - edge cases', () => {
  it('empty object generates empty properties', () => {
    const result = JSON.parse(jsonToSchema('{}', 'draft-07'))
    expect(result.type).toBe('object')
    expect(result.required).toEqual([])
    expect(result.properties).toEqual({})
  })

  it('empty array generates array type without items', () => {
    const result = JSON.parse(jsonToSchema('[]', 'draft-07'))
    expect(result.type).toBe('array')
    expect(result.items).toBeUndefined()
  })

  it('throws on invalid JSON', () => {
    expect(() => jsonToSchema('not json', 'draft-07')).toThrow()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test run src/forge/features/schema/schemaGenerator.test.ts
```

Expected: FAIL with "Cannot find module './schemaGenerator'"

**Step 3: Implement `src/forge/features/schema/schemaGenerator.ts`**

```typescript
export type SchemaVersion = 'draft-07' | 'draft-2020-12'

interface JSONSchema {
  $schema?: string
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema | { oneOf: JSONSchema[] }
  oneOf?: JSONSchema[]
}

export function jsonToSchema(jsonStr: string, version: SchemaVersion = 'draft-07'): string {
  const value: unknown = JSON.parse(jsonStr)
  const schema = inferSchema(value, version)
  schema.$schema = version === 'draft-07'
    ? 'http://json-schema.org/draft-07/schema#'
    : 'https://json-schema.org/draft/2020-12/schema'
  return JSON.stringify(schema, null, 2)
}

function inferSchema(value: unknown, version: SchemaVersion): JSONSchema {
  if (value === null) {
    return version === 'draft-07' ? { type: ['string', 'null'] } : { type: 'null' }
  }
  if (typeof value === 'string') return { type: 'string' }
  if (typeof value === 'number') return { type: 'number' }
  if (typeof value === 'boolean') return { type: 'boolean' }

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array' }
    const schemas = deduplicateSchemas(value.map(item => inferSchema(item, version)))
    return {
      type: 'array',
      items: schemas.length === 1 ? schemas[0] : { oneOf: schemas },
    }
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const properties: Record<string, JSONSchema> = {}
    for (const [key, val] of Object.entries(obj)) {
      properties[key] = inferSchema(val, version)
    }
    return { type: 'object', required: Object.keys(obj), properties }
  }

  return {}
}

function deduplicateSchemas(schemas: JSONSchema[]): JSONSchema[] {
  const seen = new Set<string>()
  return schemas.filter(s => {
    const key = JSON.stringify(s)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test run src/forge/features/schema/schemaGenerator.test.ts
```

Expected: 11 tests pass.

**Step 5: Create `src/forge/features/schema/SchemaPanel.tsx`**

```tsx
import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { jsonToSchema, SchemaVersion } from './schemaGenerator'
import { isValidJson } from '../editor/jsonUtils'

interface Props {
  json: string
}

export default function SchemaPanel({ json }: Props) {
  const [version, setVersion] = useState<SchemaVersion>('draft-07')
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isValidJson(json)) {
      setError('Invalid JSON in editor')
      setOutput('')
      return
    }
    try {
      setOutput(jsonToSchema(json, version))
      setError(null)
    } catch (e) {
      setError(String(e))
      setOutput('')
    }
  }, [json, version])

  const copy = () => { if (output) navigator.clipboard.writeText(output) }

  const download = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schema.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        <select
          value={version}
          onChange={e => setVersion(e.target.value as SchemaVersion)}
          className="px-2 py-1 text-sm bg-[#313244] text-[#cdd6f4] rounded border-0 cursor-pointer"
        >
          <option value="draft-07">Draft-07</option>
          <option value="draft-2020-12">Draft-2020-12</option>
        </select>
        {output && (
          <>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Copy</button>
            <button onClick={download} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Download</button>
          </>
        )}
        {error && <span className="ml-2 text-[#f38ba8] text-sm">{error}</span>}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={output}
          theme="vs-dark"
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false }}
        />
      </div>
    </div>
  )
}
```

**Step 6: Wire SchemaPanel into ToolPanel**

In `src/forge/features/workbench/ToolPanel.tsx`, replace the Schema stub:

```tsx
// Add import at top:
import SchemaPanel from '../schema/SchemaPanel'

// Replace:
{activeTab === 'schema' && <ComingSoon label="Schema" />}
// With:
{activeTab === 'schema' && <SchemaPanel json={json} />}
```

**Step 7: Run all tests**

```bash
pnpm test run
```

Expected: 36 tests pass (25 existing + 11 new).

**Step 8: Commit**

```bash
git add src/forge/features/schema/ && git add src/forge/features/workbench/ToolPanel.tsx && git commit -m "feat: JSON Schema generation (Draft-07 / Draft-2020-12)"
```

---

## Task 3: Mock Data Generator

**Files:**
- Create: `src/forge/features/mock/mockGenerator.ts`
- Create: `src/forge/features/mock/mockGenerator.test.ts`
- Create: `src/forge/features/mock/MockPanel.tsx`
- Modify: `src/forge/features/workbench/ToolPanel.tsx`

**Step 1: Write the failing tests**

Create `src/forge/features/mock/mockGenerator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateMock } from './mockGenerator'
import { Faker, en } from '@faker-js/faker'

const faker = new Faker({ locale: [en] })

describe('generateMock', () => {
  it('preserves object structure', () => {
    const input = { id: 1, name: 'Alice', email: 'a@b.com' }
    const result = generateMock(input, faker)
    expect(typeof result.id).toBe('string')   // UUID
    expect(typeof result.name).toBe('string')
    expect(typeof result.email).toBe('string')
  })

  it('generates string for unknown string fields', () => {
    const result = generateMock({ foo: 'bar' }, faker)
    expect(typeof result.foo).toBe('string')
  })

  it('generates number for numeric fields', () => {
    const result = generateMock({ count: 5 }, faker)
    expect(typeof result.count).toBe('number')
  })

  it('generates boolean for boolean fields', () => {
    const result = generateMock({ active: true }, faker)
    expect(typeof result.active).toBe('boolean')
  })

  it('preserves null', () => {
    const result = generateMock({ x: null }, faker)
    expect(result.x).toBeNull()
  })

  it('generates array of same structure', () => {
    const input = [{ id: 1, name: 'Alice' }]
    const result = generateMock(input, faker) as unknown[]
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('preserves enum-like status field', () => {
    const result = generateMock({ status: 'active' }, faker)
    expect(result.status).toBe('active')
  })

  it('generates nested objects recursively', () => {
    const result = generateMock({ user: { name: 'Bob', age: 30 } }, faker)
    expect(typeof (result.user as Record<string, unknown>).name).toBe('string')
    expect(typeof (result.user as Record<string, unknown>).age).toBe('number')
  })

  it('generates email for email field', () => {
    const result = generateMock({ email: 'old@old.com' }, faker)
    expect(result.email).toContain('@')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test run src/forge/features/mock/mockGenerator.test.ts
```

Expected: FAIL with "Cannot find module './mockGenerator'"

**Step 3: Implement `src/forge/features/mock/mockGenerator.ts`**

```typescript
import type { Faker } from '@faker-js/faker'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// Fields matching these patterns keep their original value (enum-like)
const ENUM_PATTERNS = /^(status|type|role|state|mode|gender|category|kind)$/i

// Ordered list: [pattern, faker factory]
type FakerFactory = (f: Faker) => JsonValue
const FIELD_RULES: Array<[RegExp, FakerFactory]> = [
  [/^id$|_id$/i, f => f.string.uuid()],
  [/^name$/i, f => f.person.fullName()],
  [/first_?name|firstName/i, f => f.person.firstName()],
  [/last_?name|lastName/i, f => f.person.lastName()],
  [/email/i, f => f.internet.email()],
  [/phone/i, f => f.phone.number()],
  [/avatar|photo/i, f => f.image.url()],
  [/url|website/i, f => f.internet.url()],
  [/_at$|_time$|_date$|created|updated|timestamp/i, f => f.date.recent().toISOString()],
  [/address/i, f => f.location.streetAddress()],
  [/city/i, f => f.location.city()],
  [/country/i, f => f.location.country()],
  [/title/i, f => f.lorem.sentence(3)],
  [/description|content|bio|summary/i, f => f.lorem.paragraph()],
  [/price|amount|cost|salary|fee/i, f => parseFloat(f.number.float({ min: 1, max: 1000, fractionDigits: 2 }).toFixed(2))],
  [/age/i, f => f.number.int({ min: 18, max: 80 })],
  [/count|total|quantity/i, f => f.number.int({ min: 0, max: 100 })],
]

export function generateMock(value: unknown, faker: Faker): Record<string, JsonValue> {
  return mockValue(value, '', faker) as Record<string, JsonValue>
}

function mockValue(value: unknown, fieldName: string, faker: Faker): JsonValue {
  if (value === null) return null
  if (typeof value === 'boolean') return faker.datatype.boolean()
  if (typeof value === 'number') return faker.number.int({ min: 0, max: 10000 })

  if (typeof value === 'string') {
    // Preserve enum-like fields
    if (ENUM_PATTERNS.test(fieldName)) return value
    // Try semantic match
    for (const [pattern, factory] of FIELD_RULES) {
      if (pattern.test(fieldName)) return factory(faker)
    }
    return faker.lorem.word()
  }

  if (Array.isArray(value)) {
    const template = value[0] ?? 'item'
    const count = faker.number.int({ min: 2, max: 3 })
    return Array.from({ length: count }, () => mockValue(template, fieldName, faker))
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const result: Record<string, JsonValue> = {}
    for (const [key, val] of Object.entries(obj)) {
      result[key] = mockValue(val, key, faker)
    }
    return result
  }

  return faker.lorem.word()
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test run src/forge/features/mock/mockGenerator.test.ts
```

Expected: 9 tests pass.

**Step 5: Create `src/forge/features/mock/MockPanel.tsx`**

Uses dynamic import to lazy-load faker only when this panel is first used.

```tsx
import { useState, useCallback } from 'react'
import { isValidJson } from '../editor/jsonUtils'
import type { generateMock as GenerateMockFn } from './mockGenerator'

interface Props {
  json: string
}

export default function MockPanel({ json }: Props) {
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number>(5)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    if (!isValidJson(json)) {
      setError('Invalid JSON in editor')
      return
    }
    setLoading(true)
    try {
      // Lazy-load faker and generator together
      const [{ Faker, en }, { generateMock }] = await Promise.all([
        import('@faker-js/faker'),
        import('./mockGenerator'),
      ]) as [{ Faker: typeof import('@faker-js/faker').Faker; en: typeof import('@faker-js/faker').en }, { generateMock: typeof GenerateMockFn }]

      const faker = new Faker({ locale: [en] })
      const parsed: unknown = JSON.parse(json)

      let result: unknown
      if (Array.isArray(parsed)) {
        const template = parsed[0] ?? {}
        result = Array.from({ length: count }, () => generateMock(template, faker))
      } else {
        result = generateMock(parsed, faker)
      }

      setOutput(JSON.stringify(result, null, 2))
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [json, count])

  const copy = () => { if (output) navigator.clipboard.writeText(output) }

  const download = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mock.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isArray = isValidJson(json) && Array.isArray(JSON.parse(json))

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0 flex-wrap">
        {isArray && (
          <label className="flex items-center gap-2 text-sm text-[#cdd6f4]">
            Count:
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              className="w-16 px-2 py-1 bg-[#313244] rounded text-[#cdd6f4] border-0"
            />
          </label>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="px-3 py-1 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded font-medium cursor-pointer hover:bg-[#b4d0fe] transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Regenerate'}
        </button>
        {output && (
          <>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Copy</button>
            <button onClick={download} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Download</button>
          </>
        )}
        {error && <span className="ml-2 text-[#f38ba8] text-sm">{error}</span>}
        {!output && !error && <span className="text-[#6c7086] text-sm">Click Regenerate to generate mock data</span>}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {output && (
          <pre className="text-sm text-[#cdd6f4] font-mono whitespace-pre-wrap">{output}</pre>
        )}
      </div>
    </div>
  )
}
```

**Step 6: Wire MockPanel into ToolPanel**

```tsx
// Add import:
import MockPanel from '../mock/MockPanel'

// Replace:
{activeTab === 'mock' && <ComingSoon label="Mock" />}
// With:
{activeTab === 'mock' && <MockPanel json={json} />}
```

**Step 7: Run all tests**

```bash
pnpm test run
```

Expected: 45 tests pass (36 + 9 new).

**Step 8: Commit**

```bash
git add src/forge/features/mock/ && git add src/forge/features/workbench/ToolPanel.tsx && git commit -m "feat: Mock data generation with faker.js semantic field matching"
```

---

## Task 4: JSON Diff Panel

**Files:**
- Create: `src/forge/features/diff/diffUtils.ts`
- Create: `src/forge/features/diff/diffUtils.test.ts`
- Create: `src/forge/features/diff/DiffPanel.tsx`
- Modify: `src/forge/features/workbench/ToolPanel.tsx`

`jsondiffpatch` is already in `package.json`.

**Step 1: Write the failing tests**

Create `src/forge/features/diff/diffUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeDiff, DiffEntry } from './diffUtils'

describe('computeDiff', () => {
  it('detects added field', () => {
    const entries = computeDiff('{"a":1}', '{"a":1,"b":2}')
    const added = entries.find(e => e.type === 'added' && e.path === 'b')
    expect(added).toBeDefined()
    expect(added!.newValue).toBe(2)
  })

  it('detects removed field', () => {
    const entries = computeDiff('{"a":1,"b":2}', '{"a":1}')
    const removed = entries.find(e => e.type === 'removed' && e.path === 'b')
    expect(removed).toBeDefined()
    expect(removed!.oldValue).toBe(2)
  })

  it('detects changed field', () => {
    const entries = computeDiff('{"name":"Alice"}', '{"name":"Bob"}')
    const changed = entries.find(e => e.type === 'changed' && e.path === 'name')
    expect(changed).toBeDefined()
    expect(changed!.oldValue).toBe('Alice')
    expect(changed!.newValue).toBe('Bob')
  })

  it('detects unchanged field', () => {
    const entries = computeDiff('{"id":1}', '{"id":1}')
    const unchanged = entries.find(e => e.type === 'unchanged' && e.path === 'id')
    expect(unchanged).toBeDefined()
  })

  it('detects nested changed field', () => {
    const entries = computeDiff('{"user":{"city":"Beijing"}}', '{"user":{"city":"Shanghai"}}')
    const changed = entries.find(e => e.type === 'changed' && e.path === 'user.city')
    expect(changed).toBeDefined()
    expect(changed!.oldValue).toBe('Beijing')
    expect(changed!.newValue).toBe('Shanghai')
  })

  it('returns empty array for identical JSON', () => {
    const entries = computeDiff('{"a":1}', '{"a":1}')
    const nonUnchanged = entries.filter(e => e.type !== 'unchanged')
    expect(nonUnchanged).toHaveLength(0)
  })

  it('throws on invalid JSON', () => {
    expect(() => computeDiff('not json', '{}')).toThrow()
    expect(() => computeDiff('{}', 'not json')).toThrow()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test run src/forge/features/diff/diffUtils.test.ts
```

Expected: FAIL with "Cannot find module './diffUtils'"

**Step 3: Implement `src/forge/features/diff/diffUtils.ts`**

We manually walk both parsed objects instead of relying on jsondiffpatch's complex delta format, which gives us clean, predictable output.

```typescript
export type DiffType = 'added' | 'removed' | 'changed' | 'unchanged'

export interface DiffEntry {
  type: DiffType
  path: string
  oldValue?: unknown
  newValue?: unknown
}

export function computeDiff(oldStr: string, newStr: string): DiffEntry[] {
  const oldObj: unknown = JSON.parse(oldStr)
  const newObj: unknown = JSON.parse(newStr)
  const entries: DiffEntry[] = []
  walkDiff(oldObj, newObj, '', entries)
  return entries
}

function walkDiff(oldVal: unknown, newVal: unknown, path: string, entries: DiffEntry[]): void {
  // Both are plain objects — recurse key by key
  if (isPlainObject(oldVal) && isPlainObject(newVal)) {
    const oldObj = oldVal as Record<string, unknown>
    const newObj = newVal as Record<string, unknown>
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key
      if (!(key in oldObj)) {
        entries.push({ type: 'added', path: childPath, newValue: newObj[key] })
      } else if (!(key in newObj)) {
        entries.push({ type: 'removed', path: childPath, oldValue: oldObj[key] })
      } else {
        walkDiff(oldObj[key], newObj[key], childPath, entries)
      }
    }
    return
  }

  // Leaf comparison
  if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
    entries.push({ type: 'unchanged', path, oldValue: oldVal, newValue: newVal })
  } else {
    entries.push({ type: 'changed', path, oldValue: oldVal, newValue: newVal })
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test run src/forge/features/diff/diffUtils.test.ts
```

Expected: 7 tests pass.

**Step 5: Create `src/forge/features/diff/DiffPanel.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { computeDiff, DiffEntry } from './diffUtils'
import { isValidJson } from '../editor/jsonUtils'

interface Props {
  json: string
}

const TYPE_STYLES: Record<string, string> = {
  added: 'text-[#a6e3a1]',
  removed: 'text-[#f38ba8]',
  changed: 'text-[#f9e2af]',
  unchanged: 'text-[#6c7086]',
}

const TYPE_ICONS: Record<string, string> = {
  added: '＋',
  removed: '－',
  changed: '～',
  unchanged: '＝',
}

export default function DiffPanel({ json }: Props) {
  const [newJson, setNewJson] = useState<string>('')
  const [entries, setEntries] = useState<DiffEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showUnchanged, setShowUnchanged] = useState(false)

  useEffect(() => {
    if (!newJson.trim()) { setEntries([]); setError(null); return }
    if (!isValidJson(json)) { setError('Original JSON (editor) is invalid'); return }
    if (!isValidJson(newJson)) { setError('New JSON is invalid'); return }
    try {
      setEntries(computeDiff(json, newJson))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }, [json, newJson])

  const visible = showUnchanged ? entries : entries.filter(e => e.type !== 'unchanged')
  const summary = entries.reduce(
    (acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  const copyReport = () => {
    const lines = visible.map(e => {
      const icon = TYPE_ICONS[e.type]
      if (e.type === 'changed') return `${icon} ${e.path}: ${JSON.stringify(e.oldValue)} → ${JSON.stringify(e.newValue)}`
      if (e.type === 'added') return `${icon} ${e.path}: ${JSON.stringify(e.newValue)}`
      if (e.type === 'removed') return `${icon} ${e.path}: ${JSON.stringify(e.oldValue)}`
      return `${icon} ${e.path}`
    })
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        {entries.length > 0 && (
          <>
            <span className="text-[#a6e3a1] text-sm">+{summary.added ?? 0}</span>
            <span className="text-[#f38ba8] text-sm">-{summary.removed ?? 0}</span>
            <span className="text-[#f9e2af] text-sm">~{summary.changed ?? 0}</span>
            <label className="flex items-center gap-1 text-sm text-[#6c7086] ml-2 cursor-pointer">
              <input type="checkbox" checked={showUnchanged} onChange={e => setShowUnchanged(e.target.checked)} />
              Show unchanged
            </label>
            <button onClick={copyReport} className="ml-auto px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer">Copy Report</button>
          </>
        )}
        {error && <span className="text-[#f38ba8] text-sm">{error}</span>}
      </div>

      <div className="p-3 shrink-0">
        <textarea
          placeholder="Paste new JSON here to compare…"
          value={newJson}
          onChange={e => setNewJson(e.target.value)}
          className="w-full h-32 p-2 bg-[#181825] border border-[#313244] rounded text-sm text-[#cdd6f4] font-mono resize-none focus:outline-none focus:border-[#89b4fa]"
        />
      </div>

      <div className="flex-1 overflow-auto px-3 pb-3">
        {visible.map((entry, i) => (
          <div key={i} className={`flex gap-2 py-1 text-sm font-mono ${TYPE_STYLES[entry.type]}`}>
            <span className="shrink-0 w-4">{TYPE_ICONS[entry.type]}</span>
            <span className="font-medium shrink-0">{entry.path}</span>
            {entry.type === 'changed' && (
              <span className="truncate">
                <span className="text-[#f38ba8]">{JSON.stringify(entry.oldValue)}</span>
                <span className="mx-1 text-[#6c7086]">→</span>
                <span className="text-[#a6e3a1]">{JSON.stringify(entry.newValue)}</span>
              </span>
            )}
            {entry.type === 'added' && <span className="truncate">{JSON.stringify(entry.newValue)}</span>}
            {entry.type === 'removed' && <span className="truncate">{JSON.stringify(entry.oldValue)}</span>}
          </div>
        ))}
        {!newJson.trim() && (
          <p className="text-[#6c7086] text-sm">Paste JSON above. The original is pre-filled from the editor.</p>
        )}
      </div>
    </div>
  )
}
```

**Step 6: Wire DiffPanel into ToolPanel**

```tsx
// Add import:
import DiffPanel from '../diff/DiffPanel'

// Replace:
{activeTab === 'diff' && <ComingSoon label="Diff" />}
// With:
{activeTab === 'diff' && <DiffPanel json={json} />}
```

**Step 7: Run all tests**

```bash
pnpm test run
```

Expected: 52 tests pass (45 + 7 new).

**Step 8: Commit**

```bash
git add src/forge/features/diff/ && git add src/forge/features/workbench/ToolPanel.tsx && git commit -m "feat: JSON Diff with field-level added/removed/changed detection"
```

---

## Task 5: JSONPath Query Panel

**Files:**
- Create: `src/forge/features/query/queryUtils.ts`
- Create: `src/forge/features/query/queryUtils.test.ts`
- Create: `src/forge/features/query/QueryPanel.tsx`
- Modify: `src/forge/features/workbench/ToolPanel.tsx`

**Step 1: Write the failing tests**

Create `src/forge/features/query/queryUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { runJsonPath } from './queryUtils'

const DATA = JSON.stringify({
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  meta: { count: 2 },
})

describe('runJsonPath', () => {
  it('extracts root field', () => {
    const result = runJsonPath(DATA, '$.meta.count')
    expect(result).toEqual([2])
  })

  it('extracts array elements with wildcard', () => {
    const result = runJsonPath(DATA, '$.users[*].name')
    expect(result).toEqual(['Alice', 'Bob'])
  })

  it('extracts specific array index', () => {
    const result = runJsonPath(DATA, '$.users[0]')
    expect(result[0]).toMatchObject({ id: 1, name: 'Alice' })
  })

  it('supports recursive descent', () => {
    const result = runJsonPath(DATA, '$..email')
    expect(result).toHaveLength(2)
    expect(result).toContain('alice@example.com')
  })

  it('returns empty array when no match', () => {
    const result = runJsonPath(DATA, '$.nonexistent')
    expect(result).toEqual([])
  })

  it('throws on invalid JSON', () => {
    expect(() => runJsonPath('not json', '$')).toThrow()
  })

  it('returns root for $ expression', () => {
    const result = runJsonPath('{"a":1}', '$')
    expect(result[0]).toEqual({ a: 1 })
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test run src/forge/features/query/queryUtils.test.ts
```

Expected: FAIL with "Cannot find module './queryUtils'"

**Step 3: Implement `src/forge/features/query/queryUtils.ts`**

```typescript
import { JSONPath } from 'jsonpath-plus'

export function runJsonPath(jsonStr: string, expression: string): unknown[] {
  const json: unknown = JSON.parse(jsonStr)
  const results = JSONPath({ path: expression, json, resultType: 'value' })
  return Array.isArray(results) ? results : []
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test run src/forge/features/query/queryUtils.test.ts
```

Expected: 7 tests pass.

**Step 5: Create `src/forge/features/query/QueryPanel.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { runJsonPath } from './queryUtils'
import { isValidJson } from '../editor/jsonUtils'

interface Props {
  json: string
}

const EXAMPLES = [
  '$.users[*].name',
  '$..email',
  '$.data[0]',
  '$.meta.count',
]

export default function QueryPanel({ json }: Props) {
  const [expression, setExpression] = useState<string>('$')
  const [results, setResults] = useState<unknown[]>([])
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(() => {
    if (!expression.trim()) { setResults([]); setError(null); return }
    if (!isValidJson(json)) { setError('Invalid JSON in editor'); return }
    try {
      const r = runJsonPath(json, expression)
      setResults(r)
      setError(null)
    } catch (e) {
      setError(String(e))
      setResults([])
    }
  }, [json, expression])

  // Debounce: run 300ms after expression or json changes
  useEffect(() => {
    const timer = setTimeout(run, 300)
    return () => clearTimeout(timer)
  }, [run])

  const copy = () => {
    if (results.length > 0) {
      navigator.clipboard.writeText(JSON.stringify(results.length === 1 ? results[0] : results, null, 2))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 items-center px-3 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
        <input
          type="text"
          value={expression}
          onChange={e => setExpression(e.target.value)}
          placeholder="$.users[*].email"
          className="flex-1 px-3 py-1 bg-[#313244] text-[#cdd6f4] text-sm font-mono rounded border-0 focus:outline-none focus:ring-1 focus:ring-[#89b4fa]"
        />
        {results.length > 0 && (
          <>
            <span className="text-[#6c7086] text-sm shrink-0">{results.length} match{results.length !== 1 ? 'es' : ''}</span>
            <button onClick={copy} className="px-3 py-1 text-sm bg-[#313244] hover:bg-[#45475a] rounded text-[#cdd6f4] transition-colors cursor-pointer shrink-0">Copy</button>
          </>
        )}
        {error && <span className="text-[#f38ba8] text-sm truncate">{error}</span>}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {results.length > 0 ? (
          results.map((item, i) => (
            <div key={i} className="flex gap-3 py-1 border-b border-[#1e1e2e] last:border-0">
              <span className="text-[#6c7086] text-sm shrink-0 w-8 text-right">[{i}]</span>
              <pre className="text-sm text-[#cdd6f4] font-mono whitespace-pre-wrap flex-1">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <div className="space-y-3">
            <p className="text-[#6c7086] text-sm">Enter a JSONPath expression above. Examples:</p>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setExpression(ex)}
                className="block font-mono text-sm text-[#89b4fa] hover:text-[#b4d0fe] cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 6: Wire QueryPanel into ToolPanel**

```tsx
// Add import:
import QueryPanel from '../query/QueryPanel'

// Replace:
{activeTab === 'query' && <ComingSoon label="Query" />}
// With:
{activeTab === 'query' && <QueryPanel json={json} />}
```

**Step 7: Run all tests**

```bash
pnpm test run
```

Expected: 59 tests pass (52 + 7 new).

**Step 8: Commit**

```bash
git add src/forge/features/query/ && git add src/forge/features/workbench/ToolPanel.tsx && git commit -m "feat: JSONPath query panel with live results and debounce"
```

---

## Task 6: History System

**Files:**
- Create: `src/forge/features/history/historyStore.ts`
- Create: `src/forge/features/history/historyStore.test.ts`
- Create: `src/forge/features/history/HistoryDrawer.tsx`
- Modify: `src/forge/App.tsx`

**Step 1: Write the failing tests**

The history store uses `chrome.storage.local`. The test environment mocks it.

First, add a chrome storage mock to `src/test-setup.ts`. Read it first:

```bash
cat src/test-setup.ts
```

Add the mock (only if not already there). Open `src/test-setup.ts` and add:

```typescript
// Mock chrome.storage.local for history tests
const storageData: Record<string, unknown> = {}
const chromeMock = {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: storageData[key] }),
      set: async (data: Record<string, unknown>) => { Object.assign(storageData, data) },
      remove: async (key: string) => { delete storageData[key] },
    },
  },
}
;(globalThis as typeof globalThis & { chrome: typeof chromeMock }).chrome = chromeMock
```

Now create `src/forge/features/history/historyStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { addHistoryEntry, loadHistory, clearHistory, HistoryEntry } from './historyStore'

// Reset storage before each test
beforeEach(async () => {
  await clearHistory()
})

describe('historyStore', () => {
  it('adds and loads a history entry', async () => {
    await addHistoryEntry('{"id":1}', 'https://api.example.com')
    const history = await loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].content).toBe('{"id":1}')
    expect(history[0].source).toBe('https://api.example.com')
  })

  it('prepends new entries (newest first)', async () => {
    await addHistoryEntry('{"a":1}', 'source-a')
    await addHistoryEntry('{"b":2}', 'source-b')
    const history = await loadHistory()
    expect(history[0].source).toBe('source-b')
    expect(history[1].source).toBe('source-a')
  })

  it('stores preview (first 100 chars)', async () => {
    const content = '{"key":"value"}'
    await addHistoryEntry(content, 'test')
    const history = await loadHistory()
    expect(history[0].preview).toBe(content.slice(0, 100))
  })

  it('clears all history', async () => {
    await addHistoryEntry('{"a":1}', 'test')
    await clearHistory()
    const history = await loadHistory()
    expect(history).toHaveLength(0)
  })

  it('skips entries larger than 1MB', async () => {
    const huge = 'x'.repeat(1024 * 1024 + 1)
    await addHistoryEntry(huge, 'test')
    const history = await loadHistory()
    expect(history).toHaveLength(0)
  })

  it('keeps max 50 entries, evicting oldest', async () => {
    for (let i = 0; i < 52; i++) {
      await addHistoryEntry(`{"i":${i}}`, `source-${i}`)
    }
    const history = await loadHistory()
    expect(history).toHaveLength(50)
    expect(history[0].source).toBe('source-51')  // newest
    expect(history[49].source).toBe('source-2')  // oldest kept
  })

  it('assigns unique ids', async () => {
    await addHistoryEntry('{"a":1}', 'x')
    await addHistoryEntry('{"b":2}', 'y')
    const history = await loadHistory()
    expect(history[0].id).not.toBe(history[1].id)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test run src/forge/features/history/historyStore.test.ts
```

Expected: FAIL with "Cannot find module './historyStore'"

**Step 3: Check current `src/test-setup.ts` and add chrome mock if missing**

```bash
cat src/test-setup.ts
```

If the chrome mock above is not already present, add it to `src/test-setup.ts`.

**Step 4: Implement `src/forge/features/history/historyStore.ts`**

```typescript
export interface HistoryEntry {
  id: string
  timestamp: number
  source: string
  preview: string
  content: string
}

const STORAGE_KEY = 'jf-history'
const MAX_ENTRIES = 50
const MAX_ENTRY_BYTES = 1024 * 1024 // 1 MB

export async function addHistoryEntry(content: string, source: string): Promise<void> {
  if (content.length > MAX_ENTRY_BYTES) return

  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    source,
    preview: content.slice(0, 100),
    content,
  }

  const history = await loadHistory()
  const updated = [entry, ...history].slice(0, MAX_ENTRIES)
  await chrome.storage.local.set({ [STORAGE_KEY]: updated })
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const data = (result as Record<string, unknown>)[STORAGE_KEY]
  return Array.isArray(data) ? (data as HistoryEntry[]) : []
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}
```

**Step 5: Run tests to verify they pass**

```bash
pnpm test run src/forge/features/history/historyStore.test.ts
```

Expected: 7 tests pass.

**Step 6: Create `src/forge/features/history/HistoryDrawer.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { loadHistory, clearHistory, HistoryEntry } from './historyStore'

interface Props {
  onLoad: (json: string) => void
  onClose: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (isYesterday) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString()
}

function formatSize(content: string): string {
  const bytes = new Blob([content]).size
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export default function HistoryDrawer({ onLoad, onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    loadHistory().then(setEntries)
  }, [])

  const handleClear = async () => {
    await clearHistory()
    setEntries([])
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="absolute top-0 right-0 h-full w-80 bg-[#1e1e2e] border-l border-[#313244] flex flex-col z-10">
        <div className="flex items-center px-4 py-3 border-b border-[#313244] shrink-0">
          <span className="text-[#cdd6f4] font-medium">History</span>
          <button onClick={onClose} className="ml-auto text-[#6c7086] hover:text-[#cdd6f4] text-lg cursor-pointer">✕</button>
        </div>

        <div className="flex-1 overflow-auto">
          {entries.length === 0 ? (
            <p className="text-[#6c7086] text-sm p-4">No history yet. JSON sessions will appear here.</p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="px-4 py-3 border-b border-[#181825] hover:bg-[#181825] group">
                <div className="text-[#cdd6f4] text-xs font-mono truncate mb-1">{entry.preview}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6c7086] text-xs truncate flex-1" title={entry.source}>{entry.source}</span>
                  <span className="text-[#6c7086] text-xs shrink-0">{formatSize(entry.content)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[#6c7086] text-xs">{formatDate(entry.timestamp)}</span>
                  <button
                    onClick={() => onLoad(entry.content)}
                    className="px-2 py-0.5 text-xs bg-[#313244] hover:bg-[#45475a] rounded text-[#89b4fa] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    Load
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#313244] shrink-0">
          <button
            onClick={handleClear}
            className="text-sm text-[#f38ba8] hover:text-[#f38ba8]/80 cursor-pointer transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </>
  )
}
```

**Step 7: Wire History into `src/forge/App.tsx`**

Update App.tsx to open the drawer, save on load-from-content-script, and handle the load callback:

```tsx
import { useEffect, useState, useCallback } from 'react'
import Layout from './components/Layout'
import SplitPane from './components/SplitPane'
import EditorPanel from './features/editor/EditorPanel'
import ToolPanel from './features/workbench/ToolPanel'
import HistoryDrawer from './features/history/HistoryDrawer'
import { isValidJson } from './features/editor/jsonUtils'
import { addHistoryEntry } from './features/history/historyStore'

export default function App() {
  const [value, setValue] = useState<string>('{}')
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

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
            return chrome.storage.local.remove('jf-payload')
          }
        })
        .catch(console.error)
    }
  }, [handleChange])

  // Auto-save pasted/imported JSON after 10s of inactivity
  useEffect(() => {
    if (!isValidJson(value) || value === '{}') return
    const timer = setTimeout(() => {
      addHistoryEntry(value, '(pasted)').catch(console.error)
    }, 10000)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <Layout onHistoryClick={() => setHistoryOpen(true)}>
      <SplitPane>
        <EditorPanel value={value} onChange={handleChange} error={error} />
        <ToolPanel json={value} />
      </SplitPane>
      {historyOpen && (
        <HistoryDrawer
          onLoad={(json) => { handleChange(json); setHistoryOpen(false) }}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </Layout>
  )
}
```

**Step 8: Run all tests**

```bash
pnpm test run
```

Expected: 66 tests pass (59 + 7 new).

**Step 9: Build**

```bash
pnpm build
```

Expected: build succeeds. Reload extension, verify all five tool tabs work, History drawer opens and saves sessions.

**Step 10: Commit**

```bash
git add src/forge/features/history/ && git add src/forge/App.tsx && git commit -m "feat: History drawer with auto-save and chrome.storage.local persistence"
```

---

## Final Verification

After all 6 tasks:

```bash
pnpm test run
```

Expected: **66 tests pass**, 0 failures.

```bash
pnpm build
```

Expected: build succeeds with no errors.

**Manual smoke test checklist:**
- [ ] Split pane renders, divider is draggable
- [ ] Monaco editor on left, tool tabs on right
- [ ] Schema tab: paste JSON, select Draft-07 / Draft-2020-12, schema appears, Copy/Download work
- [ ] Mock tab: click Regenerate, realistic mock data appears
- [ ] Diff tab: paste modified JSON, colored diff shows added/removed/changed
- [ ] Query tab: type `$.users[*].name`, matches appear live
- [ ] TypeScript tab: still works as before
- [ ] History button opens drawer, Load restores JSON to editor
