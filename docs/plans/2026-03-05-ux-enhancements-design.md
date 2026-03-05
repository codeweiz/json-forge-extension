# UX Enhancements Design: Theme, i18n, Toast, Shortcuts, Settings, Onboarding

**Date:** 2026-03-05
**Status:** Approved
**Goal:** Transform JSON Forge from a developer-only tool into a polished, user-friendly product with theme switching, multilingual support, operation feedback, keyboard shortcuts, settings management, and onboarding.

---

## 1. Theme System

### 1.1 CSS Variable Extraction

Replace 181 hardcoded color hex values across 20+ files with CSS custom properties.

**Variable palette:**
```css
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
  --jf-success: #a6e3a1;
  --jf-warning: #f9e2af;
  --jf-error: #f38ba8;
  --jf-purple: #cba6f7;
  --jf-syn-key: #9cdcfe;
  --jf-syn-string: #ce9178;
  --jf-syn-number: #b5cea8;
  --jf-syn-boolean: #569cd6;
  --jf-syn-null: #808080;
}
```

### 1.2 Light Theme

```css
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
  --jf-success: #16a34a;
  --jf-warning: #ca8a04;
  --jf-error: #dc2626;
  --jf-purple: #9333ea;
  --jf-syn-key: #0451a5;
  --jf-syn-string: #a31515;
  --jf-syn-number: #098658;
  --jf-syn-boolean: #0000ff;
  --jf-syn-null: #808080;
}
```

### 1.3 Theme Modes

```typescript
type ThemeMode = 'light' | 'dark' | 'auto'
```

- `auto` uses `window.matchMedia('(prefers-color-scheme: dark)')` with change listener
- Theme stored in `chrome.storage.local` as part of settings
- Applied via `data-theme` attribute on `<html>` element

### 1.4 Monaco Custom Themes

Register `jf-dark` and `jf-light` themes via `monaco.editor.defineTheme()` with colors matching CSS variables. Replace all `theme="vs-dark"` with dynamic theme name.

### 1.5 Scope

All Tailwind classes: `bg-[#1e1e2e]` -> `bg-[var(--jf-bg)]` (20+ files)
CSS files: `renderer.css`, `devtools/panel/index.css`, `forge/index.css`
Content script inline styles: use CSS variables

---

## 2. Multilingual i18n

### 2.1 Architecture

- Chrome `_locales/` for extension metadata (name, description)
- Custom `src/i18n/` for Forge and DevTools panel runtime strings
- React Context + `useI18n()` hook for component-level translation

### 2.2 File Structure

```
src/
  i18n/
    locales/
      en.json
      zh.json
    i18n.tsx          # I18nProvider + useI18n hook
  _locales/
    en/messages.json
    zh_CN/messages.json
```

### 2.3 Translation Keys (module-grouped)

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
  "devtools.recording": "Recording",
  "devtools.paused": "Paused",
  "devtools.requests": "Requests",
  "devtools.endpoints": "Endpoints",
  "devtools.sendToForge": "Send to Forge",
  "devtools.generateSchema": "Generate Schema",
  "devtools.saveEndpoint": "Save Endpoint",
  "devtools.copyJson": "Copy JSON",
  "devtools.endpointSaved": "Endpoint saved",
  "devtools.noRequests": "No JSON requests captured yet. Browse a page with API calls.",
  "devtools.noEndpoints": "No saved endpoints. Click 'Save Endpoint' on a request.",

  "schema.version": "Version",
  "codegen.language": "Language",
  "mock.regenerate": "Regenerate",
  "mock.schemaMode": "Schema Mode",
  "mock.count": "Count",
  "diff.pasteNew": "Paste new JSON here to compare...",
  "diff.fromHistory": "From History",
  "diff.showUnchanged": "Show unchanged",
  "diff.copyReport": "Copy Report",
  "query.placeholder": "Enter JSONPath expression...",
  "validate.validate": "Validate",
  "validate.compare": "Compare",
  "validate.assertions": "Assertions",
  "validate.loadSchema": "Load Schema",
  "validate.framework": "Framework",
  "validate.valid": "Valid",
  "validate.breaking": "Breaking",
  "validate.warning": "Warning",
  "validate.safe": "Safe",

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

  "history.title": "History",
  "history.noHistory": "No history yet. JSON sessions will appear here.",
  "history.load": "Load",
  "history.clearAll": "Clear All",

  "welcome.title": "Welcome to JSON Forge",
  "welcome.step1Title": "Your API Workbench",
  "welcome.step1Desc": "Format, validate, and transform JSON right in your browser.",
  "welcome.step2Title": "Capture API Traffic",
  "welcome.step2Desc": "Open DevTools and switch to the JSON Forge tab to capture live API requests.",
  "welcome.step3Title": "7 Powerful Tools",
  "welcome.step3Desc": "Schema, CodeGen, Mock, Diff, Query, API Doc, and Validate — all in one place.",
  "welcome.getStarted": "Get Started"
}
```

### 2.4 Chrome Native i18n

```json
// _locales/en/messages.json
{ "extName": { "message": "JSON Forge" }, "extDescription": { "message": "The API developer's JSON workbench" } }

// _locales/zh_CN/messages.json
{ "extName": { "message": "JSON Forge" }, "extDescription": { "message": "API 开发者的 JSON 工作台" } }
```

### 2.5 Supported Languages

- English (en) — default
- Chinese (zh)

Default: follow `navigator.language`, fallback to `en`.

---

## 3. Toast Notification System

### 3.1 Component

```typescript
// src/forge/components/Toast.tsx
type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number  // default 2000ms
}
```

- Position: bottom-right, stacked upward
- Auto-dismiss after duration
- Smooth enter/exit animation (CSS transition)
- Uses CSS variables for theme compatibility
- Success: green accent, Error: red accent, Info: blue accent

### 3.2 Hook

```typescript
// useToast() returns { toast }
// toast.success(message)
// toast.error(message)
// toast.info(message)
```

### 3.3 Coverage

- 9 copy operations -> `toast.success(t('common.copied'))`
- Download operations -> `toast.success(t('common.downloaded'))`
- Save Endpoint -> `toast.success(t('devtools.endpointSaved'))`
- Error cases -> `toast.error(message)`

Provided via React Context at App level and DevTools PanelApp level.

---

## 4. Keyboard Shortcuts

### 4.1 Shortcut Definitions

```typescript
// src/shared/shortcuts.ts
interface Shortcut {
  key: string
  mod: boolean       // Cmd (Mac) / Ctrl (Win)
  shift?: boolean
  action: string
  labelKey: string   // i18n key for display
}

const SHORTCUTS: Shortcut[] = [
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
  { key: 'Escape', mod: false, action: 'close', labelKey: 'common.close' },
]
```

### 4.2 Implementation

- Global `useEffect` keydown listener in App.tsx and PanelApp.tsx
- `e.preventDefault()` to override browser defaults (Cmd+S etc.)
- Action dispatch via callback map
- Display Cmd on Mac, Ctrl on Windows (detect via `navigator.platform`)

---

## 5. Settings Panel

### 5.1 Entry Point

Gear icon button in Layout header, next to History button. Opens right-side drawer (same pattern as HistoryDrawer).

### 5.2 Settings Model

```typescript
interface Settings {
  theme: 'light' | 'dark' | 'auto'
  locale: 'en' | 'zh'
  fontSize: number       // 12-20, default 13
  tabSize: 2 | 4         // default 2
  wordWrap: boolean       // default true
  minimap: boolean        // default false
}

const STORAGE_KEY = 'jf-settings'
```

### 5.3 Settings Sections

1. **Appearance** — Theme selector (Light / Dark / Auto)
2. **Language** — Locale selector (English / Chinese)
3. **Editor** — Font size, tab size, word wrap toggle, minimap toggle
4. **Keyboard Shortcuts** — Read-only reference table
5. **About** — Version number + "Show Welcome Guide" button

### 5.4 Persistence

- `chrome.storage.local` key `jf-settings`
- Settings loaded on mount, applied immediately
- Changes applied in real-time (no save button needed)

---

## 6. Welcome Guide (First-Run Onboarding)

### 6.1 Welcome Modal

3-step modal shown on first Forge page open:

- **Step 1:** "Your API Workbench" — overview of capabilities
- **Step 2:** "Capture API Traffic" — DevTools panel introduction
- **Step 3:** "7 Powerful Tools" — tool tabs overview

Navigation: dots indicator + Next/Back buttons + "Get Started" on last step.

### 6.2 Trigger Logic

- `chrome.storage.local` key `jf-welcomed`
- First open: `jf-welcomed` not set -> show modal
- After completion: set `jf-welcomed: true`
- Settings panel "Show Welcome Guide" button: delete `jf-welcomed` and re-show

### 6.3 Component

```typescript
// src/forge/components/WelcomeModal.tsx
interface Step {
  titleKey: string
  descKey: string
  icon: string  // emoji or simple SVG
}
```

Backdrop overlay, centered modal, CSS variable themed, animated step transitions.

---

## Implementation Order

1. **Settings infrastructure** — storage, model, provider context (foundation for everything else)
2. **Theme system** — CSS variables, light/dark themes, Monaco themes, variable migration
3. **i18n system** — provider, translation files, text migration
4. **Toast system** — component, hook, context, migrate copy/download operations
5. **Keyboard shortcuts** — definitions, global listener, action dispatch
6. **Settings panel UI** — drawer, all sections, wire settings
7. **Welcome modal** — component, trigger logic, help page
8. **Integration** — full test suite, build verification

Each depends on the previous for full integration but can be partially parallelized (e.g., Toast and Shortcuts are independent).
