# CI/CD, Bilingual README & GitHub Metadata Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up GitHub Actions CI/CD with .zip and .crx release artifacts, create English and Chinese READMEs, add MIT LICENSE, and configure GitHub project metadata.

**Architecture:** Two GitHub Actions workflows (CI on push/PR, Release on tag push). Bilingual README with language switcher links. GitHub metadata via `gh` CLI. CRX signing uses `crx3` npm package with PEM key stored as GitHub Secret.

**Tech Stack:** GitHub Actions, pnpm, crx3, softprops/action-gh-release, gh CLI

---

### Task 1: Add MIT LICENSE file

**Files:**
- Create: `LICENSE`

**Context:** The project currently has no LICENSE file. `package.json` does not specify a license field. The existing README says "MIT" at the bottom.

**Step 1: Create LICENSE file**

Create `LICENSE` at project root with the standard MIT license text:

```text
MIT License

Copyright (c) 2026 codeweiz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Add license field to package.json**

Add `"license": "MIT"` to `package.json` (after the `"version"` field).

**Step 3: Commit**

```bash
git add LICENSE package.json
git commit -m "chore: add MIT LICENSE file and package.json license field"
```

---

### Task 2: Create CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Context:** No `.github/` directory exists yet. This workflow runs lint, test, and build on every push to `master` and every PR targeting `master`. The project uses pnpm (see `package.json` scripts: `lint`, `vitest run`, `build`).

**Step 1: Create directories**

```bash
mkdir -p .github/workflows
```

**Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint

      - run: pnpm vitest run

      - run: pnpm build
```

**Step 3: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>/dev/null || npx yaml-lint .github/workflows/ci.yml 2>/dev/null || echo "Verify YAML manually"
```

If neither tool available, visually confirm indentation is correct.

**Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI workflow (lint + test + build)"
```

---

### Task 3: Create Release workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Context:** This workflow triggers on tag pushes matching `v*`. It builds the extension, creates both a .zip (from `dist/`) and a .crx (via `crx3` with PEM key from secrets), then publishes a GitHub Release with both artifacts and auto-generated release notes.

**Important:** The `CRX_PRIVATE_KEY` GitHub Secret must be configured by the user manually. This workflow will still create the .zip even if the CRX step fails (they're independent steps). Document this in the workflow comments.

**Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - name: Get version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> "$GITHUB_OUTPUT"

      - name: Create ZIP
        run: cd dist && zip -r ../json-forge-${{ steps.version.outputs.VERSION }}.zip .

      - name: Create CRX
        if: env.HAS_CRX_KEY == 'true'
        env:
          HAS_CRX_KEY: ${{ secrets.CRX_PRIVATE_KEY != '' }}
        run: |
          echo "${{ secrets.CRX_PRIVATE_KEY }}" > /tmp/key.pem
          npx crx3 dist -p /tmp/key.pem -o json-forge-${{ steps.version.outputs.VERSION }}.crx
          rm /tmp/key.pem

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            json-forge-*.zip
            json-forge-*.crx
```

**Notes on the CRX step:**
- Uses `if: env.HAS_CRX_KEY == 'true'` so the release still works without the secret (just no .crx)
- The `softprops/action-gh-release` glob pattern `json-forge-*.crx` will simply match nothing if CRX wasn't built
- User must later run `openssl genrsa 2048 > key.pem` and add the content as `CRX_PRIVATE_KEY` secret on GitHub

**Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add Release workflow (zip + crx on tag push)"
```

---

### Task 4: Rewrite README.md in English

**Files:**
- Modify: `README.md` (complete rewrite)

**Context:** The current `README.md` is entirely in Chinese. We're rewriting it in English as the default. The GitHub remote is `codeweiz/json-forge-extension`. Include CI badge, release badge, license badge, and a link to the Chinese README at the top.

The README should cover all current features including the new UX enhancements (theme switching light/dark/auto, i18n English/Chinese, keyboard shortcuts, settings panel, toast notifications, welcome onboarding).

**Step 1: Write the English README**

Replace `README.md` entirely with:

```markdown
# JSON Forge

> The API developer's All-in-One JSON workbench — Chrome Extension

[中文](./README.zh-CN.md)

[![CI](https://github.com/codeweiz/json-forge-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/codeweiz/json-forge-extension/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/codeweiz/json-forge-extension)](https://github.com/codeweiz/json-forge-extension/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

JSON Forge is a Chrome extension for the entire API development workflow. Centered on JSON, it connects **design, development, debugging, and testing** into a seamless loop. It auto-renders JSON pages in your browser and provides a DevTools traffic capture panel, code generation, schema validation, assertion generation, and more — all in one place.

## Features

### 1. Auto JSON Page Rendering

When your browser opens a URL returning JSON, JSON Forge automatically detects and renders it:

- Syntax highlighting (strings, numbers, booleans, null — each in a distinct color)
- Collapsible/expandable tree structure
- Toolbar with one-click "Open in Forge" to enter the full workbench

### 2. DevTools Traffic Capture Panel

A **JSON Forge** panel in Chrome DevTools captures API requests in real time:

| Feature | Description |
|---------|-------------|
| **Request List** | Auto-filters JSON responses; shows Method (color-coded), Status, Path, Size, Time |
| **Request Detail** | Three sub-tabs: Response Body / Request Body / Headers |
| **Recording Control** | Pause/resume capture, clear list |
| **One-Click Actions** | Send to Forge, Generate Schema, Save Endpoint, Copy JSON |
| **Endpoint Management** | Grouped by domain, auto-aggregates same API paths (smart parameter detection), keeps last 20 snapshots per endpoint |

### 3. Forge Workbench (7 Tools)

Enter via DevTools "Send to Forge" or the page toolbar "Open in Forge". Left: Monaco editor. Right: tool panel.

#### Schema — JSON Schema Generation

- Auto-derive JSON Schema from data
- Supports Draft-07 and Draft-2020-12
- Real-time generation (300ms debounce)
- Copy and download

#### CodeGen — Multi-Language Code Generation

Generate type definitions from JSON in 5 languages:

| Language | Output |
|----------|--------|
| **TypeScript** | `interface` + `type` |
| **Java** | POJO class (private fields + getters/setters) |
| **Kotlin** | `data class` (supports nullable `?`) |
| **Go** | `struct` (with `json:"tag"`, auto PascalCase) |
| **Python** | Pydantic `BaseModel` (auto camelCase to snake_case) |

Supports nested objects, arrays, union types, integer/float distinction. Copy or download generated code.

#### Mock — Smart Mock Data Generation

Two modes:

- **Field-Name Inference**: Generates realistic data based on field name semantics (email, name, price, etc. — covers 16+ common patterns)
- **Schema Mode**: Generates based on JSON Schema constraints (minimum/maximum, enum, format, minLength/maxLength)

Supports batch generation (1-20 items). Faker.js lazy-loaded for performance.

#### Diff — JSON Comparison

- Field-level diff: added (green), removed (red), changed (yellow), unchanged (gray)
- "From History" button: pick a saved endpoint snapshot to compare — no manual pasting
- Change summary stats + one-click copy report

#### Query — JSONPath Query

- Real-time JSONPath expression evaluation (300ms debounce)
- Shows match count and result list
- 4 built-in example expressions, click to use
- Powered by jsonpath-plus

#### API Doc — OpenAPI Document Generation

- Generate OpenAPI 3.0 spec from saved endpoints
- Auto-extracts: path, method, path parameters, request body, response schema
- JSON / YAML output formats
- Editable document title and version
- Select endpoints to include, one-click generate + download

#### Validate — Validation & Testing

Three sub-modes:

**Schema Validation**
- Paste a schema or load from saved endpoints
- Validates editor JSON against schema using ajv
- Detailed error list: field path, error type, expected vs. actual

**Breaking Change Detection**
- Compare two schemas, auto-detect breaking changes
- Three-level classification: Breaking (field removed/type changed/new required) | Warning (new optional field/enum removed) | Safe
- Change report copyable as Markdown

**Assertion Code Generation**
- Auto-generate test assertions from JSON
- 4 frameworks: Jest/Vitest, Chai, Playwright, pytest
- Recursive traversal: type checks + null checks + array checks

### 4. Additional Features

- **Theme**: Light / Dark / Auto (follows system preference)
- **i18n**: English and Chinese
- **Keyboard Shortcuts**: Format (Cmd+Shift+F), Minify (Cmd+Shift+M), Copy (Cmd+Shift+C), Download (Cmd+S), tab switching (Cmd+1-7), Settings (Cmd+,)
- **Settings Panel**: Theme, language, editor font size, tab size, word wrap, minimap
- **Toast Notifications**: Visual feedback for copy, download, save operations
- **Welcome Guide**: 3-step onboarding for first-time users
- **History**: Auto-saves editor content (after 10s idle), persists across sessions, load/clear
- **JSON Toolbar**: Format, Minify, Fix (repair broken JSON), Escape/Unescape
- **Export**: Copy to clipboard, download as file

## Installation

### Development Mode

```bash
git clone https://github.com/codeweiz/json-forge-extension.git
cd json-forge-extension

# Install dependencies (must use pnpm)
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

Build output is in `dist/`, ready to load in Chrome.

### Pre-built Release

Download the latest `.zip` or `.crx` from [Releases](https://github.com/codeweiz/json-forge-extension/releases/latest).

- `.zip` — Unpack and load in Chrome developer mode
- `.crx` — Direct install (drag into `chrome://extensions/`)

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 + CRXJS (Chrome Extension Vite Plugin) |
| Styling | Tailwind CSS v4 |
| Editor | Monaco Editor |
| Validation | ajv + ajv-formats |
| Mock | @faker-js/faker |
| Query | jsonpath-plus |
| Repair | jsonrepair |
| Testing | Vitest |

## Project Structure

```
src/
├── manifest.ts                  # Chrome MV3 manifest
├── shared/                      # Shared modules
│   ├── types.ts                 #   Type definitions (Endpoint, RequestMeta, etc.)
│   ├── messaging.ts             #   Message protocol + utilities
│   ├── endpointDb.ts            #   Endpoint storage CRUD
│   ├── schemaMerge.ts           #   Multi-response schema merging
│   ├── settings.ts              #   Settings model + persistence
│   ├── SettingsProvider.tsx      #   Settings React Context
│   ├── shortcuts.ts             #   Keyboard shortcut definitions
│   └── ToastProvider.tsx         #   Toast notification context
├── i18n/                        # Internationalization
│   ├── i18n.tsx                 #   I18nProvider + useI18n hook
│   └── locales/                 #   Translation files (en.json, zh.json)
├── devtools/                    # DevTools panel
│   ├── devtools.ts              #   Panel registration
│   └── panel/                   #   Panel UI
│       ├── PanelApp.tsx         #     Main app (Requests/Endpoints views)
│       ├── useNetworkCapture.ts #     Network request capture hook
│       ├── RequestList.tsx      #     Request table
│       ├── RequestDetail.tsx    #     Request detail + actions
│       └── EndpointList.tsx     #     Endpoint list (grouped by domain)
├── background/
│   └── index.ts                 # Service Worker message router
├── content/                     # Content script (lightweight DOM, no React)
│   ├── detector.ts              #   JSON page detection
│   ├── renderer.ts              #   JSON tree rendering
│   ├── toolbar.ts               #   Top toolbar
│   └── index.ts                 #   Entry point
├── forge/                       # Forge workbench
│   ├── App.tsx                  #   Main app
│   ├── components/              #   Common components (Layout, SplitPane, TabBar)
│   └── features/
│       ├── editor/              #   Monaco editor + JSON tools
│       ├── schema/              #   JSON Schema generation
│       ├── codegen/             #   Multi-language code generation
│       │   └── generators/      #     TypeScript, Java, Kotlin, Go, Python
│       ├── mock/                #   Mock data generation
│       ├── diff/                #   JSON Diff + history comparison
│       ├── query/               #   JSONPath queries
│       ├── apidoc/              #   OpenAPI document generation
│       ├── validate/            #   Schema validation + Breaking Change + assertions
│       ├── history/             #   History management
│       ├── settings/            #   Settings drawer
│       ├── welcome/             #   Welcome onboarding modal
│       └── workbench/           #   Tool panel (7-tab router)
└── popup/                       # Extension popup
```

## Development

```bash
# Run tests
pnpm vitest run

# Run single test file
pnpm vitest run src/shared/messaging.test.ts

# Dev mode (HMR)
pnpm dev

# Production build
pnpm build

# Lint
pnpm lint
```

## Design Philosophy

**Closed-Loop Workflow**: JSON Forge's key differentiator is its bidirectional loop — it generates contracts (Schema) from real API traffic, and drives code generation, mock data, documentation, and tests from those contracts. This makes it more than a JSON beautifier: it's a full API development workbench covering design, development, and testing.

**Browser-Native**: Everything runs in the browser — no need to switch to Postman, Swagger Editor, or other external tools. The DevTools panel integrates seamlessly with your daily workflow.

**Lightweight First**: Content script uses plain DOM (no React), Faker.js is lazy-loaded, Monaco Editor initializes on demand — ensuring the extension doesn't impact page performance.

## License

[MIT](LICENSE)
```

**Step 2: Verify no broken markdown**

Visually inspect the file renders correctly. Check all internal links point to valid files (`LICENSE`, `README.zh-CN.md`).

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README.md in English"
```

---

### Task 5: Create README.zh-CN.md in Chinese

**Files:**
- Create: `README.zh-CN.md`

**Context:** This is the Chinese version of the README, following the same structure as the English version. Include a link to the English README at the top.

**Step 1: Create `README.zh-CN.md`**

This should be a faithful Chinese translation of `README.md`. The existing Chinese README content (current `README.md` before rewrite) can serve as the base, but update it to match the new structure and include new features (theme, i18n, shortcuts, settings, toast, welcome guide).

```markdown
# JSON Forge

> API 开发者的 All-in-One JSON 工作台 — Chrome 浏览器扩展

[English](./README.md)

[![CI](https://github.com/codeweiz/json-forge-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/codeweiz/json-forge-extension/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/codeweiz/json-forge-extension)](https://github.com/codeweiz/json-forge-extension/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

JSON Forge 是一款面向 API 开发全流程的 Chrome 扩展，以 JSON 为核心，打通**产品设计、开发调试、测试回归**的完整闭环。它不仅能自动美化浏览器中的 JSON 页面，还提供了 DevTools 流量捕获、代码生成、Schema 校验、断言生成等一站式工具链。

## 功能概览

### 1. JSON 页面自动渲染

当浏览器打开返回 JSON 的页面时，JSON Forge 自动检测并渲染：

- 语法高亮（字符串、数字、布尔值、null 分色显示）
- 可折叠/展开的树形结构
- 顶部工具栏，一键「Open in Forge」进入完整工作台

### 2. DevTools 流量捕获面板

在 Chrome DevTools 中新增 **JSON Forge** 面板，实时捕获页面的 API 请求：

| 功能 | 说明 |
|------|------|
| **请求列表** | 自动过滤 JSON 响应，展示 Method（彩色标识）、Status、Path、Size、Time |
| **请求详情** | 三个子标签：Response Body / Request Body / Headers |
| **录制控制** | 暂停/恢复捕获、清空列表 |
| **一键操作** | Send to Forge、Generate Schema、Save Endpoint、Copy JSON |
| **端点管理** | 按域名分组的端点列表，自动聚合相同 API（路径参数智能识别），每个端点保留最近 20 条快照 |

### 3. Forge 工作台（7 大工具）

通过 DevTools「Send to Forge」或页面工具栏「Open in Forge」进入完整工作台，左侧 Monaco 编辑器 + 右侧工具面板：

#### Schema — JSON Schema 生成

- 从 JSON 数据自动推导 JSON Schema
- 支持 Draft-07 和 Draft-2020-12 两种版本
- 实时生成（300ms 防抖）
- 支持复制和下载

#### CodeGen — 多语言代码生成

从 JSON 一键生成 5 种语言的类型定义代码：

| 语言 | 生成产物 |
|------|---------|
| **TypeScript** | `interface` + `type` |
| **Java** | POJO class（private 字段 + getter/setter） |
| **Kotlin** | `data class`（支持 nullable `?`） |
| **Go** | `struct`（含 `json:"tag"` 标签，自动转 PascalCase） |
| **Python** | Pydantic `BaseModel`（自动 camelCase → snake_case） |

支持嵌套对象、数组、联合类型、整数/浮点区分。生成后可直接复制或下载。

#### Mock — 智能 Mock 数据生成

两种模式：

- **字段名推测模式**：根据字段名语义自动生成逼真数据（email → 邮箱、name → 姓名、price → 价格等，覆盖 16 种常见字段模式）
- **Schema 模式**：基于 JSON Schema 约束生成（minimum/maximum、enum、format、minLength/maxLength）

支持数组批量生成（1-20 条），Faker.js 懒加载不影响首屏性能。

#### Diff — JSON 对比

- 字段级差异检测：新增（绿）、删除（红）、变更（黄）、未变（灰）
- 「From History」按钮：从已保存的端点快照中选择对比对象，无需手动粘贴
- 变更摘要统计 + 一键复制报告

#### Query — JSONPath 查询

- 实时 JSONPath 表达式求值（300ms 防抖）
- 显示匹配数量和结果列表
- 内置 4 个示例表达式，点击即用
- 基于 jsonpath-plus

#### API Doc — OpenAPI 文档生成

- 从已保存的端点生成 OpenAPI 3.0 规范
- 自动提取：路径、方法、路径参数、请求体、响应 Schema
- 支持 JSON / YAML 两种输出格式
- 可编辑文档标题和版本号
- 勾选需要包含的端点，一键生成 + 下载

#### Validate — 校验 & 测试

三个子模式：

**Schema 校验**
- 粘贴 Schema 或从已保存端点加载
- 使用 ajv 校验编辑器中的 JSON 是否符合 Schema
- 详细错误列表：字段路径、错误类型、期望值 vs 实际值

**Breaking Change 检测**
- 对比新旧两份 Schema，自动识别破坏性变更
- 三级分类：Breaking（字段删除/类型变更/新增必填） | Warning（新增可选字段/枚举值移除） | Safe
- 变更报告可复制为 Markdown

**断言代码生成**
- 从 JSON 自动生成测试断言代码
- 支持 4 种框架：Jest/Vitest、Chai、Playwright、pytest
- 递归遍历 JSON 结构，生成类型检查 + 空值检查 + 数组检查

### 4. 其他功能

- **主题**：浅色 / 深色 / 自动（跟随系统偏好）
- **多语言**：中文和英文
- **快捷键**：格式化 (Cmd+Shift+F)、压缩 (Cmd+Shift+M)、复制 (Cmd+Shift+C)、下载 (Cmd+S)、切换标签 (Cmd+1-7)、设置 (Cmd+,)
- **设置面板**：主题、语言、编辑器字号、缩进大小、自动换行、迷你地图
- **操作提示**：复制、下载、保存等操作的视觉反馈
- **欢迎引导**：首次使用时的 3 步引导
- **历史记录**：自动保存编辑内容（10 秒无操作后），跨会话持久化，支持加载/清除
- **JSON 工具栏**：Format（美化）、Minify（压缩）、Fix（修复损坏 JSON）、Escape/Unescape
- **导出**：复制到剪贴板、下载为文件

## 安装

### 开发模式

```bash
git clone https://github.com/codeweiz/json-forge-extension.git
cd json-forge-extension

# 安装依赖（必须使用 pnpm）
pnpm install

# 启动开发服务器
pnpm dev
```

在 Chrome 中加载扩展：

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目根目录（CRXJS 会自动处理 HMR）

### 生产构建

```bash
pnpm build
```

构建产物在 `dist/` 目录，可直接在 Chrome 中加载。

### 预构建版本

从 [Releases](https://github.com/codeweiz/json-forge-extension/releases/latest) 下载最新的 `.zip` 或 `.crx` 文件。

- `.zip` — 解压后在 Chrome 开发者模式中加载
- `.crx` — 直接安装（拖入 `chrome://extensions/`）

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 5.9 |
| 构建 | Vite 7 + CRXJS（Chrome Extension Vite Plugin） |
| 样式 | Tailwind CSS v4 |
| 编辑器 | Monaco Editor |
| 校验 | ajv + ajv-formats |
| Mock | @faker-js/faker |
| 查询 | jsonpath-plus |
| 修复 | jsonrepair |
| 测试 | Vitest |

## 项目结构

```
src/
├── manifest.ts                  # Chrome MV3 清单
├── shared/                      # 共享模块
│   ├── types.ts                 #   类型定义（Endpoint, RequestMeta 等）
│   ├── messaging.ts             #   消息协议 + 工具函数
│   ├── endpointDb.ts            #   端点存储 CRUD
│   ├── schemaMerge.ts           #   多响应 Schema 合并
│   ├── settings.ts              #   设置模型 + 持久化
│   ├── SettingsProvider.tsx      #   设置 React Context
│   ├── shortcuts.ts             #   快捷键定义
│   └── ToastProvider.tsx         #   Toast 通知 Context
├── i18n/                        # 国际化
│   ├── i18n.tsx                 #   I18nProvider + useI18n hook
│   └── locales/                 #   翻译文件 (en.json, zh.json)
├── devtools/                    # DevTools 面板
│   ├── devtools.ts              #   面板注册
│   └── panel/                   #   面板 UI
│       ├── PanelApp.tsx         #     主应用（Requests/Endpoints 视图）
│       ├── useNetworkCapture.ts #     网络请求捕获 Hook
│       ├── RequestList.tsx      #     请求列表
│       ├── RequestDetail.tsx    #     请求详情 + 操作栏
│       └── EndpointList.tsx     #     端点列表（按域名分组）
├── background/
│   └── index.ts                 # Service Worker 消息路由
├── content/                     # 内容脚本（轻量 DOM，无 React）
│   ├── detector.ts              #   JSON 页面检测
│   ├── renderer.ts              #   JSON 树渲染
│   ├── toolbar.ts               #   顶部工具栏
│   └── index.ts                 #   入口
├── forge/                       # Forge 工作台
│   ├── App.tsx                  #   主应用
│   ├── components/              #   通用组件（Layout, SplitPane, TabBar）
│   └── features/
│       ├── editor/              #   Monaco 编辑器 + JSON 工具
│       ├── schema/              #   JSON Schema 生成
│       ├── codegen/             #   多语言代码生成
│       │   └── generators/      #     TypeScript, Java, Kotlin, Go, Python
│       ├── mock/                #   Mock 数据生成（字段名 + Schema 模式）
│       ├── diff/                #   JSON Diff + 历史对比
│       ├── query/               #   JSONPath 查询
│       ├── apidoc/              #   OpenAPI 文档生成
│       ├── validate/            #   Schema 校验 + Breaking Change + 断言生成
│       ├── history/             #   历史记录管理
│       ├── settings/            #   设置面板
│       ├── welcome/             #   欢迎引导弹窗
│       └── workbench/           #   工具面板（7 Tab 路由）
└── popup/                       # 扩展弹出窗口
```

## 开发

```bash
# 运行测试
pnpm vitest run

# 单文件测试
pnpm vitest run src/shared/messaging.test.ts

# 开发模式（HMR）
pnpm dev

# 生产构建
pnpm build

# 代码检查
pnpm lint
```

## 设计理念

**闭环工作流**：JSON Forge 的核心差异化在于双向闭环——既能从真实 API 流量自动生成契约（Schema），又能从契约驱动生成代码、Mock、文档和测试。这种闭环让它不仅仅是一个 JSON 美化工具，而是覆盖产研测全流程的 API 开发工作台。

**浏览器原生**：所有功能都在浏览器中完成，无需切换到 Postman、Swagger Editor 或其他外部工具。DevTools 面板与开发者的日常工作流无缝集成。

**轻量优先**：内容脚本使用纯 DOM（无 React），Faker.js 懒加载，Monaco Editor 按需初始化，确保扩展不影响页面性能。

## License

[MIT](LICENSE)
```

**Step 2: Commit**

```bash
git add README.zh-CN.md
git commit -m "docs: add Chinese README (README.zh-CN.md)"
```

---

### Task 6: Set GitHub metadata

**Context:** This task uses the `gh` CLI (GitHub CLI) to set repo description, topics, and optionally homepage. Requires the user to be authenticated with `gh auth login`.

**Step 1: Verify gh CLI is available and authenticated**

```bash
gh auth status
```

Expected: Shows authenticated user. If not, instruct user to run `gh auth login`.

**Step 2: Set repository description**

```bash
gh repo edit codeweiz/json-forge-extension --description "The API developer's All-in-One JSON workbench — Chrome Extension"
```

**Step 3: Set repository topics**

```bash
gh repo edit codeweiz/json-forge-extension --add-topic chrome-extension --add-topic json --add-topic devtools --add-topic api --add-topic schema --add-topic codegen --add-topic mock --add-topic openapi --add-topic jsonpath --add-topic typescript --add-topic react --add-topic vite
```

**Step 4: Verify**

```bash
gh repo view codeweiz/json-forge-extension --json description,repositoryTopics
```

**Step 5: Commit (nothing to commit — metadata is on GitHub, not in repo)**

No git commit needed for this task. All changes are on GitHub's side.

---

### Post-Implementation: CRX Key Setup (Manual, user action)

After all tasks are complete, remind the user to set up CRX signing:

```bash
# Generate a PEM key (run once, locally)
openssl genrsa 2048 > key.pem

# Add as GitHub Secret:
# Go to: https://github.com/codeweiz/json-forge-extension/settings/secrets/actions
# Create secret named: CRX_PRIVATE_KEY
# Paste the full content of key.pem

# Or via CLI:
gh secret set CRX_PRIVATE_KEY < key.pem

# Test the release:
git tag v1.0.0
git push origin v1.0.0
```

Then verify the release appears at `https://github.com/codeweiz/json-forge-extension/releases`.
