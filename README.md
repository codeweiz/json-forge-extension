# JSON Forge

> The API developer's All-in-One JSON workbench — Chrome Extension

[中文](./README.zh-CN.md)

[![CI](https://github.com/codeweiz/json-forge-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/codeweiz/json-forge-extension/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/codeweiz/json-forge-extension)](https://github.com/codeweiz/json-forge-extension/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

JSON Forge is a Chrome extension built for the entire API development lifecycle. Centered around JSON, it connects **design, development, and testing** into a seamless closed-loop workflow. It auto-renders JSON pages in the browser, captures API traffic from DevTools, and provides a full-featured workbench with code generation, schema validation, mock data, diff, queries, API docs, and test assertions — all without leaving the browser.

## Features

### 1. Auto JSON Page Rendering

When the browser opens a URL that returns JSON, JSON Forge automatically detects and renders it:

- Syntax highlighting (strings, numbers, booleans, null color-coded)
- Collapsible/expandable tree view
- Top toolbar with one-click "Open in Forge" to launch the full workbench

### 2. DevTools Traffic Capture Panel

A dedicated **JSON Forge** panel in Chrome DevTools captures API requests in real time:

| Feature | Description |
|---------|-------------|
| **Request List** | Auto-filters JSON responses; shows Method (color-coded), Status, Path, Size, Time |
| **Request Detail** | Three sub-tabs: Response Body / Request Body / Headers |
| **Recording Control** | Pause/resume capture, clear list |
| **One-Click Actions** | Send to Forge, Generate Schema, Save Endpoint, Copy JSON |
| **Endpoint Management** | Endpoints grouped by domain, auto-aggregated by method + normalized path (numeric/UUID segments replaced with `:param`), up to 20 snapshots per endpoint |

### 3. Forge Workbench (7 Tools)

Enter the full workbench via "Send to Forge" from DevTools or "Open in Forge" from the page toolbar. Left panel: Monaco editor. Right panel: 7-tab tool suite.

#### Schema — JSON Schema Generation

- Auto-derive JSON Schema from JSON data
- Supports Draft-07 and Draft-2020-12
- Real-time generation (300ms debounce)
- Copy or download

#### CodeGen — Multi-Language Code Generation

Generate type definitions from JSON in 5 languages:

| Language | Output |
|----------|--------|
| **TypeScript** | `interface` + `type` |
| **Java** | POJO class (private fields + getters/setters) |
| **Kotlin** | `data class` (nullable `?` support) |
| **Go** | `struct` (with `json:"tag"`, auto PascalCase) |
| **Python** | Pydantic `BaseModel` (auto camelCase to snake_case) |

Supports nested objects, arrays, union types, integer/float distinction. Copy or download generated code.

#### Mock — Smart Mock Data Generation

Two modes:

- **Field-Name Inference**: Generates realistic data by analyzing field name semantics (email, name, price, etc. — 16+ recognized field patterns)
- **Schema Mode**: Generates data based on JSON Schema constraints (minimum/maximum, enum, format, minLength/maxLength)

Supports batch array generation (1-20 items). Faker.js is lazy-loaded for optimal performance.

#### Diff — JSON Comparison

- Field-level diff detection: added (green), removed (red), changed (yellow), unchanged (gray)
- "From History" button: pick a comparison target from saved endpoint snapshots — no manual pasting
- Change summary stats + one-click copy report

#### Query — JSONPath Queries

- Real-time JSONPath expression evaluation (300ms debounce)
- Match count and result list
- 4 built-in example expressions, click to use
- Powered by jsonpath-plus

#### API Doc — OpenAPI Documentation Generation

- Generate OpenAPI 3.0 spec from saved endpoints
- Auto-extracts: paths, methods, path parameters, request bodies, response schemas
- JSON or YAML output format
- Editable document title and version
- Select which endpoints to include, then generate + download

#### Validate — Validation & Testing

Three sub-modes:

**Schema Validation**
- Paste a schema or load from saved endpoints
- Validates editor JSON against schema using ajv
- Detailed error list: field path, error type, expected vs. actual values

**Breaking Change Detection**
- Compare old and new schemas, auto-detect breaking changes
- Three severity levels: Breaking (field removed / type changed / new required field) | Warning (optional field added / enum value removed) | Safe
- Copy change report as Markdown

**Assertion Code Generation**
- Auto-generate test assertion code from JSON
- 4 frameworks: Jest/Vitest, Chai, Playwright, pytest
- Recursively traverses JSON structure; generates type checks, null checks, array checks

### 4. Additional Features

- **Theme**: Light, Dark, and Auto (follows system preference)
- **Internationalization (i18n)**: English and Chinese, switchable in Settings
- **Keyboard Shortcuts**:
  | Shortcut | Action |
  |----------|--------|
  | `Cmd/Ctrl+Shift+F` | Format JSON |
  | `Cmd/Ctrl+Shift+M` | Minify JSON |
  | `Cmd/Ctrl+Shift+C` | Copy to clipboard |
  | `Cmd/Ctrl+S` | Download file |
  | `Cmd/Ctrl+,` | Open Settings |
  | `Cmd/Ctrl+1-7` | Switch tool tabs |
  | `Esc` | Close drawer |
- **Settings Panel**: Theme, language, font size, tab size, word wrap, minimap — all persisted
- **Toast Notifications**: Non-intrusive feedback for copy, save, export, and error actions
- **Welcome Guide**: 3-step onboarding walkthrough for first-time users (re-accessible from Settings)
- **History**: Auto-saves editor content (after 10s idle), persists across sessions, load/clear support
- **JSON Toolbar**: Format, Minify, Fix (repair broken JSON), Escape, Unescape
- **Export**: Copy to clipboard or download as file

## Installation

### Development Mode

```bash
# Clone the repository
git clone https://github.com/codeweiz/json-forge-extension.git
cd json-forge-extension

# Install dependencies (pnpm required)
pnpm install

# Start dev server
pnpm dev
```

Load the extension in Chrome:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project root directory (CRXJS handles HMR automatically)

### Production Build

```bash
pnpm build
```

Build output is in `dist/` — load it as an unpacked extension in Chrome.

### Pre-built Release

Download the latest `.zip` or `.crx` from [GitHub Releases](https://github.com/codeweiz/json-forge-extension/releases/latest). Unzip and load as an unpacked extension, or drag the `.crx` file into `chrome://extensions/`.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 + CRXJS (Chrome Extension Vite Plugin) |
| Styling | Tailwind CSS v4 |
| Editor | Monaco Editor |
| Validation | ajv + ajv-formats |
| Mock Data | @faker-js/faker |
| Query | jsonpath-plus |
| Repair | jsonrepair |
| Testing | Vitest |

## Project Structure

```
src/
├── manifest.ts                     # Chrome MV3 manifest
├── i18n/                           # Internationalization
│   ├── i18n.tsx                    #   I18nProvider + translate()
│   └── locales/                    #   en.json, zh.json
├── shared/                         # Shared modules
│   ├── types.ts                    #   Type definitions (Endpoint, RequestMeta, etc.)
│   ├── messaging.ts                #   Message protocol + utilities
│   ├── endpointDb.ts               #   Endpoint storage CRUD
│   ├── schemaMerge.ts              #   Multi-response schema merging
│   ├── settings.ts                 #   Settings type + load/save
│   ├── SettingsProvider.tsx         #   React settings context provider
│   ├── shortcuts.ts                #   Keyboard shortcut definitions
│   └── ToastProvider.tsx            #   Toast notification context
├── devtools/                       # DevTools panel
│   ├── devtools.ts                 #   Panel registration
│   └── panel/                      #   Panel UI
│       ├── PanelApp.tsx            #     Main app (Requests/Endpoints views)
│       ├── useNetworkCapture.ts    #     Network request capture hook
│       ├── RequestList.tsx         #     Request list
│       ├── RequestDetail.tsx       #     Request detail + action bar
│       └── EndpointList.tsx        #     Endpoint list (grouped by domain)
├── background/
│   └── index.ts                    # Service Worker message router
├── content/                        # Content script (lightweight DOM, no React)
│   ├── detector.ts                 #   JSON page detection
│   ├── renderer.ts                 #   JSON tree rendering
│   ├── toolbar.ts                  #   Top toolbar
│   └── index.ts                    #   Entry point
├── forge/                          # Forge workbench
│   ├── App.tsx                     #   Main app
│   ├── components/                 #   Shared components (Layout, SplitPane, TabBar)
│   └── features/
│       ├── editor/                 #   Monaco editor + JSON utilities
│       ├── schema/                 #   JSON Schema generation
│       ├── codegen/                #   Multi-language code generation
│       │   └── generators/         #     TypeScript, Java, Kotlin, Go, Python
│       ├── mock/                   #   Mock data generation (field-name + schema modes)
│       ├── diff/                   #   JSON diff + history comparison
│       ├── query/                  #   JSONPath queries
│       ├── apidoc/                 #   OpenAPI document generation
│       ├── validate/               #   Schema validation + breaking changes + assertions
│       ├── history/                #   History management
│       ├── workbench/              #   Tool panel (7-tab routing)
│       ├── settings/               #   Settings drawer
│       └── welcome/                #   Welcome onboarding modal
└── popup/                          # Extension popup
```

## Development

```bash
# Run tests
pnpm vitest run

# Run a single test file
pnpm vitest run src/shared/messaging.test.ts

# Dev mode (HMR)
pnpm dev

# Production build
pnpm build

# Lint
pnpm lint
```

## Design Philosophy

**Closed-Loop Workflow**: JSON Forge's core differentiator is its bidirectional closed loop — it generates contracts (schemas) from real API traffic, then drives code generation, mock data, documentation, and tests from those contracts. This makes it not just a JSON formatter, but a full-cycle API development workbench covering design, development, and testing.

**Browser-Native**: Everything happens inside the browser. No need to switch to Postman, Swagger Editor, or other external tools. The DevTools panel integrates seamlessly into the developer's existing workflow.

**Lightweight-First**: The content script uses vanilla DOM (no React). Faker.js is lazy-loaded. Monaco Editor initializes on demand. The extension never compromises page performance.

## License

[MIT](LICENSE)
