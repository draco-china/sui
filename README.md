<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/docs/public/logo-dark.svg">
    <img src="apps/docs/public/logo.svg" alt="SUI logo" width="96" height="96">
  </picture>
</p>

<h1 align="center">SUI</h1>

<p align="center">
  Composable React components with thoughtful interactions and optional glass surfaces.<br>
  Built with Base UI, Tailwind CSS 4, and shadcn.
</p>

<p align="center">
  <a href="https://github.com/draco-china/sui/releases"><img src="https://img.shields.io/github/v/release/draco-china/sui?style=flat-square" alt="Latest release"></a>
  <a href="https://github.com/draco-china/sui/stargazers"><img src="https://img.shields.io/github/stars/draco-china/sui?style=flat-square&amp;logo=github" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/draco-china/sui?style=flat-square" alt="MIT license"></a>
</p>

<p align="center">
  English · <a href="README.zh-CN.md">简体中文</a><br>
  <a href="#installation">Installation</a> · <a href="#documentation">Documentation</a> · <a href="https://github.com/draco-china/sui/releases">Changelog</a>
</p>

## What’s inside

| Feature | Details |
| --- | --- |
| **Components & Blocks** | Form controls, navigation, feedback, content viewers, and composed workflows |
| **Shared themes** | Semantic OKLCH tokens, eight accent palettes, and light/dark appearance |
| **Glass surfaces** | Three intensity levels with CSS, SVG refraction, and vgpu + WGSL rendering |
| **Source ownership** | Install components and Blocks through shadcn, then adapt the source to your app |
| **AI tooling** | Registry integration with shadcn MCP and LLM-ready documentation |
| **Live documentation** | English and Chinese APIs and interactive examples, powered by Fumadocs and TanStack Start |

## Installation

Use a React 19 and Tailwind CSS 4 project initialized with shadcn and Base UI.
Install a component directly:

```sh
bunx --bun shadcn@latest add https://raw.githubusercontent.com/draco-china/sui/main/registry/r/button.json
```

```tsx
import { Button } from "@/components/ui/button"

export function SaveButton() {
  return <Button>Save changes</Button>
}
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
| Components | [Browse](apps/docs/content/docs/components/index.mdx) | [浏览](apps/docs/content/docs/components/index.zh-CN.mdx) |
| Glass | [Guide](apps/docs/content/docs/components/glass.mdx) | [玻璃效果](apps/docs/content/docs/components/glass.zh-CN.mdx) |
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

After CI passes on `main`, semantic-release evaluates all commits since the last
release using `.releaserc.json`. Documentation commits do not create a release;
features, fixes, and breaking changes follow the configured versioning rules.

## License

[MIT](LICENSE) © 2026 draco-china.
Third-party licenses and acknowledgements are recorded in
[THIRD_PARTY_NOTICES](apps/docs/THIRD_PARTY_NOTICES.md).
