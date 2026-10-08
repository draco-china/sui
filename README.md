# SUI

English | [简体中文](README.zh-CN.md)

[![CI](https://img.shields.io/github/actions/workflow/status/draco-china/sui/ci.yml?style=flat&label=CI&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/draco-china/sui/publish.yml?branch=main&style=flat&label=Release&logo=githubactions&logoColor=white)](https://github.com/draco-china/sui/actions/workflows/publish.yml)
[![Version](https://img.shields.io/github/v/release/draco-china/sui?style=flat&label=Version&color=5882B5)](https://github.com/draco-china/sui/releases)
[![MIT](https://img.shields.io/badge/License-MIT-6A9475?style=flat)](LICENSE)

A React component library and bilingual documentation workspace built with
Base UI and Tailwind CSS v4.

SUI combines reusable UI components, business blocks, and shared themes. Its
reference site uses Fumadocs MDX and TanStack Start to provide interactive
examples, source code, and API documentation in English and Simplified Chinese.

## Features

- **Components:** 81 documented components built with Base UI and React.
- **Business blocks:** DataTable, TanStack Form, and DeleteResource for tables,
  forms, and resource deletion workflows.
- **Themes:** Light, dark, and system modes, seven accent palettes, and custom HEX
  colors backed by shared theme tokens.
- **Glass surfaces:** Optional clear and frosted materials, with CSS/SVG rendering
  and an opt-in WebGPU mode that falls back when unavailable.
- **Bilingual documentation:** Matching English and Chinese pages with live
  examples, source previews, and language-aware search.
- **shadcn registry and MCP:** Install component source into another application
  through the CLI or the official shadcn MCP server.
- **AI-readable reference:** Markdown pages, `llms.txt`, and `llms-full.txt` in both
  languages.

The UI package is private and has not been published to npm. SUI also provides a
shadcn-compatible registry through generated JSON files in `registry/r`. GitHub
raw URLs become available once these files have been committed and pushed to
`main`. The documentation app serves a local copy for development.

## Quick start

### Requirements

- Bun **1.3.0 or newer**. CI uses the latest 1.3.x patch.
- Node.js **22.14+ within 22.x**, or **24.10+**. CI uses Node.js 24.

### Run locally

```sh
git clone https://github.com/draco-china/sui.git
cd sui
bun install --frozen-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) for English or
[http://localhost:3000/zh-CN](http://localhost:3000/zh-CN) for Chinese.

```sh
bun run build
bun run --filter @workspace/docs preview
```

The production build includes both client and SSR bundles.

## Usage

### Install source through the registry

In a React 19 and Tailwind CSS 4 application initialized with shadcn and Base UI,
merge the following into its `components.json`:

```json
{
  "registries": {
    "@sui": "https://raw.githubusercontent.com/draco-china/sui/main/registry/r/{name}.json"
  }
}
```

Run these commands from that application:

```sh
bunx --bun shadcn@latest search @sui -q button
bunx --bun shadcn@latest view @sui/button
bunx --bun shadcn@latest add @sui/button @sui/editor
bunx --bun shadcn@latest add @sui/data-table @sui/delete-resource @sui/tanstack-form
```

Install the entire collection with `bunx --bun shadcn@latest add @sui/sui`.
The registry includes each item's required local files, package dependencies,
and SUI styles. Imports use your application's aliases, for example
`@/components/ui/button`. Editor requires a Vite-compatible `?worker` loader.
Blocks default to English; pass application labels to localize their UI.

The catalog uses the same GitHub directory at `registry.json`. These URLs require
the generated `registry/r` files to be committed and pushed to `main`; local
generation alone does not publish them.
The official [shadcn MCP server](https://ui.shadcn.com/docs/mcp) uses the same
`components.json` configuration. Configure your project MCP client to launch
`bunx --bun shadcn@latest mcp` from the consuming application, then ask it to
search `@sui`, inspect an item, or install `@sui/button`. See the
[installation guide](apps/docs/content/docs/installation.mdx) for client
configuration and full setup instructions. CLI and MCP use the GitHub files
without requiring a SUI documentation server.

### Develop and test the registry locally

Run `bun run registry:build` to generate the committed `registry/r` artifacts and
local `apps/docs/public/r` files. Commit the generated artifacts with their
source changes. `bun run registry:check` verifies that they match the source.

To test before pushing, start `bun run dev` and temporarily set the consuming
application's registry configuration to:

```json
{
  "registries": {
    "@sui": "http://127.0.0.1:3000/r/{name}.json"
  }
}
```

Keep the server running for local CLI or MCP tests, then restore the GitHub URL.
The local catalog is at `http://127.0.0.1:3000/r/registry.json`.

### Use the workspace package

Add the shared UI package to an application in this workspace:

```json
{
  "dependencies": {
    "@workspace/ui": "workspace:*"
  }
}
```

Import the stylesheet and a component:

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

Business blocks are exported through `@workspace/ui/blocks/*`. Set
`data-color="bamboo"` on the root element or a container to select an accent
palette; add the `dark` class for dark mode. Available palettes are `bamboo`,
`mauve`, `mist`, `sand`, `pine`, `rose`, and `lime`.

See the [installation guide](apps/docs/content/docs/installation.mdx) for Tailwind
source configuration and the [glass guide](apps/docs/content/docs/components/glass.mdx)
for optional glass materials.

## Documentation

With the development server running, browse `/docs` or `/zh-CN/docs`.

| Topic | English | 简体中文 |
| --- | --- | --- |
| Installation | [Guide](apps/docs/content/docs/installation.mdx) | [安装指南](apps/docs/content/docs/installation.zh-CN.mdx) |
| Design guidelines | [Guide](apps/docs/content/docs/design-guidelines.mdx) | [设计指南](apps/docs/content/docs/design-guidelines.zh-CN.mdx) |
| CLI | [Guide](apps/docs/content/docs/cli.mdx) | [指南](apps/docs/content/docs/cli.zh-CN.mdx) |
| Registry | [Guide](apps/docs/content/docs/registry.mdx) | [指南](apps/docs/content/docs/registry.zh-CN.mdx) |
| MCP | [Guide](apps/docs/content/docs/mcp.mdx) | [指南](apps/docs/content/docs/mcp.zh-CN.mdx) |
| LLMs | [Guide](apps/docs/content/docs/llms-txt.mdx) | [指南](apps/docs/content/docs/llms-txt.zh-CN.mdx) |
| Compatibility | [Guide](apps/docs/content/docs/compatibility.mdx) | [兼容性](apps/docs/content/docs/compatibility.zh-CN.mdx) |
| Components | [Reference](apps/docs/content/docs/components/) | [组件参考](apps/docs/content/docs/components/) |
| Business blocks | [Reference](apps/docs/content/docs/blocks/) | [业务区块](apps/docs/content/docs/blocks/) |
| CSS utilities | [Reference](apps/docs/content/docs/utils/) | [CSS 工具](apps/docs/content/docs/utils/) |

AI-readable endpoints are `/llms.txt` and `/llms-full.txt`; add `/zh-CN` for Chinese.
Individual Markdown pages are available through
`/api/llms-markdown?locale=en-US&slug=components/button`.

## Project structure

```text
apps/docs/           Documentation app, MDX content, examples, and tests
packages/ui/         Shared components, blocks, hooks, styles, and theme utilities
.github/workflows/   CI and automated releases
```

## Development

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Generate the registry and start the documentation development server |
| `bun run registry:build` | Generate shadcn JSON in `registry/r` and `apps/docs/public/r` |
| `bun run registry:check` | Verify committed registry JSON matches the source |
| `bun run lint` | Run Biome lint rules and Tailwind class checks |
| `bun run check` | Check formatting, lint, and imports |
| `bun run format` | Apply formatting and safe fixes |
| `bun run typecheck` | Generate Router types and check all workspace types |
| `bun run test` | Run the documentation and component tests |
| `bun run build` | Generate the registry and build the production documentation app |
| `bun run --cwd packages/ui themes:generate` | Regenerate shared theme CSS |

`packages/ui` also provides package-local lint, check, format, and typecheck
commands. Generated theme CSS and `registry/r` JSON are checked in. The generated
`apps/docs/src/routeTree.gen.ts` is also checked in and excluded from Biome checks.

## Contributing

Bug reports and focused pull requests are welcome through
[GitHub Issues](https://github.com/draco-china/sui/issues) and
[Pull Requests](https://github.com/draco-china/sui/pulls).

1. Create a branch for your change.
2. Update the implementation and relevant tests. Keep English `.mdx` and Chinese
   `.zh-CN.mdx` documentation aligned; register shared examples in
   `apps/docs/src/examples/index.ts`.
3. Regenerate registry artifacts with `bun run registry:build` after source changes.
   Run `bun run check`, `bun run registry:check`, `bun run typecheck`,
   `bun run test`, and `bun run build`.
4. Use an English Conventional Commit message following the semantic-release
   rules below, and open a pull request to `main`.

```text
feat(ui): add glass surface variants
fix(docs): preserve locale when navigating component pages
docs: update component installation guide
```

`bun install` installs Lefthook. The pre-commit hook runs Biome on staged
JavaScript, TypeScript, JSON, and CSS files and stages its fixes. The commit-msg
hook validates Conventional Commits. Both commitlint and semantic-release use
the Conventional Commits preset. Local hook overrides belong in
`lefthook-local.yml`; local overrides and `review-plans/` are ignored by Git.

## Releases

The release setup follows `draco-china/shadcn-pro`, using
[semantic-release](https://semantic-release.org/) on `main` after formatting,
lint, type checks, tests, and build pass.

Commit messages follow `<type>[optional scope][!]: <summary>`:

| Commit | Release |
| --- | --- |
| `fix(ui): correct button spacing` | Patch |
| `perf(ui): reduce table rendering work` | Patch |
| `feat(ui): add a new component` | Minor |
| `feat(ui)!: remove a deprecated prop` | Major |
| Any type with a `BREAKING CHANGE:` footer | Major |
| `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` without breaking changes | None |

Parsed reverts also trigger patch releases. Breaking changes take priority over
the commit type. The first qualifying release starts at `1.0.0`.

Releases update `CHANGELOG.md` and the root `package.json` version using the
official `@semantic-release/npm` plugin with `npmPublish: false`, create a
`chore(release): v<version> [skip ci]` commit, and publish a `v<version>` tag and
GitHub Release. npm publication is not enabled. Registry JSON is generated into
`registry/r` and committed with the source; pushing these files to `main` makes
the GitHub raw URLs available without a separate registry deployment.

After `main` has been committed and pushed, use `bun run release:dry-run` to
preview a release. This still requires GitHub credentials and remote push access.
GitHub Actions uses its built-in `GITHUB_TOKEN`; repository rules must permit the
release commit to be pushed to `main`. CI disables hooks with `LEFTHOOK=0`.

## License and acknowledgements

Licensed under the [MIT License](LICENSE), copyright © 2026 draco-china.

SUI adapts documentation and examples from shadcn/ui and uses the Fumadocs Base UI
Spacious layout. Third-party licenses, source revisions, and attribution are
recorded in [THIRD_PARTY_NOTICES](apps/docs/THIRD_PARTY_NOTICES.md).
