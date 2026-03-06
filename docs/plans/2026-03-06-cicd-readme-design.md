# CI/CD, Bilingual README & GitHub Metadata Design

**Date:** 2026-03-06
**Status:** Approved
**Goal:** Set up GitHub Actions for CI and tag-triggered releases (with .zip and .crx artifacts), create bilingual README files, and configure GitHub project metadata.

---

## 1. GitHub Actions CI

### 1.1 Workflow: `.github/workflows/ci.yml`

Triggers: push to `master`, pull requests to `master`.

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

Single job (lint + test + build) — simple, sufficient for this project size.

---

## 2. GitHub Actions Release

### 2.1 Workflow: `.github/workflows/release.yml`

Triggers: push tags matching `v*` (e.g., `v1.0.0`).

**Steps:**
1. Checkout + pnpm install + build
2. Zip `dist/` directory → `json-forge-v{version}.zip`
3. Pack CRX using `crx3` npm package with PEM private key from secret
4. Create GitHub Release with both artifacts + auto-generated changelog

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
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Create ZIP
        run: cd dist && zip -r ../json-forge-${{ steps.version.outputs.VERSION }}.zip .

      - name: Create CRX
        run: |
          echo "${{ secrets.CRX_PRIVATE_KEY }}" > /tmp/key.pem
          npx crx3 dist -p /tmp/key.pem -o json-forge-${{ steps.version.outputs.VERSION }}.crx
          rm /tmp/key.pem

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            json-forge-${{ steps.version.outputs.VERSION }}.zip
            json-forge-${{ steps.version.outputs.VERSION }}.crx
```

### 2.2 CRX Signing

- Generate PEM key locally: `openssl genrsa 2048 > key.pem`
- Store as GitHub Secret: `CRX_PRIVATE_KEY`
- `crx3` npm package creates CRX3 format (Chrome's current standard)

### 2.3 Release Flow

```
git tag v1.0.0
git push origin v1.0.0
→ release.yml runs
→ GitHub Release created with:
  - json-forge-1.0.0.zip (for Chrome developer mode loading)
  - json-forge-1.0.0.crx (for direct installation)
  - Auto-generated changelog from commits
```

---

## 3. Bilingual README

### 3.1 Structure

- `README.md` — English (default, shown on GitHub)
- `README.zh-CN.md` — Chinese

Both files include a language switcher link at the top:
- English: `[中文](./README.zh-CN.md)`
- Chinese: `[English](./README.md)`

### 3.2 Content Outline

Both READMEs share the same structure:

1. **Header** — Logo area + tagline + badges (CI status, version, license)
2. **Features** — Feature overview with sections for each capability
3. **Installation** — Development mode + production build instructions
4. **Usage** — Key scenarios (browse JSON, capture traffic, generate code, etc.)
5. **Tech Stack** — Table of technologies
6. **Project Structure** — Directory tree
7. **Development** — Commands for testing, building, linting
8. **License** — MIT

### 3.3 Badges

```markdown
[![CI](https://github.com/{owner}/{repo}/actions/workflows/ci.yml/badge.svg)](...)
[![Release](https://github.com/{owner}/{repo}/releases/latest)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
```

---

## 4. LICENSE File

MIT license file at project root: `LICENSE`

---

## 5. GitHub Metadata

Using `gh` CLI commands:

```bash
# Repository description
gh repo edit --description "The API developer's All-in-One JSON workbench — Chrome Extension"

# Topics
gh repo edit --add-topic chrome-extension,json,devtools,api,schema,codegen,mock,openapi,jsonpath,typescript,react,vite

# Homepage (if applicable)
gh repo edit --homepage "https://chromewebstore.google.com/..."
```

---

## Implementation Order

1. Add LICENSE file
2. Create `.github/workflows/ci.yml`
3. Create `.github/workflows/release.yml`
4. Rewrite `README.md` in English
5. Create `README.zh-CN.md` in Chinese
6. Set GitHub metadata via `gh` CLI
