# SUI

English | [简体中文](README.zh-CN.md)

[![CI](https://img.shields.io/github/actions/workflow/status/draco-china/sui/ci.yml?style=flat&label=CI&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/draco-china/sui/publish.yml?branch=main&style=flat&label=Release&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/publish.yml)
[![Version](https://img.shields.io/github/v/release/draco-china/sui?style=flat&label=Version&color=5882B5)](https://github.com/draco-china/sui/releases)
[![MIT](https://img.shields.io/badge/License-MIT-6A9475?style=flat)](LICENSE)

An open-source React component library built with Base UI and Tailwind CSS v4.
Includes reusable components, business blocks, shared themes, optional glass
materials, and bilingual documentation powered by Fumadocs and TanStack Start.

## Installation

Use a React 19 and Tailwind CSS 4 project initialized with shadcn and Base UI.
Install a component directly:

```sh
bunx --bun shadcn@latest add https://raw.githubusercontent.com/draco-china/sui/main/registry/r/button.json
```

Or add the registry namespace to your application's `components.json`:

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

Each item installs its source, dependencies, and styles using your application's
aliases. Install the full collection with `bunx --bun shadcn@latest add @sui/sui`.
Browse the [registry catalog](https://raw.githubusercontent.com/draco-china/sui/main/registry/r/registry.json)
for available items.

The official [shadcn MCP server](https://ui.shadcn.com/docs/mcp) uses the same
registry configuration. See the [MCP guide](apps/docs/content/docs/mcp.mdx) for
client setup.

## Documentation

| Topic | English | 简体中文 |
| --- | --- | --- |
| Installation | [Guide](apps/docs/content/docs/installation.mdx) | [安装](apps/docs/content/docs/installation.zh-CN.mdx) |
| Theming | [Guide](apps/docs/content/docs/theming.mdx) | [主题](apps/docs/content/docs/theming.zh-CN.mdx) |
| CLI | [Guide](apps/docs/content/docs/cli.mdx) | [指南](apps/docs/content/docs/cli.zh-CN.mdx) |
| Registry | [Guide](apps/docs/content/docs/registry.mdx) | [指南](apps/docs/content/docs/registry.zh-CN.mdx) |
| MCP | [Guide](apps/docs/content/docs/mcp.mdx) | [指南](apps/docs/content/docs/mcp.zh-CN.mdx) |
| LLMs | [Guide](apps/docs/content/docs/llms-txt.mdx) | [指南](apps/docs/content/docs/llms-txt.zh-CN.mdx) |

The documentation site includes component APIs, interactive examples, and design
guidelines. English lives at `/docs`, Chinese at `/zh-CN/docs`. AI reference
endpoints are `/llms.txt` and `/llms-full.txt`, with `/zh-CN` for Chinese.

## Development

Requires Bun 1.3+ and Node.js 22.14+ within 22.x, or 24.10+.

```sh
git clone https://github.com/draco-china/sui.git
cd sui
bun install --frozen-lockfile
bun run dev
```

Open [localhost:3000](http://localhost:3000) or
[localhost:3000/zh-CN](http://localhost:3000/zh-CN).

| Command | Purpose |
| --- | --- |
| `bun run build` | Build the documentation site |
| `bun run --filter @workspace/docs preview` | Preview the production build |
| `bun run check` | Check formatting, lint, and imports |
| `bun run typecheck` | Check workspace types |
| `bun run test` | Run tests |
| `bun run registry:build` | Regenerate registry artifacts |
| `bun run registry:check` | Verify registry artifacts match the source |

```text
apps/docs/       Documentation, examples, and tests
packages/ui/     Components, blocks, hooks, and styles
registry/r/      Installable shadcn registry items
```

## Cloudflare deployment

Connect the repository to Cloudflare Workers Builds:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Worker name | `sui-docs` |
| Production branch | `main` |
| Build command | `bun run build` |
| Deploy command | `cd apps/docs && bunx wrangler deploy` |

Pushes to the linked branch deploy automatically. Configure the Worker name and
custom domains in `apps/docs/wrangler.jsonc`.

## Contributing

Issues and pull requests are welcome. Keep English and Chinese documentation
aligned, regenerate registry artifacts after UI changes, and run the checks above
before submitting. Use Conventional Commits for commit messages.

Documentation, CI, and maintenance updates do not trigger automatic releases.
Qualifying component and registry changes follow semantic-release versioning.

## License

[MIT](LICENSE) © 2026 draco-china.
Third-party licenses and acknowledgements are recorded in
[THIRD_PARTY_NOTICES](apps/docs/THIRD_PARTY_NOTICES.md).
