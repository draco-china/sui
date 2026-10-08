# SUI

[English](README.md) | 简体中文

[![CI](https://img.shields.io/github/actions/workflow/status/draco-china/sui/ci.yml?style=flat&label=CI&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/draco-china/sui/publish.yml?branch=main&style=flat&label=Release&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/publish.yml)
[![Version](https://img.shields.io/github/v/release/draco-china/sui?style=flat&label=Version&color=5882B5)](https://github.com/draco-china/sui/releases)
[![MIT](https://img.shields.io/badge/License-MIT-6A9475?style=flat)](LICENSE)

基于 Base UI 和 Tailwind CSS v4 的开源 React 组件库，提供可复用组件、业务
Blocks、共享主题和可选玻璃材质，配套 Fumadocs 与 TanStack Start 双语文档站。

## 安装

在已初始化 shadcn 与 Base UI 的 React 19、Tailwind CSS 4 项目中，直接安装组件：

```sh
bunx --bun shadcn@latest add https://raw.githubusercontent.com/draco-china/sui/main/registry/r/button.json
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

文档、CI 和维护类更新不会自动发版，符合条件的组件库与 registry 变更遵循
semantic-release 版本规则。

## 许可证

[MIT](LICENSE) © 2026 draco-china。
第三方许可证与致谢记录见 [THIRD_PARTY_NOTICES](apps/docs/THIRD_PARTY_NOTICES.md)。
