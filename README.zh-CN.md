<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/docs/public/logo-dark.svg">
    <img src="apps/docs/public/logo.svg" alt="SUI 标志" width="96" height="96">
  </picture>
</p>

<h1 align="center">SUI</h1>

<p align="center">
  可组合的 React 组件，细致的交互体验，可选的玻璃表面<br>
  基于 Base UI、Tailwind CSS 4 和 shadcn
</p>

<p align="center">
  <a href="https://github.com/draco-china/sui/releases"><img src="https://img.shields.io/github/v/release/draco-china/sui?style=flat-square" alt="最新版本"></a>
  <a href="https://github.com/draco-china/sui/stargazers"><img src="https://img.shields.io/github/stars/draco-china/sui?style=flat-square&amp;logo=github" alt="GitHub Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/draco-china/sui?style=flat-square" alt="MIT 许可证"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · 简体中文<br>
  <a href="#安装">安装</a> · <a href="#文档">文档</a> · <a href="https://github.com/draco-china/sui/releases">更新记录</a>
</p>

## 项目特色

| 特色 | 说明 |
| --- | --- |
| **组件与 Blocks** | 表单控件、导航、反馈、内容查看器与组合工作流 |
| **共享主题** | 语义化 OKLCH 变量、八套强调色与明暗模式 |
| **玻璃表面** | 三档强度，支持 CSS、SVG 折射与 vgpu + WGSL 渲染 |
| **源码可控** | 通过 shadcn 安装组件和 Blocks，按应用需要调整源码 |
| **AI 工具** | 通过 shadcn MCP 使用 registry，提供面向 LLM 的文档 |
| **交互文档** | 中英文 API 与可运行示例，基于 Fumadocs 与 TanStack Start |

## 安装

在已初始化 shadcn 与 Base UI 的 React 19、Tailwind CSS 4 项目中，直接安装组件：

```sh
bunx --bun shadcn@latest add https://raw.githubusercontent.com/draco-china/sui/main/registry/r/button.json
```

```tsx
import { Button } from "@/components/ui/button"

export function SaveButton() {
  return <Button>保存更改</Button>
}
```

或将 registry 命名空间添加到应用的 `components.json`：

```json
{
  "registries": {
    "@sui": "https://raw.githubusercontent.com/draco-china/sui/main/registry/r/{name}.json"
  }
}
```

```sh
bunx --bun shadcn@latest add @sui/button @sui/editor
bunx --bun shadcn@latest add @sui/data-table @sui/delete-resource @sui/tanstack-form
```

每个条目将源码、依赖和样式安装到应用中，并使用应用的导入别名。
通过 `bunx --bun shadcn@latest add @sui/sui` 安装完整集合，所有可用条目见
[registry 目录](https://raw.githubusercontent.com/draco-china/sui/main/registry/r/registry.json)。

官方 [shadcn MCP 服务](https://ui.shadcn.com/docs/mcp) 复用同一份 registry 配置，
客户端配置见 [MCP 指南](apps/docs/content/docs/mcp.zh-CN.mdx)。

## 文档

| 主题 | English | 简体中文 |
| --- | --- | --- |
| Installation | [Guide](apps/docs/content/docs/installation.mdx) | [安装](apps/docs/content/docs/installation.zh-CN.mdx) |
| Components | [Browse](apps/docs/content/docs/components/index.mdx) | [浏览](apps/docs/content/docs/components/index.zh-CN.mdx) |
| Glass | [Guide](apps/docs/content/docs/components/glass.mdx) | [玻璃效果](apps/docs/content/docs/components/glass.zh-CN.mdx) |
| Theming | [Guide](apps/docs/content/docs/theming.mdx) | [主题](apps/docs/content/docs/theming.zh-CN.mdx) |
| CLI | [Guide](apps/docs/content/docs/cli.mdx) | [指南](apps/docs/content/docs/cli.zh-CN.mdx) |
| Registry | [Guide](apps/docs/content/docs/registry.mdx) | [指南](apps/docs/content/docs/registry.zh-CN.mdx) |
| MCP | [Guide](apps/docs/content/docs/mcp.mdx) | [指南](apps/docs/content/docs/mcp.zh-CN.mdx) |
| LLMs | [Guide](apps/docs/content/docs/llms-txt.mdx) | [指南](apps/docs/content/docs/llms-txt.zh-CN.mdx) |

文档站包含组件 API、交互示例和设计规范。英文入口为 `/docs`，中文入口为
`/zh-CN/docs`。AI 参考接口为 `/llms.txt` 和 `/llms-full.txt`，中文使用 `/zh-CN` 前缀。

## 开发

需要 Bun 1.3+，以及 Node.js 22.14+（22.x）或 24.10+。

```sh
git clone https://github.com/draco-china/sui.git
cd sui
bun install --frozen-lockfile
bun run dev
```

访问 [localhost:3000](http://localhost:3000) 或
[localhost:3000/zh-CN](http://localhost:3000/zh-CN)。

| 命令 | 用途 |
| --- | --- |
| `bun run build` | 构建文档站 |
| `bun run --filter @workspace/docs preview` | 预览生产产物 |
| `bun run check` | 检查格式、lint 和导入 |
| `bun run typecheck` | 检查工作区类型 |
| `bun run test` | 运行测试 |
| `bun run registry:build` | 重新生成 registry 产物 |
| `bun run registry:check` | 检查 registry 与源码是否一致 |

```text
apps/docs/       文档、示例和测试
packages/ui/     组件、Blocks、hooks 和样式
registry/r/      可安装的 shadcn registry 条目
```

## Cloudflare 部署

在 Cloudflare Workers Builds 中关联仓库：

| 设置 | 值 |
| --- | --- |
| 根目录 | 仓库根目录 |
| Worker 名称 | `sui-docs` |
| 生产分支 | `main` |
| 构建命令 | `bun run build` |
| 部署命令 | `cd apps/docs && bunx wrangler deploy` |

推送到关联分支后自动部署。Worker 名称和自定义域名在
`apps/docs/wrangler.jsonc` 中配置。

## 贡献

欢迎提交 Issue 和 Pull Request。保持中英文文档一致，UI 改动后重新生成
registry，提交前运行上述检查，提交信息使用 Conventional Commits。

`main` 分支 CI 通过后，semantic-release 根据 `.releaserc.json` 分析上次发布以来的
全部提交。文档提交不会单独产生版本，功能、修复与破坏性变更遵循配置中的版本规则。

## 许可证

[MIT](LICENSE) © 2026 draco-china。
第三方许可证与致谢记录见 [THIRD_PARTY_NOTICES](apps/docs/THIRD_PARTY_NOTICES.md)。
