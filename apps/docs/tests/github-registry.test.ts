import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  buildRegistry,
  checkRegistry,
  createRegistry,
  githubRegistryPayloads,
  moduleReferences,
  repositoryRoot,
} from "../../../packages/ui/scripts/build-registry";

const registry = await createRegistry();
const payloads = githubRegistryPayloads(registry);
const cliRoot = dirname(
  Bun.resolveSync("shadcn", join(repositoryRoot, "packages/ui")),
);
const { loadRegistryCatalogFromSource, loadRegistryItemFromSource } =
  await import(
    Bun.resolveSync("@shadcn/registry/internal/registry/source", cliRoot)
  );
const reader = {
  async readText(path: string) {
    const content = payloads.get(path);
    if (content === undefined) throw new Error(`Missing source: ${path}`);
    return content;
  },
};

test("GitHub source catalog and files preserve every item, style, dependency and target", async () => {
  const manifest = await loadRegistryCatalogFromSource(reader);
  expect(manifest.homepage).toBe("https://sui.draco.dev");
  expect(manifest.items).toHaveLength(registry.items.length);
  for (const content of payloads.values())
    expect(Buffer.byteLength(content)).toBeLessThan(5 * 1024 * 1024);
  for (const item of manifest.items) {
    for (const file of item.files ?? []) expect("content" in file).toBe(false);
  }
  for (const original of registry.items) {
    const item = manifest.items.find(
      (item: { name: string }) => item.name === original.name,
    );
    expect(item).toBeDefined();
    expect({
      ...item,
      files: await Promise.all(
        item.files?.map(async (file: { path: string }) => ({
          ...file,
          path: file.path.replace("registry/source/", "packages/ui/src/"),
          content: await reader.readText(file.path),
        })) ?? [],
      ),
    }).toEqual(original);
  }
}, 30_000);

test("GitHub source installs rewrite aliases for components, blocks and editor helpers", async () => {
  const { transform } = await import(
    Bun.resolveSync(
      "@shadcn/registry/internal/utils/transformers/index",
      cliRoot,
    )
  );
  const config = JSON.parse(
    await readFile(join(repositoryRoot, "packages/ui/components.json"), "utf8"),
  );
  config.aliases = {
    ui: "#kit/components/ui",
    components: "#kit/components",
    lib: "#kit/lib",
    hooks: "#kit/hooks",
    utils: "#kit/lib/utils",
  };
  for (const name of ["button", "data-table", "editor"]) {
    const item = await loadRegistryItemFromSource(name, reader);
    for (const file of item.files ?? []) {
      if (!file.path.endsWith(`/components/${name}.tsx`)) continue;
      const installed = await transform({
        filename: file.path,
        raw: file.content,
        config,
        isRemote: true,
      });
      const imports = moduleReferences(file.path, installed).references;
      expect(
        imports.some(({ name }) => name.startsWith("@/")),
        file.path,
      ).toBe(false);
      expect(installed).not.toContain("@workspace/ui/");
    }
  }
}, 60_000);

test("registry build prunes GitHub source files and check detects drift without writing", async () => {
  const output = await mkdtemp(join(tmpdir(), "sui-github-registry-"));
  const published = join(output, "r");
  try {
    await buildRegistry(published, undefined, output);
    expect((await checkRegistry(published, output)).items).toHaveLength(
      registry.items.length,
    );
    const source = join(output, "registry/source/components/button.tsx");
    const removed = join(output, "registry/source/components/removed.tsx");
    await writeFile(source, "stale");
    await writeFile(removed, "removed");
    await rm(join(output, "registry.json"));
    const error = await checkRegistry(published, output).then(
      () => "",
      (error: Error) => error.message,
    );
    expect(error).toContain("Missing registry.json");
    expect(error).toContain("Stale registry/source/components/button.tsx");
    expect(error).toContain(
      "Unexpected registry/source/components/removed.tsx",
    );
    expect(await readFile(source, "utf8")).toBe("stale");
    await buildRegistry(published, undefined, output);
    expect(await readFile(source, "utf8")).not.toBe("stale");
    expect(await Bun.file(removed).exists()).toBe(false);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
}, 60_000);
