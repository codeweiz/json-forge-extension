# JSON Forge All-in-One Design: API Developer's Complete Workbench

**Date:** 2026-03-05
**Status:** Approved
**Goal:** Transform JSON Forge from a JSON utility tool into an All-in-One API developer workbench that connects the full product-development-testing workflow, using JSON as the central thread.

---

## Core Concept

**Closed Loop Architecture:**
Browser API traffic capture -> Auto-generate Schema contracts -> Drive code/mock/doc generation -> Validate & regression test against contracts

**Key Differentiator:** Unlike Swagger Editor (contract-only) or Postman (request-only), JSON Forge works bidirectionally: capture real traffic AND generate from contracts, all within the browser.

## Target Users

All roles in the product-development-testing workflow:
- Frontend/Full-stack developers
- Backend/API developers
- QA/Test engineers

## Architecture

```
+-------------------------------------------------------+
|                    Chrome Browser                       |
|                                                         |
|  +----------------+   +-----------------------------+  |
|  | DevTools Panel  |   | Forge Workbench (tab)       |  |
|  |                |   |                             |  |
|  | API request    |-->| Monaco    | Tool Tabs       |  |
|  | list           |   | Editor    |                 |  |
|  | Quick preview  |   |           | Schema          |  |
|  | Schema validate|   |           | CodeGen         |  |
|  | One-click Send |   |           | Mock            |  |
|  +-------+--------+   |           | Diff            |  |
|          |             |           | Query           |  |
|          v             |           | API Doc         |  |
|  +----------------+   |           | Validate        |  |
|  | Background     |<->|           |                 |  |
|  | Service Worker |   +-----------------------------+  |
|  |                |                                     |
|  | - Message relay|   +-----------------------------+  |
|  | - Data storage |<->| Content Script (JSON pages)  |  |
|  | - Endpoint mgmt|   +-----------------------------+  |
|  +----------------+                                     |
+---------------------------------------------------------+
```

### Data Flows

1. **Capture flow:** DevTools Panel -> `chrome.devtools.network.onRequestFinished` -> Filter JSON responses -> Store in endpoint db via Background
2. **Processing flow:** DevTools "Send to Forge" -> Background relay -> Forge loads JSON + metadata (URL, method, headers)
3. **Content script flow:** Existing logic unchanged. JSON page detection -> "Open in Forge"
4. **Storage layer:** `chrome.storage.local` for endpoint history + Schema library + user preferences

### New File Structure

```
src/
  devtools/
    devtools.html          # DevTools entry point
    devtools.ts            # chrome.devtools.panels.create()
    panel/
      PanelApp.tsx         # DevTools panel React app
      RequestList.tsx      # API request list
      RequestDetail.tsx    # Request detail preview
      EndpointStore.ts     # Endpoint data management
      SchemaValidator.tsx  # Quick validation
    panel.html             # Panel HTML
  shared/
    messaging.ts           # Background <-> DevTools <-> Forge message protocol
    types.ts               # Shared type definitions
    endpointDb.ts          # Endpoint CRUD + chrome.storage wrapper
```

### Communication Protocol

```typescript
type Message =
  | { type: 'SEND_TO_FORGE'; payload: { json: string; meta: RequestMeta } }
  | { type: 'SAVE_ENDPOINT'; payload: Endpoint }
  | { type: 'SAVE_SCHEMA'; payload: { key: string; schema: object } }
  | { type: 'GET_SCHEMA'; payload: { key: string } }
  | { type: 'VALIDATE_RESPONSE'; payload: { json: string; schemaKey: string } }

interface RequestMeta {
  url: string;
  method: string;
  status: number;
  headers: Record<string, string>;
  timing: number;
  timestamp: number;
}

interface Endpoint {
  id: string;                    // method:path hash
  method: string;
  domain: string;
  path: string;                  // Normalized path (with :param)
  snapshots: RequestSnapshot[];  // Last 20 entries
  schema?: object;               // Associated Schema
  starred: boolean;
}
```

### Manifest Changes

```typescript
// Add
devtools_page: 'src/devtools/devtools.html',
// Existing permissions sufficient (storage, tabs)
```

---

## Implementation Groups (Strict Order: 1 -> 2 -> 3)

### Group 1: Traffic Capture -> Contract Generation (Infrastructure)

#### 1.1 DevTools Panel - Request List
- Left: request list, Right: preview panel (Network-panel-like, JSON-only)
- Auto-filter: only show responses with `Content-Type` containing `json`
- Each entry: `Method` `Status` `Path` `Size` `Time`
- Top toolbar: search filter, clear list, group-by-domain toggle, record toggle (pause/resume)

#### 1.2 Request Detail Preview
- 3 sub-tabs: `Response` / `Request Body` / `Headers`
- Response and Request Body use lightweight JSON tree (reuse `renderer.ts`)
- Action bar: Send to Forge, Generate Schema, Copy JSON, Copy cURL

#### 1.3 Endpoint Management
- Auto-aggregate by `method + pathname` (ignore query params)
- Smart path param detection: pure numeric/UUID segments -> `:param`
- Per-endpoint: last N request/response snapshots
- Tree view by domain -> path hierarchy
- Star/pin important endpoints
- Export endpoint list as JSON

#### 1.4 Schema Auto-Inference
- Single response: reuse existing `schemaGenerator.ts` (Draft-07 / Draft-2020-12)
- Multi-response merge (enhanced):
  - Optional fields: present in some responses -> remove from `required`
  - Union types: same field, different types -> `oneOf`
  - Array element variation: merge across responses for `items`
- Schema storage: per-endpoint in `chrome.storage.local`, key `schemas:{method}:{path}`
- User can edit Schema in Forge and save back

### Group 2: Contract-Driven Generation (Product/Dev)

#### 2.1 Multi-Language Code Generation
- New mode: generate from Schema (more accurate: optional, enum, union types)
- Language support:

| Language   | Output                        | Priority |
|------------|-------------------------------|----------|
| TypeScript | `interface` + `type`          | Done     |
| Java       | POJO class / Record           | High     |
| Kotlin     | `data class`                  | High     |
| Go         | `struct` with json tags       | High     |
| Python     | `dataclass` / Pydantic        | Medium   |
| Swift      | `Codable struct`              | Medium   |
| Dart       | `class` with fromJson/toJson  | Low      |

- Each language: `src/forge/features/codegen/{lang}Generator.ts`
- TypeScript tab -> CodeGen tab with language selector

#### 2.2 Schema-Driven Smart Mock
- Schema mode: generate based on constraints
  - `minimum/maximum` -> random number in range
  - `minLength/maxLength` -> matching length string
  - `enum` -> random pick from values
  - `pattern` (regex) -> template match
  - `format: "email"/"uri"/"date-time"` -> corresponding faker method
- Without Schema: keep existing field-name heuristic
- Mock count configurable (existing 1-20 retained)

#### 2.3 OpenAPI Document Generation
- Select endpoints -> generate OpenAPI 3.0 Spec (YAML/JSON)
- Auto-populate: path, method, parameters, requestBody, responses
- Schemas as `#/components/schemas` references
- Editable info (title, version, description)

#### 2.4 API Doc Preview & Sharing
- Lightweight inline rendering (simplified Swagger UI)
- Or generate standalone HTML file download (inline CSS/JS, no external deps)
- Export as Markdown

#### 2.5 Tab Restructure
Upgrade from 5 to 7 tabs:
```
Schema | CodeGen | Mock | Diff | Query | API Doc | Validate
```

### Group 3: Testing & Regression

#### 3.1 Schema Validator
- DevTools entry: "Validate" button in request detail (if endpoint has Schema)
- Forge entry: Validate tab, select saved Schema to validate against
- Output: green pass or error list with field path, error type, expected vs actual
- Library: `ajv` (JSON Schema validation standard)

#### 3.2 Breaking Change Detection
- Compare old/new Schema for same endpoint
- Change classification:
  - BREAKING: field removed, type changed, new required field in request
  - WARNING: optional field added
  - SAFE: description change
- Based on recursive Schema diff (extend `diffUtils.ts` approach)
- Output: change report, copyable as Markdown
- DevTools: yellow warning bar when inferred Schema differs from saved Schema

#### 3.3 Historical Response Diff
- DevTools: select two snapshots of same endpoint -> one-click Diff
- Forge Diff tab: "From History" button to pick comparison target
- Batch Diff: select all snapshots of an endpoint -> change timeline

#### 3.4 Assertion Code Generation
- Generate test assertions from Schema or JSON example:

| Framework       | Example Output                                          |
|-----------------|---------------------------------------------------------|
| Jest/Vitest     | `expect(res.data.id).toBeTypeOf('number')`              |
| Chai            | `expect(res.data).to.have.property('id').that.is.a('number')` |
| Playwright API  | `expect(response.json().id).toBeDefined()`              |
| Python pytest   | `assert isinstance(data["id"], int)`                    |

- User selects framework -> generate code -> copy

### New Dependencies

```
ajv  -- JSON Schema validation (only new production dependency needed)
```

---

## Competitive Landscape

| Tool | Strengths | JSON Forge Advantage |
|------|-----------|---------------------|
| JSON Viewer/Formatter | Simple, fast | Far more features |
| Postman/Insomnia | Full API client | No context switch, works in-browser |
| Swagger Editor | OpenAPI editing | Bidirectional: capture -> generate, not just edit |
| Chrome DevTools | Built-in network | JSON-focused, with generation tools |
| quicktype.io | Multi-lang types | Integrated with capture + Schema |

**JSON Forge's unique position:** The only tool that captures real API traffic in the browser AND generates contracts, code, mocks, docs, and tests from it — a complete closed loop without leaving the browser.
