import { expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import {
  buildRegistry,
  checkRegistry,
  createRegistry,
  moduleReferences,
  registryStyles,
  repositoryRoot,
} from "../../../packages/ui/scripts/build-registry";

const registry = await createRegistry();

function targetForImport(name: string) {
  if (name.startsWith("@/components/ui/"))
    return name.replace("@/components/ui/", "@ui/");
  if (name.startsWith("@/components/"))
    return name.replace("@/components/", "@components/");
  if (name.startsWith("@/hooks/")) return name.replace("@/hooks/", "@hooks/");
  if (name.startsWith("@/lib/")) return name.replace("@/lib/", "@lib/");
  return undefined;
}

test("each component and block has a complete standalone registry manifest", async () => {
  for (const directory of ["components", "blocks"]) {
    const entries = await readdir(
      join(repositoryRoot, "packages/ui/src", directory),
    );
    for (const entry of entries.filter((name) => name.endsWith(".tsx"))) {
      const name = entry.replace(/\.tsx$/, "");
      const item = registry.items.find((item) => item.name === name);
      expect(item, name).toBeDefined();
      expect(item?.type).toBe(
        directory === "blocks" ? "registry:block" : "registry:ui",
      );
      expect(
        item?.files?.some(
          (file) => file.path === `packages/ui/src/${directory}/${entry}`,
        ),
      ).toBe(true);
    }
  }
  for (const item of registry.items) {
    expect(item.registryDependencies, item.name).toEqual([]);
    const files = item.files ?? [];
    const targets = new Set(files.map((file) => file.target));
    expect(targets.size, `${item.name}: duplicate file target`).toBe(
      files.length,
    );
    for (const file of files) {
      expect(file.content, `${item.name}/${file.path}`).not.toContain(
        "@workspace/ui",
      );
      const modules = moduleReferences(file.path, file.content ?? "");
      for (const reference of modules.references) {
        const local = targetForImport(reference.name);
        if (local) {
          const resolved = [
            local,
            `${local}.tsx`,
            `${local}.ts`,
            `${local}.d.ts`,
            `${local}/index.tsx`,
            `${local}/index.ts`,
          ].some((path) => targets.has(path));
          expect(resolved, `${item.name}: missing ${reference.name}`).toBe(
            true,
          );
        } else {
          expect(
            reference.name.startsWith("."),
            `${item.name}: unconverted local import ${reference.name}`,
          ).toBe(false);
          const parts = reference.name.split("/");
          const dependency = reference.name.startsWith("@")
            ? parts.slice(0, 2).join("/")
            : parts[0];
          if (["react", "react-dom"].includes(dependency)) continue;
          expect(
            (file.path.endsWith(".d.ts")
              ? item.devDependencies
              : item.dependencies
            )?.some((value) => value.startsWith(`${dependency}@`)),
            `${item.name}: undeclared npm dependency ${dependency}`,
          ).toBe(true);
        }
      }
      for (const dependency of modules.typeReferences) {
        expect(
          item.devDependencies?.some((value) =>
            value.startsWith(`${dependency}@`),
          ),
        ).toBe(true);
      }
    }
  }
});

test("Editor includes local Monaco Workers and their TypeScript declarations", () => {
  const editor = registry.items.find((item) => item.name === "editor");
  const client = editor?.files?.find((file) =>
    file.path.endsWith("/monaco-client.tsx"),
  );
  const workers = moduleReferences(
    client?.path ?? "editor.tsx",
    client?.content ?? "",
  ).references.filter((reference) => reference.name.endsWith("?worker"));
  expect(workers).toHaveLength(5);
  expect(
    workers.every((reference) => reference.name.startsWith("monaco-editor/")),
  ).toBe(true);
  expect(
    editor?.files?.some((file) => file.target === "@lib/sui/types/worker.d.ts"),
  ).toBe(true);
  expect(editor?.devDependencies).toContain("@webgpu/types@^0.1.74");
  const table = registry.items.find((item) => item.name === "data-table");
  expect(
    table?.files?.some(
      (file) => file.target === "@components/blocks/data-table/table.css",
    ),
  ).toBe(true);
  expect(
    table?.files?.some(
      (file) => file.target === "@components/blocks/data-table/table.css.d.ts",
    ),
  ).toBe(true);
});

test("CLI transformed WebGPU files compile with restrictive consumer types and files lists", async () => {
  const output = await mkdtemp(join(tmpdir(), "sui-webgpu-consumer-"));
  try {
    const uiPackage = join(repositoryRoot, "packages/ui");
    const cliRoot = dirname(Bun.resolveSync("shadcn", uiPackage));
    const { transform } = await import(
      Bun.resolveSync(
        "@shadcn/registry/internal/utils/transformers/index",
        cliRoot,
      )
    );
    const config = JSON.parse(
      await readFile(join(uiPackage, "components.json"), "utf8"),
    );
    config.aliases = {
      components: "#kit/components",
      ui: "#kit/components/ui",
      lib: "#kit/lib",
      hooks: "#kit/hooks",
      utils: "#kit/lib/utils",
    };
    await symlink(
      join(repositoryRoot, "node_modules"),
      join(output, "node_modules"),
      "dir",
    );
    const item = registry.items.find((item) => item.name === "glass");
    const required =
      item?.files?.filter((file) =>
        [
          "@lib/glass/renderer.ts",
          "@lib/glass/contrast.ts",
          "@lib/sui/types/webgpu.d.ts",
        ].includes(file.target ?? ""),
      ) ?? [];
    expect(required).toHaveLength(3);
    for (const file of required) {
      const content = await transform({
        filename: file.path,
        raw: file.content,
        config,
        isRemote: true,
      });
      const target = join(
        output,
        "src",
        file.target?.replace("@lib/", "lib/") ?? "",
      );
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
      if (file.path.endsWith("/renderer.ts")) {
        expect(content).toContain('from "#kit/lib/sui/types/webgpu"');
      } else if (file.path.endsWith("/webgpu.d.ts")) {
        expect(content).toContain('import "@webgpu/types"');
      }
    }
    await writeFile(
      join(output, "src/probe.ts"),
      `import { GlassRenderer } from "#kit/lib/glass/renderer";
export const renderer = GlassRenderer;
export const buffer = GPUBufferUsage.UNIFORM;
export const texture = GPUTextureUsage.TEXTURE_BINDING;
export const mode = GPUMapMode.READ;`,
    );
    const parsed = ts.parseJsonConfigFileContent(
      {
        files: ["src/probe.ts"],
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ["vite/client"],
          paths: { "#kit/*": [join(output, "src/*")] },
        },
      },
      ts.sys,
      output,
    );
    expect(parsed.fileNames).toEqual([join(output, "src/probe.ts")]);
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram(parsed.fileNames, parsed.options),
    );
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
    ).toEqual([]);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("CSS serialization retains !important, nested rules and required global imports", () => {
  const source = registryStyles(`:root { --radius: 1rem; }
@theme inline { --color-background: var(--background); }
.dark { --background: black; }
.example { display: none !important; }
@property --progress { syntax: "<number>"; inherits: false; initial-value: 0; }
@keyframes progress { to { --progress: 1; } }
@media (prefers-reduced-motion: reduce) { .example { animation: none; } }`);
  expect(source.cssVars.light?.radius).toBe("1rem");
  expect(source.cssVars.theme?.["color-background"]).toBe("var(--background)");
  expect(source.css[".example"]).toEqual({ display: "none !important" });
  expect(source.css["@property --progress"]).toEqual({
    syntax: '"<number>"',
    inherits: "false",
    "initial-value": "0",
  });
  expect(source.css["@layer component-animations"]).toEqual({
    "@keyframes progress": { to: { "--progress": "1" } },
  });
  const style = registry.items.find((item) => item.name === "sui-style");
  expect(Object.hasOwn(style?.css ?? {}, '@import "shadcn/tailwind.css"')).toBe(
    true,
  );
  expect(Object.hasOwn(style?.css ?? {}, '@import "tw-animate-css"')).toBe(
    true,
  );
  expect(
    Object.hasOwn(style?.css ?? {}, '@import "@fontsource-variable/inter"'),
  ).toBe(true);
  expect(
    Object.keys(style?.css ?? {}).some((key) => key.startsWith("@source")),
  ).toBe(false);
  expect(
    Object.hasOwn(style?.css ?? {}, "@custom-variant dark (&:is(.dark *))"),
  ).toBe(true);
  for (const theme of [
    "bamboo",
    "mauve",
    "mist",
    "sand",
    "pine",
    "rose",
    "lime",
  ]) {
    expect(
      Object.keys(style?.css ?? {}).some((key) =>
        key.includes(`[data-color="${theme}"]`),
      ),
    ).toBe(true);
  }
});

test("official CLI CSS transformations retain animations in a Tailwind production build", async () => {
  const uiPackage = join(repositoryRoot, "packages/ui");
  const cliRoot = dirname(Bun.resolveSync("shadcn", uiPackage));
  const { transformCss } = await import(
    Bun.resolveSync(
      "@shadcn/registry/internal/utils/updaters/update-css",
      cliRoot,
    )
  );
  const { transformCssVars } = await import(
    Bun.resolveSync(
      "@shadcn/registry/internal/utils/updaters/update-css-vars",
      cliRoot,
    )
  );
  const tailwindRoot = dirname(
    Bun.resolveSync("@tailwindcss/vite", join(repositoryRoot, "apps/docs")),
  );
  const { compile } = await import(
    Bun.resolveSync("@tailwindcss/node", tailwindRoot)
  );
  const style = registry.items.find((item) => item.name === "sui-style");
  const config = JSON.parse(
    await readFile(join(uiPackage, "components.json"), "utf8"),
  );
  const variables = await transformCssVars(
    '@import "tailwindcss";',
    style?.cssVars,
    config,
    { tailwindVersion: "v4", overwriteCssVars: true },
  );
  const css = await transformCss(variables, style?.css);
  expect(css).toContain("--color-background: var(--background)");
  const build = await compile(css, { base: uiPackage, onDependency() {} });
  const output = build.build([
    "bg-background",
    "rounded-lg",
    "animate-[loader-spin_1s_linear_infinite]",
  ]);
  for (const animation of [
    "loader-spin",
    "loader-morph-shape",
    "input-otp-reveal",
    "input-otp-halo",
    "appearance-circle",
    "appearance-blinds",
  ]) {
    expect(output, animation).toContain(`@keyframes ${animation}`);
  }
  expect(output).toContain("@property --otp-focus-angle");
  expect(output).toContain("@property --appearance-reveal");
  expect(output).toContain("background-color: var(--background)");
  expect(output).toContain("-webkit-backdrop-filter");
  expect(output).toContain(".bg-background");
}, 30_000);

test("build produces a searchable catalog and prunes removed item payloads", async () => {
  const output = await mkdtemp(join(tmpdir(), "sui-registry-"));
  const published = await mkdtemp(join(tmpdir(), "sui-registry-published-"));
  try {
    await writeFile(join(output, "removed.json"), "{}");
    await writeFile(join(output, "keep.txt"), "unrelated");
    await buildRegistry(output, published);
    const files = await readdir(output);
    expect((await readdir(published)).sort()).toEqual(
      files.filter((name) => name.endsWith(".json")).sort(),
    );
    expect(files).not.toContain("removed.json");
    expect(files).toContain("keep.txt");
    const catalog = JSON.parse(
      await readFile(join(output, "registry.json"), "utf8"),
    );
    expect(catalog.name).toBe("sui");
    expect(catalog.homepage).toBe("https://github.com/draco-china/sui");
    expect(catalog.items.map((item: { name: string }) => item.name)).toEqual(
      registry.items.map((item) => item.name),
    );
    for (const item of catalog.items) {
      expect(item.description).toBeTruthy();
      expect(item.categories).toContain("sui");
      expect(
        item.files?.every((file: { content?: string }) => !file.content),
      ).toBe(true);
      const payload = JSON.parse(
        await readFile(join(output, `${item.name}.json`), "utf8"),
      );
      expect(payload.name).toBe(item.name);
      expect(payload.cssVars.light.primary).toBe(
        registry.items[0].cssVars?.light?.primary,
      );
    }
    for (const file of files.filter((name) => name.endsWith(".json"))) {
      const content = await readFile(join(output, file), "utf8");
      expect(content).toBe(await readFile(join(published, file), "utf8"));
      expect(Buffer.byteLength(content)).toBeLessThan(5 * 1024 * 1024);
    }
    expect((await checkRegistry(published)).items).toHaveLength(
      registry.items.length,
    );
    await writeFile(join(published, "button.json"), "{}");
    await rm(join(published, "card.json"));
    await writeFile(join(published, "unexpected.json"), "{}");
    const difference = await checkRegistry(published).then(
      () => "",
      (error: Error) => error.message,
    );
    expect(difference).toContain("Stale button.json");
    expect(difference).toContain("Missing card.json");
    expect(difference).toContain("Unexpected unexpected.json");
    // Check never mutates stale payloads or recreates missing files.
    expect(await readFile(join(published, "button.json"), "utf8")).toBe("{}");
    expect(await readdir(published)).not.toContain("card.json");
  } finally {
    await rm(output, { recursive: true, force: true });
    await rm(published, { recursive: true, force: true });
  }
}, 30_000);
