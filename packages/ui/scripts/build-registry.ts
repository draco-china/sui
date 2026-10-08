import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss, { type ChildNode, type Container } from "postcss";
import {
  type RegistryItem,
  registryItemSchema,
  registrySchema,
} from "shadcn/schema";
import ts from "typescript";

export const repositoryRoot = fileURLToPath(
  new URL("../../../", import.meta.url),
);
const sourceRoot = join(repositoryRoot, "packages/ui/src");
export const registryOutput = join(repositoryRoot, "apps/docs/public/r");
export const publishedRegistryOutput = join(repositoryRoot, "registry/r");
const homepage = "https://github.com/draco-china/sui";

type CssObject = { [key: string]: string | CssObject };
type ModuleReference = { name: string; start: number; end: number };
type Source = {
  content: string;
  references: ModuleReference[];
  typeReferences: string[];
};

/** Include imports, exports, lazy imports and import types, never strings in UI copy. */
export function moduleReferences(path: string, content: string) {
  const source = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const references: ModuleReference[] = [];
  function add(node: ts.Node | undefined) {
    if (node && ts.isStringLiteralLike(node)) {
      references.push({
        name: node.text,
        start: node.getStart(source) + 1,
        end: node.getEnd() - 1,
      });
    }
  }
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      add(node.arguments[0]);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      add(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return {
    references,
    typeReferences: source.typeReferenceDirectives.map((item) => item.fileName),
  };
}

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(root, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return files.flat().sort();
}

function packageName(specifier: string) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function canonicalImport(path: string) {
  const name = relative(sourceRoot, path).replaceAll("\\", "/");
  // CSS extensions are part of an import; TS extensions are resolved by the app.
  const module = name.replace(/(?:\.d)?\.(?:tsx?|jsx?)$/, "");
  if (name.startsWith("components/")) {
    return module.replace(/^components\//, "@/components/ui/");
  }
  if (name.startsWith("blocks/")) return `@/components/${module}`;
  if (name.startsWith("types/")) return `@/lib/sui/${module}`;
  return `@/${module}`;
}

function fileDefinition(path: string, content: string) {
  const name = relative(sourceRoot, path).replaceAll("\\", "/");
  const filePath = `packages/ui/src/${name}`;
  if (name.startsWith("components/")) {
    return {
      path: filePath,
      type: "registry:ui" as const,
      target: `@ui/${name.slice(11)}`,
      content,
    };
  }
  if (name.startsWith("blocks/")) {
    return {
      path: filePath,
      type:
        extname(path) === ".css"
          ? ("registry:file" as const)
          : ("registry:component" as const),
      target: `@components/${name}`,
      content,
    };
  }
  if (name.startsWith("hooks/")) {
    return {
      path: filePath,
      type: "registry:hook" as const,
      target: `@hooks/${name.slice(6)}`,
      content,
    };
  }
  if (name.startsWith("lib/")) {
    return {
      path: filePath,
      type: "registry:lib" as const,
      target: `@lib/${name.slice(4)}`,
      content,
    };
  }
  if (name.startsWith("types/")) {
    return {
      path: filePath,
      type: "registry:file" as const,
      target: `@lib/sui/${name}`,
      content,
    };
  }
  throw new Error(`Unsupported registry file: ${name}`);
}

function mergeCss(target: CssObject, key: string, value: string | CssObject) {
  const existing = target[key];
  if (typeof value === "object" && typeof existing === "object") {
    for (const [child, entry] of Object.entries(value))
      mergeCss(existing, child, entry);
  } else {
    target[key] = value;
  }
}

function cssNodes(nodes: readonly ChildNode[]): CssObject {
  const result: CssObject = {};
  for (const node of nodes) {
    if (node.type === "comment") continue;
    if (node.type === "decl") {
      result[node.prop] = `${node.value}${node.important ? " !important" : ""}`;
    } else {
      let key: string;
      if (node.type === "rule") key = node.selector;
      else {
        key = `@${node.name}`;
        if (node.params) key += ` ${node.params}`;
      }
      mergeCss(result, key, cssNodes(node.nodes ?? []));
    }
  }
  return result;
}

/** Preserve the style tree while allowing the CLI to merge into the user's CSS. */
export function registryStyles(source: string) {
  const root = postcss.parse(source);
  const cssVars: NonNullable<RegistryItem["cssVars"]> = {
    theme: {},
    light: {},
    dark: {},
  };
  root.each((node) => {
    let tokens: Record<string, string> | undefined;
    if (
      node.type === "atrule" &&
      node.name === "theme" &&
      node.params === "inline"
    )
      tokens = cssVars.theme;
    if (node.type === "rule" && node.selector === ":root")
      tokens = cssVars.light;
    if (node.type === "rule" && node.selector === ".dark")
      tokens = cssVars.dark;
    if (tokens) {
      (node as Container).each((child) => {
        if (child.type !== "decl")
          throw new Error("Token blocks must contain declarations only");
        tokens[child.prop.slice(2)] =
          `${child.value}${child.important ? " !important" : ""}`;
      });
      node.remove();
    }
  });
  const css = cssNodes(root.nodes);
  // The CLI moves top-level keyframes to @theme inline. Tailwind can drop these
  // without matching --animate-* tokens, while SUI refers to them from markup.
  // A named layer keeps the original animation definitions in production CSS.
  const animations: CssObject = {};
  for (const key of Object.keys(css)) {
    if (key.startsWith("@keyframes ")) {
      animations[key] = css[key];
      delete css[key];
    }
  }
  if (Object.keys(animations).length)
    css["@layer component-animations"] = animations;
  return { cssVars, css };
}

export async function createRegistry() {
  const packageJson = JSON.parse(
    await readFile(join(repositoryRoot, "packages/ui/package.json"), "utf8"),
  ) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const paths = await filesUnder(sourceRoot);
  const available = new Set(paths);
  const sources = new Map<string, Source>();
  for (const path of paths) {
    if (!/\.(?:tsx?|css)$/.test(path)) continue;
    const content = await readFile(path, "utf8");
    const modules = path.endsWith(".css")
      ? { references: [], typeReferences: [] }
      : moduleReferences(path, content);
    sources.set(path, { content, ...modules });
  }
  function localPath(from: string, name: string): string | undefined {
    const specifier = name.split("?")[0];
    let base: string;
    if (specifier.startsWith("@workspace/ui/"))
      base = join(sourceRoot, specifier.slice(14));
    else if (specifier.startsWith("."))
      base = resolve(dirname(from), specifier);
    else return undefined;
    const found = [
      base,
      `${base}.tsx`,
      `${base}.ts`,
      join(base, "index.tsx"),
      join(base, "index.ts"),
    ].find((candidate) => available.has(candidate));
    if (!found || !sources.has(found))
      throw new Error(
        `Unresolved local import ${name} in ${relative(sourceRoot, from)}`,
      );
    return found;
  }

  const styleDependencies = new Set<string>();
  async function expandStyles(
    path: string,
    ancestors = new Set<string>(),
  ): Promise<string> {
    if (ancestors.has(path)) throw new Error(`Cyclic CSS imports: ${path}`);
    const content = sources.get(path)?.content;
    if (content === undefined) throw new Error(`Missing CSS import: ${path}`);
    const root = postcss.parse(content);
    for (const node of [...root.nodes]) {
      if (node.type !== "atrule") continue;
      if (node.name === "source") {
        node.remove();
        continue;
      }
      if (node.name !== "import") continue;
      const specifier = node.params.match(/^["']([^"']+)["']$/)?.[1];
      if (!specifier) throw new Error(`Unsupported CSS import: ${node.params}`);
      if (specifier.startsWith(".")) {
        const expanded = await expandStyles(
          resolve(dirname(path), specifier),
          new Set([...ancestors, path]),
        );
        node.replaceWith(postcss.parse(expanded).nodes);
      } else if (specifier === "tailwindcss") {
        // Initialized Tailwind v4 projects already import the compiler stylesheet.
        node.remove();
      } else {
        styleDependencies.add(packageName(specifier));
      }
    }
    return root.toString();
  }
  const styles = registryStyles(
    await expandStyles(join(sourceRoot, "styles/globals.css")),
  );
  const versioned = (name: string, dev = false) => {
    const version = dev
      ? packageJson.devDependencies[name]
      : packageJson.dependencies[name];
    if (!version || version.startsWith("workspace:"))
      throw new Error(
        `Missing ${dev ? "devDependency" : "dependency"} declaration: ${name}`,
      );
    return `${name}@${version}`;
  };
  function item(
    name: string,
    type: RegistryItem["type"],
    entries: string[],
  ): RegistryItem {
    const visited = new Set<string>();
    const dependencies = new Set(styleDependencies);
    const devDependencies = new Set<string>();
    function visit(path: string) {
      if (visited.has(path)) return;
      visited.add(path);
      const source = sources.get(path);
      if (!source) throw new Error(`Missing registry source: ${path}`);
      for (const reference of source.references) {
        const local = localPath(path, reference.name);
        if (local) visit(local);
        else {
          const dependency = packageName(reference.name);
          // React is provided by the initialized host; preserve its installed version.
          if (dependency !== "react" && dependency !== "react-dom") {
            if (path.endsWith(".d.ts")) devDependencies.add(dependency);
            else dependencies.add(dependency);
          }
          if (reference.name.endsWith("?worker"))
            visit(join(sourceRoot, "types/worker.d.ts"));
        }
      }
      for (const dependency of source.typeReferences) {
        devDependencies.add(dependency);
        // The CLI's TypeScript printer drops /// reference directives. Import a
        // declaration module explicitly, so even restrictive tsconfig types and
        // files lists receive the WebGPU globals used by the renderer.
        if (dependency === "@webgpu/types")
          visit(join(sourceRoot, "types/webgpu.d.ts"));
      }
      if (path.endsWith(".css") && available.has(`${path}.d.ts`))
        visit(`${path}.d.ts`);
    }
    for (const path of entries) visit(path);
    const files = [...visited].sort().map((path) => {
      const source = sources.get(path);
      if (!source) throw new Error(`Missing registry source: ${path}`);
      let content = source.content;
      for (const reference of [...source.references].sort(
        (a, b) => b.start - a.start,
      )) {
        const local = localPath(path, reference.name);
        if (!local) continue;
        const query = reference.name.includes("?")
          ? `?${reference.name.split("?").slice(1).join("?")}`
          : "";
        content =
          content.slice(0, reference.start) +
          canonicalImport(local) +
          query +
          content.slice(reference.end);
      }
      if (source.typeReferences.includes("@webgpu/types")) {
        content = `import type {} from "${canonicalImport(join(sourceRoot, "types/webgpu.d.ts"))}";\n\n${content}`;
      }
      return fileDefinition(path, content);
    });
    let category = "components";
    let kind = "component";
    if (type === "registry:block") {
      category = "blocks";
      kind = "block";
    } else if (type === "registry:style") {
      category = "styles";
      kind = "style";
    } else if (type === "registry:lib") {
      category = "helpers";
      kind = "helper";
    }
    let description = `SUI ${kind}: ${name}. Includes its local dependencies and SUI styles.`;
    if (name === "sui")
      description = "All SUI components, blocks, hooks, helpers and styles.";
    return registryItemSchema.parse({
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name,
      type,
      title: name
        .split("-")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
      description,
      categories: ["sui", category],
      dependencies: [...dependencies]
        .sort()
        .map((dependency) => versioned(dependency)),
      devDependencies: [...devDependencies]
        .sort()
        .map((dependency) => versioned(dependency, true)),
      // Self-contained manifests avoid Glass cycles, namespace coupling, and
      // bare-name dependencies accidentally resolving to built-in shadcn items.
      registryDependencies: [],
      files,
      ...styles,
      docs:
        entries.some((path) => path.endsWith("/editor.tsx")) || name === "sui"
          ? "The Editor uses locally bundled Monaco Workers and requires a Vite-compatible ?worker loader. Keep the installed worker.d.ts in your TypeScript include paths."
          : undefined,
      meta: {
        source: homepage,
        tailwindVersion: "4",
        base: "base",
        entrypoints: entries.map(canonicalImport),
      },
    });
  }
  const components = paths.filter(
    (path) =>
      dirname(path) === join(sourceRoot, "components") && path.endsWith(".tsx"),
  );
  const blocks = paths.filter(
    (path) =>
      dirname(path) === join(sourceRoot, "blocks") && path.endsWith(".tsx"),
  );
  const entries = [...components, ...blocks];
  const items = entries.map((path) =>
    item(
      relative(dirname(path), path).replace(/\.tsx$/, ""),
      blocks.includes(path) ? "registry:block" : "registry:ui",
      [path],
    ),
  );
  items.push(item("sui-style", "registry:style", []));
  items.push(
    item("sui-theme", "registry:lib", [join(sourceRoot, "lib/theme/theme.ts")]),
  );
  items.push(
    item(
      "sui",
      "registry:block",
      [...sources.keys()].filter(
        (path) => !relative(sourceRoot, path).startsWith("styles/"),
      ),
    ),
  );
  if (new Set(items.map((entry) => entry.name)).size !== items.length)
    throw new Error("Duplicate registry names");
  return registrySchema.parse({
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "sui",
    homepage,
    items,
  });
}

function registryPayloads(
  registry: Awaited<ReturnType<typeof createRegistry>>,
) {
  const payloads = new Map<string, string>();
  for (const item of registry.items)
    payloads.set(`${item.name}.json`, `${JSON.stringify(item, null, 2)}\n`);
  // The searchable catalog carries file paths and descriptions, without repeating
  // the full source and styles for every item. View/add fetch individual payloads.
  const catalog = registrySchema.parse({
    ...registry,
    items: registry.items.map(({ files, css, cssVars, ...item }) => ({
      ...item,
      files: files?.map(({ content, ...file }) => file),
    })),
  });
  payloads.set("registry.json", `${JSON.stringify(catalog, null, 2)}\n`);
  for (const [name, content] of payloads) {
    // Keep individual raw GitHub payloads below the CLI's registry size limit.
    if (Buffer.byteLength(content) >= 5 * 1024 * 1024)
      throw new Error(`Registry payload ${name} must be smaller than 5 MiB`);
  }
  return payloads;
}

export async function buildRegistry(
  output = registryOutput,
  publishedOutput?: string,
) {
  const registry = await createRegistry();
  const payloads = registryPayloads(registry);
  const outputs = new Set([output]);
  if (publishedOutput) outputs.add(publishedOutput);
  else if (output === registryOutput) outputs.add(publishedRegistryOutput);
  for (const directory of outputs) {
    await mkdir(directory, { recursive: true });
    for (const file of await readdir(directory)) {
      if (file.endsWith(".json") && !payloads.has(file))
        await rm(join(directory, file));
    }
    for (const [name, content] of payloads)
      await writeFile(join(directory, name), content);
  }
  return registry;
}

/** Read-only publication check: source changes must regenerate committed JSON. */
export async function checkRegistry(output = publishedRegistryOutput) {
  const registry = await createRegistry();
  const payloads = registryPayloads(registry);
  const failures: string[] = [];
  let files: string[];
  try {
    files = await readdir(output);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error(
      `Registry directory ${relative(repositoryRoot, output)} is missing. Run bun run registry:build.`,
    );
  }
  for (const [name, expected] of payloads) {
    if (!files.includes(name)) failures.push(`Missing ${name}`);
    else if ((await readFile(join(output, name), "utf8")) !== expected)
      failures.push(`Stale ${name}`);
  }
  for (const file of files) {
    if (file.endsWith(".json") && !payloads.has(file))
      failures.push(`Unexpected ${file}`);
  }
  if (failures.length)
    throw new Error(
      `Published registry differs from source:\n${failures.join("\n")}\nRun bun run registry:build.`,
    );
  return registry;
}

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const registry = await checkRegistry();
    console.log(
      `Checked ${registry.items.length} published SUI registry items against source.`,
    );
  } else {
    const registry = await buildRegistry();
    console.log(
      `Built ${registry.items.length} SUI registry items in apps/docs/public/r and registry/r.`,
    );
  }
}
