# SUI

[English](README.md) | 简体中文

[![CI](https://img.shields.io/github/actions/workflow/status/draco-china/sui/ci.yml?style=flat&label=CI&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/draco-china/sui/publish.yml?branch=main&style=flat&label=Release&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/publish.yml)
[![Version](https://img.shields.io/github/v/release/draco-china/sui?style=flat&label=Version&color=5882B5)](https://github.com/draco-china/sui/releases)
[![MIT](https://img.shields.io/badge/License-MIT-6A9475?style=flat)](LICENSE)

基于 Base UI 和 Tailwind CSS v4 的 React 组件库与双语文档工作区。

SUI 提供可复用的 UI 组件、业务区块和共享主题。参考文档站点使用 Fumadocs MDX
和 TanStack Start，以英文和简体中文展示交互示例、源码与 API 文档。

## 主要特性

- **组件库：** 基于 Base UI 和 React，包含 81 个已编写文档的组件。
- **业务区块：** DataTable、TanStack Form 和 DeleteResource，覆盖表格、表单和
  资源删除流程。
- **主题系统：** 支持浅色、深色、跟随系统、七套强调色和自定义 HEX 颜色，复用
  共享主题 token。
- **玻璃材质：** 可选 clear 和 frosted 材质，支持 CSS/SVG 渲染，以及不可用时
  自动回退的可选 WebGPU 模式。
- **双语文档：** 中英文页面对应，包含交互示例、源码预览和按语言筛选的搜索。
- **shadcn registry 与 MCP：** 通过 CLI 或官方 shadcn MCP 服务，将组件源码
  安装到其他应用。
- **AI 可读参考：** 中英文 Markdown 页面、`llms.txt` 和 `llms-full.txt`。

UI 包仍是私有包，尚未发布到 npm。SUI 同时通过 `registry/r` 中生成的 JSON
提供 shadcn 兼容 registry。这些文件提交并推送到 `main` 后，可通过 GitHub raw
地址访问；文档应用提供本地副本用于开发。

## 快速开始

### 环境要求

- Bun **1.3.0 及以上版本**；CI 使用最新的 1.3.x 补丁版本。
- Node.js **22.14+（22.x）** 或 **24.10 及以上版本**；CI 使用 Node.js 24。

### 本地运行

```sh
git clone https://github.com/draco-china/sui.git
cd sui
bun install --frozen-lockfile
bun run dev
```

英文入口为 [http://localhost:3000](http://localhost:3000)，
中文入口为 [http://localhost:3000/zh-CN](http://localhost:3000/zh-CN)。

```sh
bun run build
bun run --filter @workspace/docs preview
```

生产构建包含客户端和 SSR 产物。

## 使用示例

### 通过 registry 安装源码

在使用 React 19、Tailwind CSS 4，并已初始化 shadcn 与 Base UI 的应用中，
将以下配置合并到 `components.json`：

```json
{
  "registries": {
    "@sui": "https://raw.githubusercontent.com/draco-china/sui/main/registry/r/{name}.json"
  }
}
```

在该应用目录运行：

```sh
bunx --bun shadcn@latest search @sui -q button
bunx --bun shadcn@latest view @sui/button
bunx --bun shadcn@latest add @sui/button @sui/editor
bunx --bun shadcn@latest add @sui/data-table @sui/delete-resource @sui/tanstack-form
```

使用 `bunx --bun shadcn@latest add @sui/sui` 安装完整集合。Registry 为每个条目
包含所需的本地文件、包依赖和 SUI 样式。安装后的导入路径使用应用别名，例如
`@/components/ui/button`。Editor 需要兼容 Vite 的 `?worker` 加载器。
Blocks 默认使用英文，通过应用传入的文案配置实现本地化。

目录索引为同一个 GitHub 目录下的 `registry.json`。这些地址需要生成的
`registry/r` 文件先提交并推送到 `main`；仅在本地生成不会发布它们。
官方 [shadcn MCP 服务](https://ui.shadcn.com/docs/mcp) 复用同一个
`components.json` 配置。在项目 MCP 客户端中配置
`bunx --bun shadcn@latest mcp`，从消费应用目录启动，然后让助手搜索 `@sui`、
查看条目或安装 `@sui/button`。客户端配置与完整步骤见
[安装指南](apps/docs/content/docs/installation.zh-CN.mdx)。CLI 与 MCP 直接使用
GitHub 文件，无需启动 SUI 文档服务器。

### 本地开发与测试 registry

运行 `bun run registry:build` 生成需提交的 `registry/r` 产物和本地
`apps/docs/public/r` 文件。将生成产物与对应源码一同提交，使用
`bun run registry:check` 检查其是否与源码一致。

推送前测试时，运行 `bun run dev`，将消费应用的 registry 配置临时改为：

```json
{
  "registries": {
    "@sui": "http://127.0.0.1:3000/r/{name}.json"
  }
}
```

本地 CLI 或 MCP 测试时保持服务器运行，完成后恢复 GitHub 地址。
本地目录索引位于 `http://127.0.0.1:3000/r/registry.json`。

### 使用工作区包

在工作区内的应用中添加共享 UI 包依赖：

```json
{
  "dependencies": {
    "@workspace/ui": "workspace:*"
  }
}
```

导入样式和组件：

```css
@import "tailwindcss";
@import "@workspace/ui/globals.css";
@source "../../../packages/ui/src";
```

```tsx
import { Button } from "@workspace/ui/components/button";

export function Example() {
  return <Button>Get started</Button>;
}
```

业务区块通过 `@workspace/ui/blocks/*` 导出。在根元素或容器上设置
`data-color="bamboo"` 可选择强调色主题，添加 `dark` 类可启用深色模式。
可用主题为 `bamboo`、`mauve`、`mist`、`sand`、`pine`、`rose` 和 `lime`。

Tailwind 源文件扫描配置见[安装指南](apps/docs/content/docs/installation.zh-CN.mdx)，
可选玻璃材质见[玻璃组件指南](apps/docs/content/docs/components/glass.zh-CN.mdx)。

## 文档

启动开发服务器后，可访问 `/docs` 或 `/zh-CN/docs`。

| 主题 | English | 简体中文 |
| --- | --- | --- |
| 安装 | [Guide](apps/docs/content/docs/installation.mdx) | [安装指南](apps/docs/content/docs/installation.zh-CN.mdx) |
| 设计指南 | [Guide](apps/docs/content/docs/design-guidelines.mdx) | [设计指南](apps/docs/content/docs/design-guidelines.zh-CN.mdx) |
| CLI | [Guide](apps/docs/content/docs/cli.mdx) | [指南](apps/docs/content/docs/cli.zh-CN.mdx) |
| Registry | [Guide](apps/docs/content/docs/registry.mdx) | [指南](apps/docs/content/docs/registry.zh-CN.mdx) |
| MCP | [Guide](apps/docs/content/docs/mcp.mdx) | [指南](apps/docs/content/docs/mcp.zh-CN.mdx) |
| LLMs | [Guide](apps/docs/content/docs/llms-txt.mdx) | [指南](apps/docs/content/docs/llms-txt.zh-CN.mdx) |
| Compatibility | [Guide](apps/docs/content/docs/compatibility.mdx) | [兼容性](apps/docs/content/docs/compatibility.zh-CN.mdx) |
| 组件 | [Reference](apps/docs/content/docs/components/) | [组件参考](apps/docs/content/docs/components/) |
| 业务区块 | [Reference](apps/docs/content/docs/blocks/) | [业务区块](apps/docs/content/docs/blocks/) |
| CSS 工具 | [Reference](apps/docs/content/docs/utils/) | [CSS 工具](apps/docs/content/docs/utils/) |

AI 可读接口为 `/llms.txt` 和 `/llms-full.txt`，添加 `/zh-CN` 前缀可获取中文。
单个页面的 Markdown 可通过
`/api/llms-markdown?locale=zh-CN&slug=components/button` 获取。

## 项目结构

```text
apps/docs/           文档应用、MDX 内容、示例和测试
packages/ui/         共享组件、业务区块、hooks、样式和主题工具
.github/workflows/   CI 和自动发布工作流
```

## 开发

在仓库根目录运行以下命令：

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 生成 registry 并启动文档开发服务器 |
| `bun run registry:build` | 在 `registry/r` 和 `apps/docs/public/r` 生成 shadcn JSON |
| `bun run registry:check` | 检查已提交的 registry JSON 是否与源码一致 |
| `bun run lint` | 执行 Biome lint 规则和 Tailwind 类名检查 |
| `bun run check` | 检查格式、lint 和导入 |
| `bun run format` | 格式化并应用安全修复 |
| `bun run typecheck` | 生成 Router 类型并检查所有工作区类型 |
| `bun run test` | 执行文档和组件测试 |
| `bun run build` | 生成 registry 并构建生产环境文档应用 |
| `bun run --cwd packages/ui themes:generate` | 重新生成共享主题 CSS |

`packages/ui` 也提供包内的 lint、check、format 和 typecheck 命令。
生成的主题 CSS 和 `registry/r` JSON 纳入版本控制；生成的 `apps/docs/src/routeTree.gen.ts`
也纳入版本控制，但不参与 Biome 检查。

## 参与贡献

欢迎通过 [GitHub Issues](https://github.com/draco-china/sui/issues) 报告问题，
或通过 [Pull Requests](https://github.com/draco-china/sui/pulls) 提交聚焦的改动。

1. 为改动创建分支。
2. 更新实现及相关测试。保持英文 `.mdx` 和中文 `.zh-CN.mdx` 文档一致，
   在 `apps/docs/src/examples/index.ts` 中注册共享示例。
3. 源码变更后通过 `bun run registry:build` 重新生成 registry 产物。运行
   `bun run check`、`bun run registry:check`、`bun run typecheck`、
   `bun run test` 和 `bun run build`。
4. 按下方 semantic-release 规则编写英文 Conventional Commits 提交信息，
   向 `main` 发起 Pull Request。

```text
feat(ui): add glass surface variants
fix(docs): preserve locale when navigating component pages
docs: update component installation guide
```

`bun install` 会安装 Lefthook。pre-commit 钩子对已暂存的 JavaScript、TypeScript、
JSON 和 CSS 文件运行 Biome，并将修复结果加入暂存区；commit-msg 钩子校验
Conventional Commits。commitlint 和 semantic-release 均使用 Conventional Commits
预设。本地覆盖配置放在 `lefthook-local.yml` 中。
本地覆盖配置和 `review-plans/` 均被 Git 忽略。

## 版本发布

发布配置参考 `draco-china/shadcn-pro`，在 `main` 的格式、lint、类型检查、测试
和构建通过后，运行 [semantic-release](https://semantic-release.org/)。

提交信息格式为 `<type>[可选作用域][!]: <英文摘要>`：

| 提交 | 版本变化 |
| --- | --- |
| `fix(ui): correct button spacing` | 补丁版本 |
| `perf(ui): reduce table rendering work` | 补丁版本 |
| `feat(ui): add a new component` | 次版本 |
| `feat(ui)!: remove a deprecated prop` | 主版本 |
| 任意类型带 `BREAKING CHANGE:` 页脚 | 主版本 |
| 不含破坏性变更的 `docs`、`style`、`refactor`、`test`、`build`、`ci`、`chore` | 不发布 |

被解析为回滚的提交也会触发补丁版本。破坏性变更优先于提交类型。
首次符合发布条件时从 `1.0.0` 开始。

发布流程使用官方 `@semantic-release/npm` 插件，以 `npmPublish: false` 更新根目录
`package.json` 的版本，同时更新 `CHANGELOG.md`，创建
`chore(release): v<version> [skip ci]` 提交，再发布 `v<version>` tag 和 GitHub
Release。当前未启用 npm 包发布。Registry JSON 生成到 `registry/r` 并与源码
一同提交；将文件推送到 `main` 后即可使用 GitHub raw 地址，无需单独部署 registry。

`main` 已提交并推送后，可通过 `bun run release:dry-run` 预览发布。预览仍需
GitHub 凭据和远程推送权限。GitHub Actions 使用内置 `GITHUB_TOKEN`，仓库规则
需要允许发布提交推送到 `main`。CI 通过 `LEFTHOOK=0` 禁用钩子。

## 许可证与致谢

本项目采用 [MIT 许可证](LICENSE)，版权归 © 2026 draco-china 所有。

SUI 的部分文档和示例改编自 shadcn/ui，文档布局使用 Fumadocs Base UI Spacious。
第三方许可证、源代码版本与归属信息见
[THIRD_PARTY_NOTICES](apps/docs/THIRD_PARTY_NOTICES.md)。
