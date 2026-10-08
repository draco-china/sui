import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loader, type VirtualFile } from "fumadocs-core/source";
import * as ts from "typescript";
import { getMDXComponents } from "../src/components/mdx";
import { examples, sourceFiles } from "../src/examples";
import { components } from "../src/lib/catalog";
import { i18n } from "../src/lib/i18n";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const uiRoot = join(appRoot, "../../packages/ui/src");
const contentRoot = join(appRoot, "content/docs");
const exportedNames = new Map<string, Set<string>>();
const docs = [...new Bun.Glob("**/*.mdx").scanSync(contentRoot)].sort();

function exportsOf(path: string) {
  const cached = exportedNames.get(path);
  if (cached) return cached;
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const item of statement.exportClause.elements) {
        names.add(item.name.text);
      }
    } else if (
      ts.canHaveModifiers(statement) &&
      ts
        .getModifiers(statement)
        ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          names.add(declaration.name.getText(source));
        }
      } else if ("name" in statement && statement.name) {
        names.add((statement.name as ts.Identifier).text);
      }
    }
  }
  exportedNames.set(path, names);
  return names;
}

function workspaceFile(specifier: string) {
  const relative = specifier.replace("@workspace/ui/", "");
  const extension =
    relative.startsWith("components/") || relative.startsWith("blocks/")
      ? ".tsx"
      : ".ts";
  return join(uiRoot, `${relative}${extension}`);
}

describe("documentation coverage", () => {
  test("component navigation contains the same pages in both locales", () => {
    const readPages = (file: string) =>
      JSON.parse(readFileSync(join(contentRoot, "components", file), "utf8"))
        .pages as string[];
    const english = readPages("meta.json");
    const chinese = readPages("meta.zh-CN.json");
    expect(chinese).toEqual(english);
    expect(chinese).toContain("color-picker");
  });
  test("navigation exposes bilingual resource guides and individual Blocks without a directory route", () => {
    const files: VirtualFile[] = docs.map((path) => ({
      type: "page",
      path,
      data: {
        title: readFileSync(join(contentRoot, path), "utf8").match(
          /^title:\s*(.+)$/m,
        )?.[1],
      },
    }));
    for (const path of new Bun.Glob("**/*.json").scanSync(contentRoot)) {
      files.push({
        type: "meta",
        path,
        data: JSON.parse(readFileSync(join(contentRoot, path), "utf8")),
      });
    }
    const reference = loader({ baseUrl: "/docs", i18n, source: { files } });
    for (const locale of ["en-US", "zh-CN"]) {
      const prefix = locale === "zh-CN" ? "/zh-CN" : "";
      expect(reference.getPage(["blocks"], locale)).toBeUndefined();
      expect(
        reference.getPage(["blocks", "delete-resource"], locale)?.data.title,
      ).toBe("Delete Resource");
      const tree = JSON.stringify(reference.getPageTree(locale));
      expect(tree).toContain('"name":"Blocks"');
      expect(tree).toContain('"name":"Delete Resource"');
      expect(tree).not.toContain("组合模块");
      expect(tree).not.toContain("删除资源");
      expect(tree).not.toContain(`"url":"${prefix}/docs/blocks"`);
      for (const slug of ["data-table", "tanstack-form", "delete-resource"]) {
        expect(tree).toContain(`"url":"${prefix}/docs/blocks/${slug}"`);
      }
      for (const slug of [
        "cli",
        "registry",
        "mcp",
        "llms-txt",
        "compatibility",
      ]) {
        expect(reference.getPage([slug], locale)?.url).toBe(
          `${prefix}/docs/${slug}`,
        );
        expect(tree).toContain(`"url":"${prefix}/docs/${slug}"`);
      }
      expect(tree).toContain('"name":"Resources"');
    }
    const layout = readFileSync(join(appRoot, "src/lib/layout.tsx"), "utf8");
    expect(layout).not.toContain('"/docs/blocks"');
    expect(readFileSync(join(appRoot, "../../README.md"), "utf8")).not.toMatch(
      /`(?:\/zh-CN)?\/docs\/blocks`/,
    );
  });
  test("shared stylesheet imports use real package exports", () => {
    const packageRoot = join(uiRoot, "..");
    const manifest = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, string> };
    const failures: string[] = [];
    for (const file of docs) {
      const text = readFileSync(join(contentRoot, file), "utf8");
      for (const [, path] of text.matchAll(
        /@import "@workspace\/ui\/([^"\n]+)"/g,
      )) {
        const specifier = `./${path}`;
        let target = manifest.exports[specifier];
        if (!target) {
          for (const [key, value] of Object.entries(manifest.exports)) {
            const [prefix, suffix] = key.split("*");
            if (
              suffix !== undefined &&
              specifier.startsWith(prefix) &&
              specifier.endsWith(suffix)
            ) {
              const match = specifier.slice(
                prefix.length,
                specifier.length - suffix.length,
              );
              target = value.replace("*", match);
              break;
            }
          }
        }
        if (!target || !existsSync(join(packageRoot, target))) {
          failures.push(`${file}: @workspace/ui/${path}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
  test("catalog, live examples and displayed sources cover every UI component", () => {
    const slugs = readdirSync(join(uiRoot, "components"))
      .filter(
        (file) =>
          file.endsWith(".tsx") &&
          !["copy-icon.tsx", "morph-icon.tsx"].includes(file),
      )
      .map((file) => file.slice(0, -4))
      .sort();
    expect(slugs.length).toBeGreaterThan(0);
    expect(components.map((entry) => entry.slug).sort()).toEqual(slugs);
    expect(Object.keys(sourceFiles).sort()).toEqual(
      Object.keys(examples).sort(),
    );
  });

  for (const { slug } of components) {
    for (const locale of ["en-US", "zh-CN"] as const) {
      test(`${slug} has a ${locale} page with a registered live example`, () => {
        const suffix = locale === "zh-CN" ? ".zh-CN" : "";
        const text = readFileSync(
          join(contentRoot, `components/${slug}${suffix}.mdx`),
          "utf8",
        );
        expect(text).toMatch(/^---\n[\s\S]*?title: .+\n[\s\S]*?---/);

        const names = [
          ...text.matchAll(/<Component(?:Preview|Source)\s+name="([^"]+)"/g),
        ];
        expect(names.length).toBeGreaterThan(0);
        for (const [, name] of names) {
          expect(name in examples).toBe(true);
          expect(name in sourceFiles).toBe(true);
        }
      });
    }
  }

  test("custom JSX components used by document prose are provided by MDX", () => {
    const registered = getMDXComponents();
    const failures: string[] = [];
    for (const file of docs) {
      const prose = readFileSync(join(contentRoot, file), "utf8")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]*`/g, "");
      for (const [, name] of prose.matchAll(/<([A-Z]\w*)\b/g)) {
        if (!(name in registered))
          failures.push(`${file}: unregistered MDX component ${name}`);
      }
    }
    expect(failures).toEqual([]);
  });

  test("all UI imports shown in documentation refer to real files and exports", () => {
    const failures: string[] = [];
    for (const file of docs) {
      const text = readFileSync(join(contentRoot, file), "utf8");
      for (const [, code] of text.matchAll(
        /```(?:tsx?|jsx?)[^\n]*\n([\s\S]*?)```/g,
      )) {
        const source = ts.createSourceFile(
          file,
          code,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        for (const statement of source.statements) {
          if (
            !ts.isImportDeclaration(statement) ||
            !ts.isStringLiteral(statement.moduleSpecifier)
          )
            continue;
          const specifier = statement.moduleSpecifier.text;
          if (!specifier.startsWith("@workspace/ui/")) continue;
          try {
            const names = exportsOf(workspaceFile(specifier));
            const bindings = statement.importClause?.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) {
              for (const binding of bindings.elements) {
                const name = (binding.propertyName ?? binding.name).text;
                if (!names.has(name))
                  failures.push(
                    `${file}: ${specifier} does not export ${name}`,
                  );
              }
            }
          } catch {
            failures.push(`${file}: missing module ${specifier}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test("internal document links resolve to pages in the requested language", () => {
    const failures: string[] = [];
    for (const file of docs) {
      // Code examples are displayed source, not navigable document links.
      const prose = readFileSync(join(contentRoot, file), "utf8").replace(
        /```[\s\S]*?```/g,
        "",
      );
      for (const [, target] of prose.matchAll(
        /(?:\]\(|href=["'])((?:\/zh-CN|\/en-US)?\/docs(?:[/?#][^\s)"']*)?)/g,
      )) {
        const url = new URL(target, "https://docs.example");
        const chinese = url.pathname.startsWith("/zh-CN/");
        const slug = url.pathname
          .replace(/^\/(?:zh-CN\/|en-US\/)?docs\/?/, "")
          .replace(/\/$/, "");
        const suffix = chinese ? ".zh-CN" : "";
        const candidates = [
          `${slug || "index"}${suffix}.mdx`,
          `${slug}/index${suffix}.mdx`,
        ];
        if (!candidates.some((candidate) => docs.includes(candidate)))
          failures.push(`${file}: ${target}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
