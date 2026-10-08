import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import { createThemeTokens } from "../../packages/ui/src/lib/theme/palette.ts";

export default defineConfig({
  define: {
    __THEME_PALETTE_SOURCE__: JSON.stringify(
      `const createThemeTokens=${createThemeTokens.toString()};`,
    ),
  },
  resolve: { tsconfigPaths: true },
  ssr: { noExternal: ["fumadocs-core", "fumadocs-ui", "@fumadocs/base-ui"] },
  optimizeDeps: {
    exclude: ["fumadocs-core", "fumadocs-ui", "@fumadocs/base-ui"],
  },
  plugins: [
    fumadocsMdx({
      globalOptions: {
        mdxOptions: { remarkImageOptions: { external: false } },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
