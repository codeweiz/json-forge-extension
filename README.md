# JSON Forge

> API 开发者的 All-in-One JSON 工作台 — Chrome 浏览器扩展

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

- **历史记录**：自动保存编辑内容（10 秒无操作后），跨会话持久化，支持加载/清除
- **JSON 工具栏**：Format（美化）、Minify（压缩）、Fix（修复损坏 JSON）、Escape/Unescape
- **导出**：复制到剪贴板、下载为文件

## 安装

### 开发模式

```bash
# 克隆项目
git clone https://github.com/user/json-forge-extension.git
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

## 使用方式

### 场景一：浏览 API 返回的 JSON

1. 在浏览器中打开一个返回 JSON 的 URL
2. JSON Forge 自动渲染为带语法高亮的可折叠树
3. 点击顶部工具栏的「Open in Forge」进入完整工作台

### 场景二：捕获页面 API 流量

1. 打开 Chrome DevTools（F12）
2. 切换到「JSON Forge」标签
3. 浏览页面，所有 JSON API 请求会自动出现在列表中
4. 点击某条请求查看详情
5. 点击「Save Endpoint」保存端点，或「Send to Forge」进入编辑

### 场景三：从 API 响应生成代码

1. 在 DevTools 中捕获到 API 响应后，点击「Send to Forge」
2. 切换到 **CodeGen** 标签
3. 选择目标语言（TypeScript / Java / Kotlin / Go / Python）
4. 点击 Generate，复制生成的代码到项目中

### 场景四：生成 API 文档

1. 在 DevTools 中浏览多个 API，逐一点击「Save Endpoint」
2. 切换到 Forge 工作台的 **API Doc** 标签
3. 勾选需要的端点，填写文档标题
4. 选择 JSON 或 YAML 格式，点击 Generate
5. 下载生成的 OpenAPI 3.0 规范文件

### 场景五：校验接口契约

1. 在 **Schema** 标签生成 JSON Schema
2. 切换到 **Validate** 标签
3. 粘贴 Schema，点击 Validate 检查当前 JSON 是否符合
4. 或切换到 Compare 模式，对比新旧 Schema 查找破坏性变更

### 场景六：生成测试代码

1. 编辑器中放入 API 响应 JSON
2. 切换到 **Validate** 标签 → Assertions 模式
3. 选择测试框架（Jest / Chai / Playwright / pytest）
4. 点击 Generate，复制断言代码到测试文件

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
| 测试 | Vitest（196 个测试用例） |

## 项目结构

```
src/
├── manifest.ts                  # Chrome MV3 清单
├── shared/                      # 共享模块
│   ├── types.ts                 #   类型定义（Endpoint, RequestMeta 等）
│   ├── messaging.ts             #   消息协议 + 工具函数
│   ├── endpointDb.ts            #   端点存储 CRUD
│   └── schemaMerge.ts           #   多响应 Schema 合并
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

MIT
