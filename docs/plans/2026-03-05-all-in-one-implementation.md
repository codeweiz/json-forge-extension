# JSON Forge All-in-One Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform JSON Forge into a complete API developer workbench with DevTools traffic capture, contract-driven generation, and testing/regression tools.

**Architecture:** DevTools panel captures API traffic via `chrome.devtools.network`, stores endpoints in `chrome.storage.local`, and communicates with Forge workbench via Background service worker message relay. Three implementation groups executed in strict order.

**Tech Stack:** React 19 + TypeScript 5.9 + Vite 7 + CRXJS + Monaco Editor + Tailwind CSS v4 + Vitest

---

## Group 1: Traffic Capture → Contract Generation (Infrastructure)

### Task 1: Shared Types & Messaging Module

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/messaging.ts`
- Test: `src/shared/messaging.test.ts`

**Step 1: Create shared types**

```typescript
// src/shared/types.ts

export interface RequestMeta {
  url: string
  method: string
  status: number
  headers: Record<string, string>
  requestHeaders?: Record<string, string>
  requestBody?: string
  timing: number
  timestamp: number
  size: number
}

export interface RequestSnapshot {
  id: string
  meta: RequestMeta
  responseBody: string
}

export interface Endpoint {
  id: string                     // hash of method:normalizedPath
  method: string
  domain: string
  path: string                   // normalized, e.g. /api/users/:param
  snapshots: RequestSnapshot[]
  schema?: object
  starred: boolean
  lastSeen: number
}

export type MessageType =
  | { type: 'SEND_TO_FORGE'; payload: { json: string; meta: RequestMeta } }
  | { type: 'SAVE_ENDPOINT'; payload: Endpoint }
  | { type: 'GET_ENDPOINTS'; payload?: { domain?: string } }
  | { type: 'ENDPOINTS_RESULT'; payload: Endpoint[] }
  | { type: 'SAVE_SCHEMA'; payload: { endpointId: string; schema: object } }
  | { type: 'GET_SCHEMA'; payload: { endpointId: string } }
  | { type: 'SCHEMA_RESULT'; payload: { schema: object | null } }
  | { type: 'DEVTOOLS_READY' }
```

**Step 2: Write failing tests for messaging helpers**

```typescript
// src/shared/messaging.test.ts
import { describe, it, expect } from 'vitest'
import { normalizePathname, endpointId, isJsonContentType } from './messaging'

describe('normalizePathname', () => {
  it('replaces numeric segments with :param', () => {
    expect(normalizePathname('/api/users/123')).toBe('/api/users/:param')
  })

  it('replaces UUID segments with :param', () => {
    expect(normalizePathname('/api/items/550e8400-e29b-41d4-a716-446655440000'))
      .toBe('/api/items/:param')
  })

  it('keeps non-param segments unchanged', () => {
    expect(normalizePathname('/api/users/profile')).toBe('/api/users/profile')
  })

  it('handles root path', () => {
    expect(normalizePathname('/')).toBe('/')
  })

  it('strips trailing slash', () => {
    expect(normalizePathname('/api/users/')).toBe('/api/users')
  })
})

describe('endpointId', () => {
  it('generates consistent id from method and path', () => {
    const id1 = endpointId('GET', '/api/users/:param')
    const id2 = endpointId('GET', '/api/users/:param')
    expect(id1).toBe(id2)
  })

  it('generates different ids for different methods', () => {
    const id1 = endpointId('GET', '/api/users')
    const id2 = endpointId('POST', '/api/users')
    expect(id1).not.toBe(id2)
  })
})

describe('isJsonContentType', () => {
  it('matches application/json', () => {
    expect(isJsonContentType('application/json')).toBe(true)
  })

  it('matches application/json with charset', () => {
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true)
  })

  it('matches vendor json types', () => {
    expect(isJsonContentType('application/vnd.api+json')).toBe(true)
  })

  it('rejects text/html', () => {
    expect(isJsonContentType('text/html')).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isJsonContentType(undefined)).toBe(false)
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/shared/messaging.test.ts`
Expected: FAIL — modules not found

**Step 4: Implement messaging helpers**

```typescript
// src/shared/messaging.ts
import type { MessageType } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_RE = /^\d+$/

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname
  return trimmed
    .split('/')
    .map(seg => (NUMERIC_RE.test(seg) || UUID_RE.test(seg)) ? ':param' : seg)
    .join('/')
}

export function endpointId(method: string, normalizedPath: string): string {
  // Simple hash: method:path → base36 hash
  const str = `${method.toUpperCase()}:${normalizedPath}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) return false
  return /application\/(\w+\+)?json/i.test(contentType)
}

export function sendMessage(message: MessageType): Promise<unknown> {
  return chrome.runtime.sendMessage(message)
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/shared/messaging.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/shared/types.ts src/shared/messaging.ts src/shared/messaging.test.ts
git commit -m "feat: add shared types and messaging utilities for DevTools integration"
```

---

### Task 2: Endpoint Storage Module

**Files:**
- Create: `src/shared/endpointDb.ts`
- Test: `src/shared/endpointDb.test.ts`

**Step 1: Write failing tests**

```typescript
// src/shared/endpointDb.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveEndpoint, loadEndpoints, getEndpoint, deleteEndpoint, clearEndpoints, MAX_SNAPSHOTS } from './endpointDb'

beforeEach(() => {
  // chrome.storage.local mock is reset in test-setup.ts
})

describe('saveEndpoint', () => {
  it('creates a new endpoint', async () => {
    await saveEndpoint({
      id: 'abc',
      method: 'GET',
      domain: 'api.example.com',
      path: '/users/:param',
      snapshots: [],
      starred: false,
      lastSeen: Date.now(),
    })
    const result = await getEndpoint('abc')
    expect(result).toBeDefined()
    expect(result!.method).toBe('GET')
  })

  it('merges snapshots on existing endpoint', async () => {
    const base = {
      id: 'abc',
      method: 'GET',
      domain: 'api.example.com',
      path: '/users/:param',
      snapshots: [{ id: 's1', meta: {} as any, responseBody: '{}' }],
      starred: false,
      lastSeen: 1000,
    }
    await saveEndpoint(base)
    await saveEndpoint({
      ...base,
      snapshots: [{ id: 's2', meta: {} as any, responseBody: '[]' }],
      lastSeen: 2000,
    })
    const result = await getEndpoint('abc')
    expect(result!.snapshots).toHaveLength(2)
    expect(result!.lastSeen).toBe(2000)
  })

  it('caps snapshots at MAX_SNAPSHOTS', async () => {
    const snaps = Array.from({ length: MAX_SNAPSHOTS + 5 }, (_, i) => ({
      id: `s${i}`,
      meta: {} as any,
      responseBody: `{"i":${i}}`,
    }))
    await saveEndpoint({
      id: 'abc',
      method: 'GET',
      domain: 'api.example.com',
      path: '/test',
      snapshots: snaps,
      starred: false,
      lastSeen: Date.now(),
    })
    const result = await getEndpoint('abc')
    expect(result!.snapshots).toHaveLength(MAX_SNAPSHOTS)
  })
})

describe('loadEndpoints', () => {
  it('returns empty array when no endpoints', async () => {
    const result = await loadEndpoints()
    expect(result).toEqual([])
  })

  it('filters by domain', async () => {
    await saveEndpoint({ id: 'a', method: 'GET', domain: 'api.com', path: '/a', snapshots: [], starred: false, lastSeen: 1 })
    await saveEndpoint({ id: 'b', method: 'GET', domain: 'other.com', path: '/b', snapshots: [], starred: false, lastSeen: 2 })
    const result = await loadEndpoints('api.com')
    expect(result).toHaveLength(1)
    expect(result[0].domain).toBe('api.com')
  })
})

describe('deleteEndpoint', () => {
  it('removes an endpoint by id', async () => {
    await saveEndpoint({ id: 'abc', method: 'GET', domain: 'x', path: '/x', snapshots: [], starred: false, lastSeen: 1 })
    await deleteEndpoint('abc')
    const result = await getEndpoint('abc')
    expect(result).toBeUndefined()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/shared/endpointDb.test.ts`
Expected: FAIL

**Step 3: Implement endpoint storage**

```typescript
// src/shared/endpointDb.ts
import type { Endpoint } from './types'

const STORAGE_KEY = 'jf-endpoints'
export const MAX_SNAPSHOTS = 20

async function readAll(): Promise<Record<string, Endpoint>> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return result[STORAGE_KEY] || {}
}

async function writeAll(endpoints: Record<string, Endpoint>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: endpoints })
}

export async function saveEndpoint(endpoint: Endpoint): Promise<void> {
  const all = await readAll()
  const existing = all[endpoint.id]
  if (existing) {
    const merged = [...existing.snapshots, ...endpoint.snapshots]
    existing.snapshots = merged.slice(-MAX_SNAPSHOTS)
    existing.lastSeen = Math.max(existing.lastSeen, endpoint.lastSeen)
    existing.starred = endpoint.starred || existing.starred
    if (endpoint.schema) existing.schema = endpoint.schema
  } else {
    endpoint.snapshots = endpoint.snapshots.slice(-MAX_SNAPSHOTS)
    all[endpoint.id] = endpoint
  }
  await writeAll(all)
}

export async function loadEndpoints(domain?: string): Promise<Endpoint[]> {
  const all = await readAll()
  let endpoints = Object.values(all)
  if (domain) endpoints = endpoints.filter(e => e.domain === domain)
  return endpoints.sort((a, b) => b.lastSeen - a.lastSeen)
}

export async function getEndpoint(id: string): Promise<Endpoint | undefined> {
  const all = await readAll()
  return all[id]
}

export async function deleteEndpoint(id: string): Promise<void> {
  const all = await readAll()
  delete all[id]
  await writeAll(all)
}

export async function clearEndpoints(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/shared/endpointDb.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/endpointDb.ts src/shared/endpointDb.test.ts
git commit -m "feat: add endpoint storage module with snapshot management"
```

---

### Task 3: Background Service Worker — Message Router

**Files:**
- Modify: `src/background/index.ts`

**Step 1: Extend background to handle new message types**

```typescript
// src/background/index.ts
import { saveEndpoint, loadEndpoints, getEndpoint } from '../shared/endpointDb'
import type { MessageType } from '../shared/types'

chrome.runtime.onInstalled.addListener(() => {
  console.log('JSON Forge installed')
})

chrome.runtime.onMessage.addListener((message: MessageType | { action: string }, sender, sendResponse) => {
  // Legacy: content script "openForge" action
  if ('action' in message && message.action === 'openForge') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
    return
  }

  // New message protocol
  switch (message.type) {
    case 'SEND_TO_FORGE':
      // Store payload then open forge tab
      chrome.storage.local.set({ 'jf-payload': message.payload.json }).then(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/forge/index.html') })
      })
      return

    case 'SAVE_ENDPOINT':
      saveEndpoint(message.payload).then(() => sendResponse({ ok: true }))
      return true // async response

    case 'GET_ENDPOINTS':
      loadEndpoints(message.payload?.domain).then(endpoints => {
        sendResponse({ type: 'ENDPOINTS_RESULT', payload: endpoints })
      })
      return true

    case 'SAVE_SCHEMA':
      getEndpoint(message.payload.endpointId).then(async ep => {
        if (ep) {
          ep.schema = message.payload.schema
          await saveEndpoint(ep)
        }
        sendResponse({ ok: true })
      })
      return true

    case 'GET_SCHEMA':
      getEndpoint(message.payload.endpointId).then(ep => {
        sendResponse({ type: 'SCHEMA_RESULT', payload: { schema: ep?.schema || null } })
      })
      return true
  }
})
```

**Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: extend background service worker with endpoint message routing"
```

---

### Task 4: Manifest & Vite Config — DevTools Entry Point

**Files:**
- Modify: `src/manifest.ts`
- Create: `src/devtools/devtools.html`
- Create: `src/devtools/devtools.ts`
- Create: `src/devtools/panel/panel.html`
- Create: `src/devtools/panel/main.tsx`
- Modify: `vite.config.ts` (add devtools entry)

**Step 1: Update manifest**

Add to `src/manifest.ts` — add the `devtools_page` field:

```typescript
devtools_page: 'src/devtools/devtools.html',
```

Also add `src/devtools/panel/panel.html` to `web_accessible_resources` patterns if needed by CRXJS.

**Step 2: Create DevTools entry point**

```html
<!-- src/devtools/devtools.html -->
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <script type="module" src="./devtools.ts"></script>
</body>
</html>
```

```typescript
// src/devtools/devtools.ts
chrome.devtools.panels.create(
  'JSON Forge',
  '',
  'src/devtools/panel/panel.html'
)
```

**Step 3: Create panel HTML and React mount**

```html
<!-- src/devtools/panel/panel.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JSON Forge DevTools</title>
</head>
<body class="bg-[#1e1e2e] text-[#cdd6f4]">
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

```typescript
// src/devtools/panel/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import PanelApp from './PanelApp'

createRoot(document.getElementById('root')!).render(<PanelApp />)
```

**Step 4: Create placeholder PanelApp**

```typescript
// src/devtools/panel/PanelApp.tsx
import React from 'react'

export default function PanelApp() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-[#89b4fa]">JSON Forge — API Traffic</h1>
      <p className="text-sm text-[#a6adc8] mt-2">Capturing JSON API requests...</p>
    </div>
  )
}
```

**Step 5: Update vite.config.ts if needed**

CRXJS should auto-detect the devtools_page from manifest. Check if it works. If not, add to `build.rollupOptions.input`:

```typescript
devtools: 'src/devtools/devtools.html',
devtoolsPanel: 'src/devtools/panel/panel.html',
```

**Step 6: Verify build**

Run: `pnpm build`
Expected: Build succeeds, `dist/` contains devtools HTML + JS

**Step 7: Commit**

```bash
git add src/manifest.ts src/devtools/ vite.config.ts
git commit -m "feat: add DevTools panel entry point with React scaffolding"
```

---

### Task 5: Network Request Capture Hook

**Files:**
- Create: `src/devtools/panel/useNetworkCapture.ts`
- Create: `src/devtools/panel/useNetworkCapture.test.ts`

**Step 1: Write failing tests for request parsing**

```typescript
// src/devtools/panel/useNetworkCapture.test.ts
import { describe, it, expect } from 'vitest'
import { parseHarEntry } from './useNetworkCapture'

describe('parseHarEntry', () => {
  it('extracts meta from a HAR entry with JSON response', () => {
    const harEntry = {
      request: {
        method: 'GET',
        url: 'https://api.example.com/users/123?page=1',
        headers: [{ name: 'Authorization', value: 'Bearer xxx' }],
        postData: undefined,
      },
      response: {
        status: 200,
        headers: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
        content: { text: '{"id":123,"name":"Alice"}', size: 25, mimeType: 'application/json' },
      },
      time: 142,
      startedDateTime: '2026-03-05T10:00:00.000Z',
    }

    const result = parseHarEntry(harEntry as any)
    expect(result).not.toBeNull()
    expect(result!.meta.method).toBe('GET')
    expect(result!.meta.url).toBe('https://api.example.com/users/123?page=1')
    expect(result!.meta.status).toBe(200)
    expect(result!.meta.timing).toBe(142)
    expect(result!.responseBody).toBe('{"id":123,"name":"Alice"}')
  })

  it('returns null for non-JSON response', () => {
    const harEntry = {
      request: { method: 'GET', url: 'https://example.com/page', headers: [] },
      response: {
        status: 200,
        headers: [{ name: 'Content-Type', value: 'text/html' }],
        content: { text: '<html></html>', size: 13, mimeType: 'text/html' },
      },
      time: 50,
      startedDateTime: '2026-03-05T10:00:00.000Z',
    }

    expect(parseHarEntry(harEntry as any)).toBeNull()
  })

  it('returns null when response body is empty', () => {
    const harEntry = {
      request: { method: 'GET', url: 'https://api.com/health', headers: [] },
      response: {
        status: 204,
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        content: { text: '', size: 0, mimeType: 'application/json' },
      },
      time: 10,
      startedDateTime: '2026-03-05T10:00:00.000Z',
    }

    expect(parseHarEntry(harEntry as any)).toBeNull()
  })

  it('includes request body for POST', () => {
    const harEntry = {
      request: {
        method: 'POST',
        url: 'https://api.com/users',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        postData: { text: '{"name":"Bob"}', mimeType: 'application/json' },
      },
      response: {
        status: 201,
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        content: { text: '{"id":1}', size: 8, mimeType: 'application/json' },
      },
      time: 200,
      startedDateTime: '2026-03-05T10:00:00.000Z',
    }

    const result = parseHarEntry(harEntry as any)
    expect(result!.meta.requestBody).toBe('{"name":"Bob"}')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/devtools/panel/useNetworkCapture.test.ts`
Expected: FAIL

**Step 3: Implement capture hook + parseHarEntry**

```typescript
// src/devtools/panel/useNetworkCapture.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import type { RequestMeta, RequestSnapshot } from '../../shared/types'
import { isJsonContentType } from '../../shared/messaging'

interface HarHeader { name: string; value: string }
interface HarEntry {
  request: {
    method: string
    url: string
    headers: HarHeader[]
    postData?: { text: string; mimeType: string }
  }
  response: {
    status: number
    headers: HarHeader[]
    content: { text: string; size: number; mimeType: string }
  }
  time: number
  startedDateTime: string
  getContent: (cb: (content: string) => void) => void
}

export interface CapturedRequest {
  id: string
  meta: RequestMeta
  responseBody: string
}

export function parseHarEntry(entry: HarEntry): CapturedRequest | null {
  const contentType = entry.response.headers
    .find(h => h.name.toLowerCase() === 'content-type')?.value
  const mimeType = entry.response.content.mimeType

  if (!isJsonContentType(contentType) && !isJsonContentType(mimeType)) return null
  const body = entry.response.content.text
  if (!body) return null

  const headers: Record<string, string> = {}
  entry.response.headers.forEach(h => { headers[h.name.toLowerCase()] = h.value })

  const requestHeaders: Record<string, string> = {}
  entry.request.headers.forEach(h => { requestHeaders[h.name.toLowerCase()] = h.value })

  const meta: RequestMeta = {
    url: entry.request.url,
    method: entry.request.method,
    status: entry.response.status,
    headers,
    requestHeaders,
    requestBody: entry.request.postData?.text,
    timing: entry.time,
    timestamp: new Date(entry.startedDateTime).getTime(),
    size: entry.response.content.size,
  }

  return {
    id: `${meta.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    meta,
    responseBody: body,
  }
}

export function useNetworkCapture() {
  const [requests, setRequests] = useState<CapturedRequest[]>([])
  const [recording, setRecording] = useState(true)
  const recordingRef = useRef(recording)

  useEffect(() => { recordingRef.current = recording }, [recording])

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.devtools?.network) return

    const handler = (entry: HarEntry) => {
      if (!recordingRef.current) return
      // Use getContent for full response body
      entry.getContent((content: string) => {
        const fakeEntry = {
          ...entry,
          response: {
            ...entry.response,
            content: { ...entry.response.content, text: content },
          },
        }
        const parsed = parseHarEntry(fakeEntry)
        if (parsed) {
          setRequests(prev => [parsed, ...prev])
        }
      })
    }

    chrome.devtools.network.onRequestFinished.addListener(handler as any)
    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handler as any)
    }
  }, [])

  const clear = useCallback(() => setRequests([]), [])
  const toggleRecording = useCallback(() => setRecording(r => !r), [])

  return { requests, recording, clear, toggleRecording }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/devtools/panel/useNetworkCapture.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/devtools/panel/useNetworkCapture.ts src/devtools/panel/useNetworkCapture.test.ts
git commit -m "feat: add network capture hook with HAR entry parsing"
```

---

### Task 6: DevTools Panel — Request List UI

**Files:**
- Create: `src/devtools/panel/RequestList.tsx`
- Modify: `src/devtools/panel/PanelApp.tsx`

**Step 1: Build RequestList component**

```typescript
// src/devtools/panel/RequestList.tsx
import React from 'react'
import type { CapturedRequest } from './useNetworkCapture'

interface Props {
  requests: CapturedRequest[]
  selectedId: string | null
  onSelect: (req: CapturedRequest) => void
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'text-[#a6e3a1]'
    case 'POST': return 'text-[#f9e2af]'
    case 'PUT': return 'text-[#89b4fa]'
    case 'PATCH': return 'text-[#cba6f7]'
    case 'DELETE': return 'text-[#f38ba8]'
    default: return 'text-[#cdd6f4]'
  }
}

function statusColor(status: number): string {
  if (status < 300) return 'text-[#a6e3a1]'
  if (status < 400) return 'text-[#f9e2af]'
  return 'text-[#f38ba8]'
}

function extractPath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatTiming(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export default function RequestList({ requests, selectedId, onSelect }: Props) {
  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#6c7086] text-sm">
        No JSON requests captured yet. Browse a page with API calls.
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full text-xs font-mono">
      <table className="w-full">
        <thead className="sticky top-0 bg-[#1e1e2e] border-b border-[#313244]">
          <tr className="text-[#a6adc8] text-left">
            <th className="px-2 py-1 w-16">Method</th>
            <th className="px-2 py-1 w-14">Status</th>
            <th className="px-2 py-1">Path</th>
            <th className="px-2 py-1 w-16 text-right">Size</th>
            <th className="px-2 py-1 w-16 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr
              key={req.id}
              onClick={() => onSelect(req)}
              className={`cursor-pointer hover:bg-[#313244] ${
                selectedId === req.id ? 'bg-[#313244]' : ''
              }`}
            >
              <td className={`px-2 py-1 font-semibold ${methodColor(req.meta.method)}`}>
                {req.meta.method}
              </td>
              <td className={`px-2 py-1 ${statusColor(req.meta.status)}`}>
                {req.meta.status}
              </td>
              <td className="px-2 py-1 text-[#cdd6f4] truncate max-w-[300px]">
                {extractPath(req.meta.url)}
              </td>
              <td className="px-2 py-1 text-[#a6adc8] text-right">
                {formatSize(req.meta.size)}
              </td>
              <td className="px-2 py-1 text-[#a6adc8] text-right">
                {formatTiming(req.meta.timing)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Update PanelApp to wire up the request list**

```typescript
// src/devtools/panel/PanelApp.tsx
import React, { useState } from 'react'
import { useNetworkCapture, type CapturedRequest } from './useNetworkCapture'
import RequestList from './RequestList'

export default function PanelApp() {
  const { requests, recording, clear, toggleRecording } = useNetworkCapture()
  const [selected, setSelected] = useState<CapturedRequest | null>(null)

  return (
    <div className="flex flex-col h-screen bg-[#1e1e2e] text-[#cdd6f4]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#313244] bg-[#181825]">
        <span className="text-sm font-semibold text-[#89b4fa]">⚒ JSON Forge</span>
        <span className="text-xs text-[#6c7086]">|</span>
        <button
          onClick={toggleRecording}
          className={`text-xs px-2 py-0.5 rounded ${
            recording ? 'bg-[#f38ba8] text-[#1e1e2e]' : 'bg-[#313244] text-[#cdd6f4]'
          }`}
        >
          {recording ? '● Recording' : '○ Paused'}
        </button>
        <button
          onClick={clear}
          className="text-xs px-2 py-0.5 rounded bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4]"
        >
          Clear
        </button>
        <span className="ml-auto text-xs text-[#6c7086]">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`${selected ? 'w-1/2' : 'w-full'} border-r border-[#313244]`}>
          <RequestList
            requests={requests}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>
        {selected && (
          <div className="w-1/2 overflow-y-auto p-3 text-xs">
            {/* Placeholder — Task 7 will build RequestDetail */}
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-[#89b4fa]">
                {selected.meta.method} {extractPath(selected.meta.url)}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-[#6c7086] hover:text-[#cdd6f4]"
              >
                ✕
              </button>
            </div>
            <pre className="bg-[#181825] p-2 rounded overflow-auto max-h-[80vh] text-[#cdd6f4]">
              {JSON.stringify(JSON.parse(selected.responseBody), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function extractPath(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/devtools/panel/RequestList.tsx src/devtools/panel/PanelApp.tsx
git commit -m "feat: add request list UI for DevTools panel"
```

---

### Task 7: DevTools Panel — Request Detail + Actions

**Files:**
- Create: `src/devtools/panel/RequestDetail.tsx`
- Modify: `src/devtools/panel/PanelApp.tsx`

**Step 1: Build RequestDetail component**

```typescript
// src/devtools/panel/RequestDetail.tsx
import React, { useState } from 'react'
import type { CapturedRequest } from './useNetworkCapture'
import { sendMessage, normalizePathname, endpointId } from '../../shared/messaging'
import type { Endpoint, RequestSnapshot } from '../../shared/types'
import { jsonToSchema } from '../../forge/features/schema/schemaGenerator'

type DetailTab = 'response' | 'request' | 'headers'

interface Props {
  request: CapturedRequest
  onClose: () => void
}

export default function RequestDetail({ request, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>('response')
  const [copied, setCopied] = useState(false)

  const { meta, responseBody } = request

  const handleSendToForge = () => {
    sendMessage({ type: 'SEND_TO_FORGE', payload: { json: responseBody, meta } })
  }

  const handleGenerateSchema = () => {
    const schema = jsonToSchema(responseBody, 'draft-07')
    // Send schema to forge for viewing
    sendMessage({ type: 'SEND_TO_FORGE', payload: { json: schema, meta } })
  }

  const handleSaveEndpoint = () => {
    const url = new URL(meta.url)
    const normalized = normalizePathname(url.pathname)
    const id = endpointId(meta.method, normalized)
    const snapshot: RequestSnapshot = {
      id: request.id,
      meta,
      responseBody,
    }
    const endpoint: Endpoint = {
      id,
      method: meta.method,
      domain: url.hostname,
      path: normalized,
      snapshots: [snapshot],
      starred: false,
      lastSeen: meta.timestamp,
    }
    sendMessage({ type: 'SAVE_ENDPOINT', payload: endpoint })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(responseBody)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const formatBody = (body: string) => {
    try { return JSON.stringify(JSON.parse(body), null, 2) }
    catch { return body }
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'response', label: 'Response' },
    { key: 'request', label: 'Request Body' },
    { key: 'headers', label: 'Headers' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-[#313244]">
        <span className="font-semibold text-[#89b4fa] text-xs truncate">
          {meta.method} {meta.url}
        </span>
        <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4] text-sm ml-2">✕</button>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-[#313244] text-xs">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 ${
              tab === t.key
                ? 'text-[#89b4fa] border-b-2 border-[#89b4fa]'
                : 'text-[#6c7086] hover:text-[#cdd6f4]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs font-mono">
        {tab === 'response' && (
          <pre className="bg-[#181825] p-2 rounded whitespace-pre-wrap break-all">
            {formatBody(responseBody)}
          </pre>
        )}
        {tab === 'request' && (
          <pre className="bg-[#181825] p-2 rounded whitespace-pre-wrap break-all">
            {meta.requestBody ? formatBody(meta.requestBody) : '(no request body)'}
          </pre>
        )}
        {tab === 'headers' && (
          <div className="space-y-2">
            <div>
              <h4 className="text-[#a6adc8] mb-1 font-semibold">Response Headers</h4>
              <div className="bg-[#181825] p-2 rounded">
                {Object.entries(meta.headers).map(([k, v]) => (
                  <div key={k}><span className="text-[#9cdcfe]">{k}:</span> {v}</div>
                ))}
              </div>
            </div>
            {meta.requestHeaders && (
              <div>
                <h4 className="text-[#a6adc8] mb-1 font-semibold">Request Headers</h4>
                <div className="bg-[#181825] p-2 rounded">
                  {Object.entries(meta.requestHeaders).map(([k, v]) => (
                    <div key={k}><span className="text-[#9cdcfe]">{k}:</span> {v}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex gap-2 px-3 py-2 border-t border-[#313244] bg-[#181825]">
        <button onClick={handleSendToForge} className="text-xs px-2 py-1 rounded bg-[#89b4fa] text-[#1e1e2e] hover:bg-[#74c7ec]">
          Send to Forge
        </button>
        <button onClick={handleGenerateSchema} className="text-xs px-2 py-1 rounded bg-[#313244] hover:bg-[#45475a]">
          Generate Schema
        </button>
        <button onClick={handleSaveEndpoint} className="text-xs px-2 py-1 rounded bg-[#313244] hover:bg-[#45475a]">
          Save Endpoint
        </button>
        <button onClick={handleCopy} className="text-xs px-2 py-1 rounded bg-[#313244] hover:bg-[#45475a]">
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Update PanelApp to use RequestDetail**

Replace the placeholder `<pre>` block in PanelApp with:

```typescript
import RequestDetail from './RequestDetail'
// ... in the selected panel area:
{selected && (
  <div className="w-1/2">
    <RequestDetail request={selected} onClose={() => setSelected(null)} />
  </div>
)}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/devtools/panel/RequestDetail.tsx src/devtools/panel/PanelApp.tsx
git commit -m "feat: add request detail panel with send-to-forge and schema generation"
```

---

### Task 8: Schema Merge from Multiple Responses

**Files:**
- Create: `src/shared/schemaMerge.ts`
- Test: `src/shared/schemaMerge.test.ts`

**Step 1: Write failing tests**

```typescript
// src/shared/schemaMerge.test.ts
import { describe, it, expect } from 'vitest'
import { mergeSchemas } from './schemaMerge'

describe('mergeSchemas', () => {
  it('merges two identical schemas', () => {
    const s = { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] }
    const result = mergeSchemas([s, s])
    expect(result.properties.id.type).toBe('number')
    expect(result.required).toContain('id')
  })

  it('makes field optional if missing in one schema', () => {
    const s1 = {
      type: 'object',
      properties: { id: { type: 'number' }, name: { type: 'string' } },
      required: ['id', 'name'],
    }
    const s2 = {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    }
    const result = mergeSchemas([s1, s2])
    expect(result.required).toContain('id')
    expect(result.required).not.toContain('name')
    expect(result.properties.name).toBeDefined() // still in properties
  })

  it('creates oneOf for type conflicts', () => {
    const s1 = {
      type: 'object',
      properties: { value: { type: 'number' } },
      required: ['value'],
    }
    const s2 = {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
    }
    const result = mergeSchemas([s1, s2])
    expect(result.properties.value.oneOf).toBeDefined()
    expect(result.properties.value.oneOf).toContainEqual({ type: 'number' })
    expect(result.properties.value.oneOf).toContainEqual({ type: 'string' })
  })

  it('merges array item schemas', () => {
    const s1 = {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] } },
      },
      required: ['items'],
    }
    const s2 = {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'string' } }, required: ['a', 'b'] } },
      },
      required: ['items'],
    }
    const result = mergeSchemas([s1, s2])
    const itemProps = result.properties.items.items.properties
    expect(itemProps.a).toBeDefined()
    expect(itemProps.b).toBeDefined()
    // 'b' should not be required since it's missing in s1's items
    expect(result.properties.items.items.required).toContain('a')
    expect(result.properties.items.items.required).not.toContain('b')
  })

  it('returns single schema unchanged', () => {
    const s = { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] }
    expect(mergeSchemas([s])).toEqual(s)
  })

  it('handles empty array', () => {
    expect(mergeSchemas([])).toEqual({ type: 'object', properties: {} })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/shared/schemaMerge.test.ts`
Expected: FAIL

**Step 3: Implement schema merge**

```typescript
// src/shared/schemaMerge.ts

interface SchemaNode {
  type?: string
  properties?: Record<string, SchemaNode>
  required?: string[]
  items?: SchemaNode
  oneOf?: SchemaNode[]
  [key: string]: unknown
}

export function mergeSchemas(schemas: SchemaNode[]): SchemaNode {
  if (schemas.length === 0) return { type: 'object', properties: {} }
  if (schemas.length === 1) return schemas[0]
  return schemas.reduce((acc, s) => mergeTwoSchemas(acc, s))
}

function mergeTwoSchemas(a: SchemaNode, b: SchemaNode): SchemaNode {
  // If both are objects, merge properties
  if (a.type === 'object' && b.type === 'object') {
    return mergeObjectSchemas(a, b)
  }

  // If both are arrays, merge items
  if (a.type === 'array' && b.type === 'array') {
    return {
      type: 'array',
      items: a.items && b.items ? mergeTwoSchemas(a.items, b.items) : a.items || b.items,
    }
  }

  // Type conflict → oneOf
  if (a.type !== b.type) {
    const existing = a.oneOf || [{ type: a.type }]
    const bEntry = { type: b.type }
    if (!existing.some(e => e.type === b.type)) {
      existing.push(bEntry)
    }
    return { oneOf: existing }
  }

  return a
}

function mergeObjectSchemas(a: SchemaNode, b: SchemaNode): SchemaNode {
  const propsA = a.properties || {}
  const propsB = b.properties || {}
  const reqA = new Set(a.required || [])
  const reqB = new Set(b.required || [])

  const allKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)])
  const mergedProps: Record<string, SchemaNode> = {}
  const mergedRequired: string[] = []

  for (const key of allKeys) {
    const inA = key in propsA
    const inB = key in propsB

    if (inA && inB) {
      mergedProps[key] = mergeTwoSchemas(propsA[key], propsB[key])
      // Only required if required in both
      if (reqA.has(key) && reqB.has(key)) {
        mergedRequired.push(key)
      }
    } else {
      // Present in only one — include but not required
      mergedProps[key] = inA ? propsA[key] : propsB[key]
    }
  }

  return {
    type: 'object',
    properties: mergedProps,
    ...(mergedRequired.length > 0 ? { required: mergedRequired } : {}),
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/shared/schemaMerge.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/schemaMerge.ts src/shared/schemaMerge.test.ts
git commit -m "feat: add schema merge for multi-response contract inference"
```

---

### Task 9: Endpoint List View in DevTools

**Files:**
- Create: `src/devtools/panel/EndpointList.tsx`
- Modify: `src/devtools/panel/PanelApp.tsx`

**Step 1: Create EndpointList component**

```typescript
// src/devtools/panel/EndpointList.tsx
import React, { useState, useEffect } from 'react'
import type { Endpoint } from '../../shared/types'
import { sendMessage } from '../../shared/messaging'

interface Props {
  onSelectEndpoint: (endpoint: Endpoint) => void
}

export default function EndpointList({ onSelectEndpoint }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [search, setSearch] = useState('')

  const refresh = () => {
    chrome.runtime.sendMessage({ type: 'GET_ENDPOINTS' }, (response: any) => {
      if (response?.payload) setEndpoints(response.payload)
    })
  }

  useEffect(() => { refresh() }, [])

  // Group by domain
  const grouped: Record<string, Endpoint[]> = {}
  for (const ep of endpoints) {
    if (search && !ep.path.includes(search) && !ep.domain.includes(search)) continue
    ;(grouped[ep.domain] ||= []).push(ep)
  }

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="px-2 py-1 border-b border-[#313244]">
        <input
          type="text"
          placeholder="Filter endpoints..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#181825] text-[#cdd6f4] px-2 py-1 rounded text-xs border border-[#313244] focus:border-[#89b4fa] outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).map(([domain, eps]) => (
          <div key={domain}>
            <div className="px-2 py-1 text-[#a6adc8] font-semibold bg-[#181825] sticky top-0">
              {domain}
            </div>
            {eps.map(ep => (
              <div
                key={ep.id}
                onClick={() => onSelectEndpoint(ep)}
                className="px-2 py-1 hover:bg-[#313244] cursor-pointer flex items-center gap-2"
              >
                {ep.starred && <span className="text-[#f9e2af]">★</span>}
                <span className={`font-semibold w-12 ${methodColor(ep.method)}`}>{ep.method}</span>
                <span className="text-[#cdd6f4] truncate">{ep.path}</span>
                <span className="ml-auto text-[#6c7086]">{ep.snapshots.length}×</span>
              </div>
            ))}
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center text-[#6c7086] py-4">
            No saved endpoints. Click "Save Endpoint" on a request.
          </div>
        )}
      </div>
      <div className="px-2 py-1 border-t border-[#313244]">
        <button onClick={refresh} className="text-xs text-[#89b4fa] hover:underline">
          Refresh
        </button>
      </div>
    </div>
  )
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET': return 'text-[#a6e3a1]'
    case 'POST': return 'text-[#f9e2af]'
    case 'PUT': return 'text-[#89b4fa]'
    case 'PATCH': return 'text-[#cba6f7]'
    case 'DELETE': return 'text-[#f38ba8]'
    default: return 'text-[#cdd6f4]'
  }
}
```

**Step 2: Add view toggle to PanelApp**

Add a "Requests | Endpoints" toggle in the toolbar. When "Endpoints" is selected, show `<EndpointList>` instead of `<RequestList>`.

```typescript
// In PanelApp.tsx toolbar, add:
const [view, setView] = useState<'requests' | 'endpoints'>('requests')

// Toggle buttons:
<div className="flex bg-[#313244] rounded text-xs">
  <button
    onClick={() => setView('requests')}
    className={`px-2 py-0.5 rounded-l ${view === 'requests' ? 'bg-[#45475a] text-[#cdd6f4]' : 'text-[#6c7086]'}`}
  >
    Requests
  </button>
  <button
    onClick={() => setView('endpoints')}
    className={`px-2 py-0.5 rounded-r ${view === 'endpoints' ? 'bg-[#45475a] text-[#cdd6f4]' : 'text-[#6c7086]'}`}
  >
    Endpoints
  </button>
</div>

// In content area, conditionally render:
{view === 'requests' ? <RequestList ... /> : <EndpointList ... />}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/devtools/panel/EndpointList.tsx src/devtools/panel/PanelApp.tsx
git commit -m "feat: add endpoint list view with domain grouping in DevTools"
```

---

### Task 10: Integration Test — End-to-End Flow Verification

**Files:**
- Run existing + new tests

**Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass (existing 71 + new messaging + endpointDb + schemaMerge + parseHarEntry tests)

**Step 2: Run production build**

Run: `pnpm build`
Expected: Build succeeds, dist/ contains devtools HTML and panel

**Step 3: Manual verification checklist**

- [ ] Load extension in Chrome → DevTools → "JSON Forge" tab appears
- [ ] Browse a page with API calls → requests show in the list
- [ ] Click a request → detail panel with Response/Request/Headers tabs
- [ ] Click "Send to Forge" → Forge workbench opens with JSON loaded
- [ ] Click "Save Endpoint" → switch to Endpoints view, see it listed
- [ ] Click "Generate Schema" → Forge opens with generated schema

**Step 4: Commit if any fixes needed**

```bash
git commit -m "fix: integration fixes for DevTools panel"
```

---

## Group 2: Contract-Driven Generation (Product/Dev)

### Task 11: CodeGen Tab — Refactor TypeScript + Language Selector

**Files:**
- Create: `src/forge/features/codegen/CodeGenPanel.tsx`
- Create: `src/forge/features/codegen/types.ts`
- Move/refactor: `src/forge/features/ts-gen/tsGenerator.ts` → `src/forge/features/codegen/generators/typescript.ts`
- Modify: `src/forge/features/workbench/ToolPanel.tsx` (replace TypeScript tab with CodeGen tab)

**Step 1:** Create `types.ts` with `CodeGenerator` interface:
```typescript
export interface CodeGenerator {
  name: string
  language: string
  extension: string
  generate(json: string, rootName?: string): string
}
```

**Step 2:** Refactor existing TS generator to implement this interface.

**Step 3:** Create `CodeGenPanel.tsx` with language dropdown, generate button, Monaco output, copy/download.

**Step 4:** Update ToolPanel to use CodeGen tab instead of TypeScript.

**Step 5:** Test: existing tsGenerator tests still pass.

**Step 6:** Commit.

---

### Task 12: Java Code Generator

**Files:**
- Create: `src/forge/features/codegen/generators/java.ts`
- Test: `src/forge/features/codegen/generators/java.test.ts`

**TDD Steps:**
1. Write tests: flat object → POJO, nested → inner class, array → `List<T>`, nullable fields
2. Verify tests fail
3. Implement `JavaGenerator` — produces Java class with private fields, getters/setters, `@JsonProperty` annotations
4. Verify tests pass
5. Commit

---

### Task 13: Kotlin Code Generator

**Files:**
- Create: `src/forge/features/codegen/generators/kotlin.ts`
- Test: `src/forge/features/codegen/generators/kotlin.test.ts`

**TDD Steps:**
1. Write tests: flat → `data class`, nested → nested data class, array → `List<T>`, nullable `?`
2. Verify tests fail
3. Implement `KotlinGenerator`
4. Verify tests pass
5. Commit

---

### Task 14: Go Code Generator

**Files:**
- Create: `src/forge/features/codegen/generators/go.ts`
- Test: `src/forge/features/codegen/generators/go.test.ts`

**TDD Steps:**
1. Write tests: flat → struct with json tags, nested → nested struct, array → `[]Type`
2. Verify tests fail
3. Implement `GoGenerator`
4. Verify tests pass
5. Commit

---

### Task 15: Python Code Generator

**Files:**
- Create: `src/forge/features/codegen/generators/python.ts`
- Test: `src/forge/features/codegen/generators/python.test.ts`

**TDD Steps:**
1. Write tests: flat → Pydantic `BaseModel`, nested → nested model, array → `list[T]`, `Optional`
2. Verify tests fail
3. Implement `PythonGenerator`
4. Verify tests pass
5. Commit

---

### Task 16: Schema-Driven Mock Enhancement

**Files:**
- Create: `src/forge/features/mock/schemaMockGenerator.ts`
- Test: `src/forge/features/mock/schemaMockGenerator.test.ts`
- Modify: `src/forge/features/mock/MockPanel.tsx` (add "From Schema" toggle)

**TDD Steps:**
1. Write tests: minimum/maximum constraint, enum constraint, format constraint, minLength/maxLength, nested object, array with minItems
2. Verify tests fail
3. Implement schema-based mock generator using faker.js + Schema constraints
4. Verify tests pass
5. Update MockPanel to detect if a Schema is available and offer "Schema Mode" toggle
6. Build verification
7. Commit

---

### Task 17: OpenAPI Document Generation

**Files:**
- Create: `src/forge/features/apidoc/openApiGenerator.ts`
- Test: `src/forge/features/apidoc/openApiGenerator.test.ts`
- Create: `src/forge/features/apidoc/ApiDocPanel.tsx`
- Modify: `src/forge/features/workbench/ToolPanel.tsx` (add API Doc tab)

**TDD Steps:**
1. Write tests: single endpoint → valid OpenAPI 3.0, multiple endpoints grouped, schemas as $ref, request body included
2. Verify tests fail
3. Implement `generateOpenApi(endpoints: Endpoint[]): OpenApiSpec`
4. Verify tests pass
5. Build ApiDocPanel with endpoint selector, info editor (title/version), YAML/JSON toggle, copy/download
6. Add tab to ToolPanel
7. Build verification
8. Commit

---

### Task 18: Tab Structure Update

**Files:**
- Modify: `src/forge/features/workbench/ToolPanel.tsx`

**Steps:**
1. Update tabs array: Schema, CodeGen, Mock, Diff, Query, API Doc
2. Remove old TypeScript tab
3. Wire new CodeGenPanel and ApiDocPanel
4. Verify all tabs render correctly
5. Build verification
6. Commit

---

## Group 3: Testing & Regression

### Task 19: Install ajv + Schema Validator Utility

**Files:**
- Modify: `package.json` (add ajv)
- Create: `src/forge/features/validate/schemaValidator.ts`
- Test: `src/forge/features/validate/schemaValidator.test.ts`

**TDD Steps:**
1. `pnpm add ajv ajv-formats`
2. Write tests: valid JSON passes, missing required fails, type mismatch fails, format validation, nested errors with paths
3. Verify tests fail
4. Implement `validateJson(json: string, schema: object): ValidationResult` using ajv
5. Verify tests pass
6. Commit

---

### Task 20: Validate Tab in Forge

**Files:**
- Create: `src/forge/features/validate/ValidatePanel.tsx`
- Modify: `src/forge/features/workbench/ToolPanel.tsx` (add Validate tab)

**Steps:**
1. Build ValidatePanel: schema selector (from saved schemas), validate button, results list with path/error/expected/actual
2. Color coding: green pass, red errors
3. Add to ToolPanel as 7th tab
4. Build verification
5. Commit

---

### Task 21: Breaking Change Detection

**Files:**
- Create: `src/forge/features/validate/breakingChanges.ts`
- Test: `src/forge/features/validate/breakingChanges.test.ts`
- Modify: `src/forge/features/validate/ValidatePanel.tsx` (add "Compare Schemas" mode)

**TDD Steps:**
1. Write tests: field removed → breaking, type changed → breaking, new required → breaking, optional added → warning, no change → safe
2. Verify tests fail
3. Implement `detectBreakingChanges(oldSchema, newSchema): ChangeEntry[]`
4. Verify tests pass
5. Add "Compare Schemas" UI to ValidatePanel: old schema selector, new schema input, change report with severity badges
6. Build verification
7. Commit

---

### Task 22: Historical Response Diff Enhancement

**Files:**
- Modify: `src/forge/features/diff/DiffPanel.tsx` (add "From History" button)

**Steps:**
1. Add "From History" button that opens a modal/dropdown listing saved endpoint snapshots
2. User selects two snapshots → populates diff inputs
3. Reuses existing diffUtils.ts — no new logic needed, just UI wiring
4. Build verification
5. Commit

---

### Task 23: Assertion Code Generation

**Files:**
- Create: `src/forge/features/validate/assertionGenerator.ts`
- Test: `src/forge/features/validate/assertionGenerator.test.ts`
- Modify: `src/forge/features/validate/ValidatePanel.tsx` (add "Generate Assertions" button)

**TDD Steps:**
1. Write tests for each framework:
   - Jest: `expect(data.id).toBeTypeOf('number')`
   - Chai: `expect(data).to.have.property('id').that.is.a('number')`
   - Playwright: `expect(json.id).toBeDefined()`
   - pytest: `assert isinstance(data["id"], int)`
2. Verify tests fail
3. Implement `generateAssertions(json: string, framework: string): string`
4. Verify tests pass
5. Add framework selector + generate button + code output in ValidatePanel
6. Build verification
7. Commit

---

### Task 24: Final Integration & Cleanup

**Steps:**
1. Run full test suite: `pnpm vitest run`
2. Run production build: `pnpm build`
3. Verify all tabs in Forge workbench function
4. Verify DevTools panel captures and routes correctly
5. Update MEMORY.md with new file paths and architecture notes
6. Final commit

```bash
git commit -m "chore: all-in-one implementation complete — Groups 1-3"
```
