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
const githubSourceDirectory = "registry/source";
const registrySizeLimit = 5 * 1024 * 1024;
/** How the UI package imports its own source. */
const workspaceAlias = "@workspace/ui/";

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

/** Where each source folder installs: its import alias and its CLI target. */
const installRules = [
  {
    folder: "components/",
    alias: "@/components/ui/",
    target: "@ui/",
    type: "registry:ui",
  },
  {
    folder: "blocks/",
    alias: "@/components/blocks/",
    target: "@components/blocks/",
    type: "registry:component",
  },
  {
    folder: "hooks/",
    alias: "@/hooks/",
    target: "@hooks/",
    type: "registry:hook",
  },
  { folder: "lib/", alias: "@/lib/", target: "@lib/", type: "registry:lib" },
  {
    folder: "types/",
    alias: "@/lib/sui/types/",
    target: "@lib/sui/types/",
    type: "registry:file",
  },
] as const;

function installRule(path: string) {
  const name = relative(sourceRoot, path).replaceAll("\\", "/");
  const rule = installRules.find((entry) => name.startsWith(entry.folder));
  if (!rule) throw new Error(`Unsupported registry file: ${name}`);
  return { name, rule, rest: name.slice(rule.folder.length) };
}

function canonicalImport(path: string) {
  const { rule, rest } = installRule(path);
  // CSS extensions are part of an import; TS extensions are resolved by the app.
  return `${rule.alias}${rest.replace(/(?:\.d)?\.(?:tsx?|jsx?)$/, "")}`;
}

function fileDefinition(path: string, content: string) {
  const { name, rule, rest } = installRule(path);
  return {
    path: `packages/ui/src/${name}`,
    // A block's stylesheet installs as a plain file beside its components.
    type:
      rule.folder === "blocks/" && extname(path) === ".css"
        ? ("registry:file" as const)
        : rule.type,
    target: `${rule.target}${rest}`,
    content,
  };
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

/** Compact formatting only; whitespace inside strings and escapes is data. */
function compactCssWhitespace(value: string) {
  return value.replace(
    /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\\[\s\S])|\s+/g,
    (match, literal: string | undefined) => literal ?? (match ? " " : ""),
  );
}

function cssNodes(nodes: readonly ChildNode[]): CssObject {
  const result: CssObject = {};
  for (const node of nodes) {
    if (node.type === "comment") continue;
    if (node.type === "decl") {
      result[node.prop] =
        `${compactCssWhitespace(node.value)}${node.important ? " !important" : ""}`;
    } else {
      let key: string;
      if (node.type === "rule") key = compactCssWhitespace(node.selector);
      else {
        key = `@${node.name}`;
        if (node.params) key += ` ${compactCssWhitespace(node.params)}`;
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
          `${compactCssWhitespace(child.value)}${child.important ? " !important" : ""}`;
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

type PackageManifest = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
type SourceTree = {
  paths: string[];
  available: Set<string>;
  sources: Map<string, Source>;
};
type RegistryContext = SourceTree & {
  manifest: PackageManifest;
  styles: ReturnType<typeof registryStyles>;
  styleDependencies: Set<string>;
};

async function readSources(): Promise<SourceTree> {
  const paths = await filesUnder(sourceRoot);
  const sources = new Map<string, Source>();
  for (const path of paths) {
    if (!/\.(?:tsx?|css)$/.test(path)) continue;
    const content = await readFile(path, "utf8");
    const modules = path.endsWith(".css")
      ? { references: [], typeReferences: [] }
      : moduleReferences(path, content);
    sources.set(path, { content, ...modules });
  }
  return { paths, available: new Set(paths), sources };
}

/** The local source file an import names, or undefined for a package. */
function localPath(tree: SourceTree, from: string, name: string) {
  const specifier = name.split("?")[0];
  let base: string;
  if (specifier.startsWith(workspaceAlias))
    base = join(sourceRoot, specifier.slice(workspaceAlias.length));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return undefined;
  const found = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ].find((candidate) => tree.available.has(candidate));
  if (!found || !tree.sources.has(found))
    throw new Error(
      `Unresolved local import ${name} in ${relative(sourceRoot, from)}`,
    );
  return found;
}

/** Inlines relative CSS imports and collects the packages the rest import. */
async function expandStyles(
  tree: SourceTree,
  path: string,
  packages: Set<string>,
  ancestors = new Set<string>(),
): Promise<string> {
  if (ancestors.has(path)) throw new Error(`Cyclic CSS imports: ${path}`);
  const content = tree.sources.get(path)?.content;
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
        tree,
        resolve(dirname(path), specifier),
        packages,
        new Set([...ancestors, path]),
      );
      node.replaceWith(postcss.parse(expanded).nodes);
    } else if (specifier === "tailwindcss") {
      // Initialized Tailwind v4 projects already import the compiler stylesheet.
      node.remove();
    } else {
      packages.add(packageName(specifier));
    }
  }
  return root.toString();
}

function pinnedVersion(manifest: PackageManifest, name: string, dev = false) {
  const version = dev
    ? manifest.devDependencies[name]
    : manifest.dependencies[name];
  if (!version || version.startsWith("workspace:"))
    throw new Error(
      `Missing ${dev ? "devDependency" : "dependency"} declaration: ${name}`,
    );
  return `${name}@${version}`;
}

/** The local files the entries reach, and the packages those files import. */
function dependencyClosure(context: RegistryContext, entries: string[]) {
  const files = new Set<string>();
  const dependencies = new Set(context.styleDependencies);
  const devDependencies = new Set<string>();
  function visit(path: string) {
    if (files.has(path)) return;
    files.add(path);
    const source = context.sources.get(path);
    if (!source) throw new Error(`Missing registry source: ${path}`);
    for (const reference of source.references) {
      const local = localPath(context, path, reference.name);
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
    for (const dependency of source.typeReferences)
      devDependencies.add(dependency);
    if (path.endsWith(".css") && context.available.has(`${path}.d.ts`))
      visit(`${path}.d.ts`);
  }
  for (const path of entries) visit(path);
  return { files, dependencies, devDependencies };
}

/** A source file with its local imports rewritten to their installed aliases. */
function installedContent(tree: SourceTree, path: string) {
  const source = tree.sources.get(path);
  if (!source) throw new Error(`Missing registry source: ${path}`);
  let content = source.content;
  for (const reference of [...source.references].sort(
    (a, b) => b.start - a.start,
  )) {
    const local = localPath(tree, path, reference.name);
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
  return content;
}

const itemKinds: Partial<
  Record<RegistryItem["type"], { category: string; kind: string }>
> = {
  "registry:block": { category: "blocks", kind: "block" },
  "registry:style": { category: "styles", kind: "style" },
  "registry:lib": { category: "helpers", kind: "helper" },
};

function registryItem(
  context: RegistryContext,
  name: string,
  type: RegistryItem["type"],
  entries: string[],
): RegistryItem {
  const { files, dependencies, devDependencies } = dependencyClosure(
    context,
    entries,
  );
  const { category, kind } = itemKinds[type] ?? {
    category: "components",
    kind: "component",
  };
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
      .map((dependency) => pinnedVersion(context.manifest, dependency)),
    devDependencies: [...devDependencies]
      .sort()
      .map((dependency) => pinnedVersion(context.manifest, dependency, true)),
    // Self-contained manifests avoid Glass cycles, namespace coupling, and
    // bare-name dependencies accidentally resolving to built-in shadcn items.
    registryDependencies: [],
    files: [...files]
      .sort()
      .map((path) => fileDefinition(path, installedContent(context, path))),
    ...context.styles,
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

export async function createRegistry() {
  const manifest = JSON.parse(
    await readFile(join(repositoryRoot, "packages/ui/package.json"), "utf8"),
  ) as PackageManifest;
  const tree = await readSources();
  const styleDependencies = new Set<string>();
  const styles = registryStyles(
    await expandStyles(
      tree,
      join(sourceRoot, "styles/globals.css"),
      styleDependencies,
    ),
  );
  const context: RegistryContext = {
    ...tree,
    manifest,
    styles,
    styleDependencies,
  };
  const item = (name: string, type: RegistryItem["type"], entries: string[]) =>
    registryItem(context, name, type, entries);
  const components = tree.paths.filter(
    (path) =>
      dirname(path) === join(sourceRoot, "components") && path.endsWith(".tsx"),
  );
  const blocks = tree.paths.filter(
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
  const themes = tree.paths.filter(
    (path) =>
      dirname(path) === join(sourceRoot, "styles/themes") &&
      path.endsWith(".css"),
  );
  for (const path of themes) {
    const theme = relative(dirname(path), path).replace(/\.css$/, "");
    items.push(
      registryItemSchema.parse({
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: `theme-${theme}`,
        type: "registry:style",
        title: `${theme[0].toUpperCase()}${theme.slice(1)} theme`,
        description: `Optional ${theme} palette. Install SUI base styles first, then select data-color="${theme}".`,
        categories: ["sui", "styles"],
        registryDependencies: [],
        files: [],
        ...registryStyles(await readFile(path, "utf8")),
      }),
    );
  }
  items.push(item("sui-style", "registry:style", []));
  items.push(
    item("sui-theme", "registry:lib", [join(sourceRoot, "lib/theme/theme.ts")]),
  );
  items.push(
    item(
      "sui",
      "registry:block",
      [...tree.sources.keys()].filter(
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

function assertPayloadSizes(payloads: Map<string, string>, kind: string) {
  for (const [name, content] of payloads) {
    if (Buffer.byteLength(content) >= registrySizeLimit)
      throw new Error(`${kind} ${name} must be smaller than 5 MiB`);
  }
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
  // Keep individual raw GitHub payloads below the CLI's registry size limit.
  assertPayloadSizes(payloads, "Registry payload");
  return payloads;
}

/** GitHub hydrates files from the repository, so publish the normalized source too. */
export function githubRegistryPayloads(
  registry: Awaited<ReturnType<typeof createRegistry>>,
) {
  const payloads = new Map<string, string>();
  const manifest = registrySchema.parse({
    ...registry,
    homepage: "https://sui.draco.dev",
    items: registry.items.map((item) => ({
      ...item,
      files: item.files?.map(({ content, ...file }) => {
        if (content === undefined)
          throw new Error(`Missing GitHub registry source: ${file.path}`);
        const path = `${githubSourceDirectory}/${file.path.slice("packages/ui/src/".length)}`;
        const previous = payloads.get(path);
        if (previous !== undefined && previous !== content)
          throw new Error(`Conflicting GitHub registry source: ${path}`);
        payloads.set(path, content);
        return { ...file, path };
      }),
    })),
  });
  // A compact manifest keeps complete, self-contained styles below GitHub's
  // 5 MiB read limit without introducing unpinned cross-item dependencies.
  payloads.set("registry.json", `${JSON.stringify(manifest)}\n`);
  assertPayloadSizes(payloads, "GitHub registry file");
  return payloads;
}

async function githubSourceFiles(root: string) {
  try {
    return await filesUnder(join(root, githubSourceDirectory));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

export async function buildRegistry(
  output = registryOutput,
  publishedOutput?: string,
  githubOutput = output === registryOutput ? repositoryRoot : undefined,
) {
  const registry = await createRegistry();
  const payloads = registryPayloads(registry);
  const githubPayloads = githubOutput
    ? githubRegistryPayloads(registry)
    : undefined;
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
  if (githubOutput && githubPayloads) {
    for (const path of await githubSourceFiles(githubOutput)) {
      if (
        !githubPayloads.has(relative(githubOutput, path).replaceAll("\\", "/"))
      )
        await rm(path);
    }
    for (const [name, content] of githubPayloads) {
      const path = join(githubOutput, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }
  }
  return registry;
}

/** Read-only publication check: source changes must regenerate committed JSON. */
export async function checkRegistry(
  output = publishedRegistryOutput,
  githubOutput = output === publishedRegistryOutput
    ? repositoryRoot
    : undefined,
) {
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
  if (githubOutput) {
    const githubPayloads = githubRegistryPayloads(registry);
    for (const [name, expected] of githubPayloads) {
      try {
        if ((await readFile(join(githubOutput, name), "utf8")) !== expected)
          failures.push(`Stale ${name}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        failures.push(`Missing ${name}`);
      }
    }
    for (const path of await githubSourceFiles(githubOutput)) {
      const name = relative(githubOutput, path).replaceAll("\\", "/");
      if (!githubPayloads.has(name)) failures.push(`Unexpected ${name}`);
    }
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
      `Checked ${registry.items.length} SUI items in the GitHub and published JSON registries against source.`,
    );
  } else {
    const registry = await buildRegistry();
    console.log(
      `Built ${registry.items.length} SUI items in registry.json, registry/source, apps/docs/public/r and registry/r.`,
    );
  }
}
