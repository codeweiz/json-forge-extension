# JSON Forge — Chrome Extension Design Doc

**Date**: 2026-03-04
**Status**: Approved

---

## 1. Product Positioning

**JSON Forge** is a Chrome extension that turns the browser into a lightweight API workbench. It automatically detects and renders JSON responses in-page, and provides a full-screen tool page ("Forge") for deep processing — generating TypeScript types, Mock data, JSON Schema, Diff, and more.

**Target users**: Frontend/backend developers, data analysts, QA engineers.

**Business model**: Free at launch, Freemium later (AI features, advanced export as paid tier).

---

## 2. Core User Journey

```
User visits API endpoint / page with JSON response
        ↓
Extension auto-detects → beautifies JSON in-page (replaces raw text)
        ↓
User clicks "Open in Forge" → full-screen tool page opens with JSON preloaded
        ↓
User processes JSON: format / compress / search / generate TS types / Mock / Schema / Diff
```

### Two Entry Points

| Entry | Scenario | Role |
|-------|----------|------|
| In-page auto render | Visiting API endpoint, quick structure view | Lightweight, zero-friction |
| Full-screen Forge page | Deep processing, conversion, generation | Professional workbench |

---

## 3. Pain Points Addressed

1. **Raw JSON in browser** — Chrome doesn't render JSON natively; competitors only format, never process further
2. **Manual TS interface writing** — Developers hand-write TypeScript interfaces from JSON, slow and error-prone
3. **Mock data guesswork** — No tool derives realistic Mock rules from real API responses
4. **Missing Schema docs** — Reverse-generating OpenAPI Schema from responses is a common team need with no good tooling

---

## 4. Feature Roadmap

### Phase 1 — MVP (Core pain points)

**In-page rendering**
- Auto-detect pure JSON response pages
- Syntax highlighting (key / string / number / boolean / null)
- Fold/unfold nodes (full collapse, by depth)
- Search highlight (key or value)
- Copy all / copy current node
- "Open in Forge" button → opens full-screen page with JSON passed via storage

**Forge (full-screen tool page)**
- Left: Monaco Editor / Right: rendered tree, dual-panel layout
- Format / Minify / Escape / Unescape
- Error detection with line highlighting for invalid JSON
- **Generate TypeScript interfaces** (handles nested types, optional fields, union types)
- Import from clipboard / file
- Export: copy to clipboard / download `.json`

### Phase 2 — Workflow integration

- **Generate JSON Schema** (Draft-07 / 2020-12)
- **Generate Mock data** (type inference + faker.js rules)
- **JSON Diff** — field-level comparison with highlight
- **JQ query** — run jq expressions in-browser (WASM), real-time results
- **JSONPath extraction** — expression + live result preview
- History: recent JSON sessions (local storage)

### Phase 3 — Ecosystem & moat

- **Generate OpenAPI/Swagger YAML** (reverse from response)
- **Multi-language code gen**: Python dataclass, Java POJO, Go struct, Zod schema
- JSON ↔ YAML / TOML / CSV conversion
- Snippet library (save frequently used JSON)
- Custom themes / keybindings

---

## 5. Competitive Moat

| Feature | Competitors | JSON Forge |
|---------|-------------|------------|
| Format / highlight | All have it | Yes (table stakes) |
| Generate TS types | Few, poor UX | **Deep support: nested, optional, union** |
| JSON Diff | Some | **Field-level precision** |
| Mock data generation | Almost none | **Type-inferred faker rules** |
| OpenAPI reverse gen | Essentially none | **Phase 3 core differentiator** |
| Page → Forge one-click | None | **Seamless handoff** |

---

## 6. Technical Architecture

### Project Structure

```
json-forge-extension/
├── manifest.json
├── src/
│   ├── content/
│   │   ├── detector.ts      # Detect JSON pages
│   │   ├── renderer.ts      # Replace raw text, render highlight tree
│   │   └── toolbar.ts       # Inject "Open in Forge" toolbar
│   ├── forge/               # Full-screen tool page (SPA)
│   │   ├── index.html
│   │   ├── App.tsx
│   │   └── features/
│   │       ├── editor/      # Monaco Editor integration
│   │       ├── ts-gen/      # TypeScript type generation
│   │       ├── schema/      # JSON Schema generation
│   │       ├── mock/        # Mock data generation
│   │       └── diff/        # JSON Diff
│   ├── popup/               # Extension icon popup (lightweight entry)
│   └── background/
│       └── index.ts         # Service Worker (data relay)
└── public/
    └── icons/
```

### Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React + TypeScript | Mature ecosystem, complex Forge UI needs components |
| Build | Vite + CRXJS | Best-in-class Chrome Extension DX |
| Editor | Monaco Editor | VS Code engine, syntax highlight + error hints built-in |
| Styling | Tailwind CSS | Fast iteration, no large CSS to maintain |
| TS generation | `json-to-typescript` / custom | Handles nesting, optional fields, union types |
| Mock generation | `@faker-js/faker` | Industry standard, type-inferred |
| Diff | `jsondiffpatch` | Field-level precision diff |
| JQ | `jq-web` (WASM) | Real jq in the browser |
| Storage | `chrome.storage.local` | History, snippets |

### Data Flow: Page → Forge

```
content script detects JSON
        ↓
renderer.ts renders in-page view
        ↓
user clicks "Open in Forge"
        ↓
background service worker stores JSON (chrome.storage.session)
        ↓
chrome.tabs.create → forge/index.html?source=page
        ↓
Forge reads storage, loads JSON into editor
```

### Manifest V3 Permissions (minimal)

```json
{
  "permissions": ["storage", "tabs"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{ "matches": ["<all_urls>"], "run_at": "document_end" }]
}
```

---

## 7. Success Criteria

- **Phase 1**: In-page render works on all JSON API endpoints; Forge page loads and generates TS types correctly
- **Phase 2**: JQ queries and Diff are accurate; Mock data is plausible given the input structure
- **Phase 3**: OpenAPI output passes validation; multi-language codegen compiles without errors
