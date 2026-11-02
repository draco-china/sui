import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import { createThemeTokens } from "../../packages/ui/src/lib/theme/palette.ts";

// Install commands are written once, as npm, and shown for each package
// manager, in shadcn/ui's order; the choice carries across pages.
const packageManagers = [
  ["pnpm", "pnpm dlx ", "pnpm add "],
  ["npm", "npx ", "npm install "],
  ["yarn", "yarn dlx ", "yarn add "],
  ["bun", "bunx --bun ", "bun add "],
].map(([name, run, install]) => ({
  name,
  command: (command: string) =>
    command.replace(/^npx /gm, run).replace(/^npm install /gm, install),
}));

export default defineConfig({
  define: {
    __THEME_PALETTE_SOURCE__: JSON.stringify(
      `const createThemeTokens=${createThemeTokens.toString()};`,
    ),
  },
  resolve: { tsconfigPaths: true },
  environments: {
    ssr: { build: { minify: true } },
  },
  ssr: { noExternal: ["fumadocs-core", "fumadocs-ui", "@fumadocs/base-ui"] },
  optimizeDeps: {
    exclude: ["fumadocs-core", "fumadocs-ui", "@fumadocs/base-ui"],
  },
  plugins: [
    fumadocsMdx({
      globalOptions: {
        mdxOptions: {
          remarkImageOptions: { external: false },
          remarkNpmOptions: {
            persist: { id: "package-manager" },
            packageManagers,
          },
        },
      },
    }),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
  ],
});
