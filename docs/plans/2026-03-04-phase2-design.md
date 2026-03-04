# JSON Forge Phase 2 — Design Doc

**Date**: 2026-03-04
**Status**: Approved

---

## 1. Goal

Extend JSON Forge from a formatting tool into a full workbench by adding five new capabilities: JSON Schema generation, Mock data generation, JSON Diff, JSONPath querying, and session History. All tools operate on the same source JSON in the left-panel Editor.

---

## 2. UI Layout: Left-Right Split Workbench

Replace the current top-tab layout with a persistent split-panel workbench.

```
┌─────────────────────────────────────────────────────────┐
│  ⚒ JSON Forge          [Import ▾]  [History ⌛]         │
├──────────────────────┬──────────────────────────────────┤
│                      │ [Schema][Mock][Diff][Query][TS]  │
│   Monaco Editor      ├──────────────────────────────────┤
│   (always visible)   │                                  │
│                      │         Tool output panel        │
│                      │         (changes with Tab)       │
│                      │                                  │
├──────────────────────┴──────────────────────────────────┤
│  ✓ Valid JSON  |  Format  Minify  Fix  Escape  Unescape │
└─────────────────────────────────────────────────────────┘
```

**Key decisions:**
- Left / right ratio: 50/50, draggable divider
- Right panel tabs: Schema → Mock → Diff → Query → TypeScript (TS tab migrated from top)
- History: top-bar drawer entry (cross-session management, not a tool tab)
- Bottom toolbar: existing Format / Minify / Fix / Escape / Unescape operations (unchanged)

---

## 3. Feature: JSON Schema Generation

**UX:** Left editor JSON → right Schema Tab shows live preview (300ms debounce). Version selector dropdown at top of tab: `Draft-07` / `Draft-2020-12`.

**Type inference rules:**

| JSON value | Output |
|-----------|--------|
| `"string"` | `"type": "string"` |
| `123` | `"type": "number"` |
| `true/false` | `"type": "boolean"` |
| `null` | Draft-07: `{"type": ["string","null"]}`; Draft-2020-12: `{"type": "null"}` |
| `[1,2,3]` | `"type": "array", "items": {"type": "number"}` |
| mixed array | `"items": {"oneOf": [...]}` |
| nested object | recursive inline schema (no `$defs`) |
| all keys present | included in `"required": [...]` |

**Draft-07 output example:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name"],
  "properties": {
    "id": { "type": "number" },
    "name": { "type": "string" }
  }
}
```

**Implementation:** Pure TypeScript, no third-party library. Same pattern as `tsGenerator.ts`.

**Actions:** `Copy` + `Download .json`

---

## 4. Feature: Mock Data Generation

**UX:** Mock Tab reads the left-panel JSON structure. Field names are semantically matched to faker categories. `Regenerate` button produces a new set. Lazy-loads `@faker-js/faker` on first tab activation.

**Field name → faker mapping:**

| Field name pattern | faker call |
|-------------------|-----------|
| `id`, `*_id` | `faker.string.uuid()` |
| `name` | `faker.person.fullName()` |
| `first_name`, `*firstName` | `faker.person.firstName()` |
| `last_name`, `*lastName` | `faker.person.lastName()` |
| `email` | `faker.internet.email()` |
| `phone` | `faker.phone.number()` |
| `url`, `avatar`, `image` | `faker.internet.url()` / `faker.image.url()` |
| `*_at`, `*_time`, `*_date` | `faker.date.recent().toISOString()` |
| `address`, `city`, `country` | `faker.location.*` |
| `title`, `description`, `content` | `faker.lorem.sentence()` |
| `price`, `amount` | `faker.number.float({ min: 1, max: 1000 })` |
| `status`, `type` (string) | original value preserved (enum-like) |
| other string | `faker.lorem.word()` |
| number | `faker.number.int()` |
| boolean | `faker.datatype.boolean()` |
| array | generate 2–3 items of same structure |

**Array root:** quantity selector (default 5, max 20).

**Actions:** `Regenerate` + `Copy` + `Download .json`

---

## 5. Feature: JSON Diff

**UX:** Two input panels inside the Diff Tab — Original (pre-filled from Editor) and New (user pastes). Result shown below with color-coded changes.

```
┌─────────────────────────────────────────────────────┐
│  [Original JSON]          [New JSON]                │
│  ┌───────────────┐        ┌───────────────┐         │
│  │  (from editor)│        │  (paste here) │         │
│  └───────────────┘        └───────────────┘         │
├─────────────────────────────────────────────────────┤
│  Diff Result                                        │
│  🟢 added:   "address": "..."                       │
│  🔴 removed: "phone": "..."                         │
│  🟡 changed: "name": "Alice" → "Bob"                │
│  ─ unchanged: "id": 1  (collapsed by default)      │
└─────────────────────────────────────────────────────┘
```

**Diff types:**
- `added` — in New, not in Original (green)
- `removed` — in Original, not in New (red)
- `changed` — key exists in both but value differs, shows `old → new` (yellow)
- `unchanged` — identical (collapsed by default, expandable)

**Nesting:** Recursive comparison, full path shown: `user.address.city: "Beijing" → "Shanghai"`

**Implementation:** `jsondiffpatch` library, custom rendering of delta output.

**Actions:** `Copy Diff Report` (text summary)

---

## 6. Feature: JSONPath Query

**UX:** Single expression input at top of Query Tab. Results update in real time (300ms debounce) against the left-panel Editor JSON.

```
┌─────────────────────────────────────────────────────┐
│  JSONPath  [$.users[*].email            ] [Copy]    │
├─────────────────────────────────────────────────────┤
│  3 matches                                          │
│  [0]  "alice@example.com"                           │
│  [1]  "bob@example.com"                             │
│  [2]  "charlie@example.com"                         │
└─────────────────────────────────────────────────────┘
```

**Supported syntax:**

| Expression | Meaning |
|-----------|---------|
| `$` | root |
| `$.foo` | child field |
| `$.foo.bar` | nested field |
| `$.users[0]` | array index |
| `$.users[*]` | all array elements |
| `$.users[*].email` | field extraction from array |
| `$..email` | recursive descent search |

**Results:** match count badge, each result indexed, complex objects collapsible. Copy copies all results as a JSON array.

**Implementation:** `jsonpath-plus` (pure JS, no WASM, tree-shakeable).

> JQ (WASM) excluded from this phase — bundle cost outweighs benefit, JSONPath covers 90% of query use cases.

---

## 7. Feature: History

**UX:** `History ⌛` button in top global bar opens a right-side drawer. Lists recent sessions grouped by date. Click `Load` to restore any entry into the Editor.

```
┌─────────────────────────────────────────────────────┐
│  History                                      [✕]  │
├─────────────────────────────────────────────────────┤
│  Today                                              │
│  ┌───────────────────────────────────────────────┐  │
│  │ {"users":[...]}    source: api.github.com     │  │
│  │ 14:32  ·  3.2 KB                      [Load] │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ {"id":1,"name":...}    source: (pasted)       │  │
│  │ 11:05  ·  0.8 KB                      [Load] │  │
│  └───────────────────────────────────────────────┘  │
│  Yesterday                                          │
│  ...                                                │
├─────────────────────────────────────────────────────┤
│  [Clear All]                                        │
└─────────────────────────────────────────────────────┘
```

**Auto-save triggers:**
1. JSON passed from content script via "Open in Forge" → saved immediately with source URL
2. User pastes/imports JSON in Forge and stays > 10 seconds → saved with source `(pasted)`
3. Editor edits do NOT trigger auto-save (avoids excessive storage writes)

**Storage schema per entry:**
```typescript
interface HistoryEntry {
  id: string           // uuid
  timestamp: number    // Date.now()
  source: string       // URL or "(pasted)"
  preview: string      // first 100 chars of JSON
  content: string      // full JSON string
}
```

**Constraints:**
- Storage: `chrome.storage.local`
- Max entries: 50 (oldest auto-evicted)
- Max single entry size: 1 MB (larger entries skipped silently)

**Actions:** `Load` (restores to Editor), `Clear All`

---

## 8. New Dependencies

| Package | Purpose | Load strategy |
|---------|---------|---------------|
| `@faker-js/faker` | Mock data generation | Dynamic import (lazy, on Mock tab open) |
| `jsondiffpatch` | JSON Diff delta computation | Static import (small, ~15 kB gzip) |
| `jsonpath-plus` | JSONPath expression evaluation | Static import (small, ~10 kB gzip) |

---

## 9. Success Criteria

- Schema output passes `ajv` validation for both Draft-07 and Draft-2020-12
- Mock output is valid JSON matching the original structure
- Diff correctly identifies all added / removed / changed fields in nested structures
- JSONPath `$..field` recursive descent returns correct results
- History saves and restores across browser sessions without data loss
