import navigation from "../../content/docs/meta.json";
import { defaultLocale, isLocale, type Locale, localePath } from "./i18n";

export interface LLMPage {
  path: string;
  slugs: string[];
  title: string;
  description?: string;
}

export interface LLMContent {
  pages: (locale: Locale) => LLMPage[];
  markdown: (page: LLMPage) => Promise<string>;
  example: (name: string) => Promise<string>;
}

const messages = {
  "en-US": {
    summary:
      "SUI is a collection of composable React components built on Base UI and Tailwind CSS. These documents include complete examples from the workspace.",
    groups: {
      "Getting Started": "Getting started",
      Resources: "Resources",
      Components: "Components",
      Blocks: "Blocks",
      Layouts: "Layouts",
      Viewers: "Viewers",
      Chat: "Chat",
      Charts: "Charts",
      Utils: "Utils",
    } as Record<string, string>,
    full: "Complete documentation",
    source: "Page",
    example: "Example",
    packageManagers:
      "With pnpm, Yarn or Bun, use `pnpm dlx`, `yarn dlx` or `bunx --bun` in place of `npx`, and `pnpm add`, `yarn add` or `bun add` in place of `npm install`.",
  },
  "zh-CN": {
    summary:
      "SUI 是基于 Base UI 和 Tailwind CSS 构建的可组合 React 组件库。本文档包含工作区中的完整示例源码",
    groups: {
      "Getting Started": "开始使用",
      Resources: "资源",
      Components: "组件",
      Blocks: "Blocks",
      Layouts: "布局",
      Viewers: "查看器",
      Chat: "聊天",
      Charts: "图表",
      Utils: "工具",
    } as Record<string, string>,
    full: "完整文档",
    source: "页面",
    example: "示例",
    packageManagers:
      "使用 pnpm、Yarn 或 Bun 时，把 `npx` 换成 `pnpm dlx`、`yarn dlx` 或 `bunx --bun`，把 `npm install` 换成 `pnpm add`、`yarn add` 或 `bun add`。",
  },
} as const;

interface Group {
  /** The sidebar separator, such as `Components`. */
  readonly label: string;
  /** Top-level pages in sidebar order; `index` is the introduction. */
  readonly pages: string[];
  readonly directories: string[];
}

/**
 * Index groups in sidebar order, read from the navigation in `meta.json`,
 * so a new docs category gets its own group instead of joining the guides.
 */
export const llmGroups = navigation.pages.reduce<Group[]>((groups, entry) => {
  const separator = /^---(.+)---$/.exec(entry);
  if (separator)
    groups.push({ label: separator[1] ?? entry, pages: [], directories: [] });
  else if (entry.startsWith("..."))
    groups.at(-1)?.directories.push(entry.slice(3));
  else groups.at(-1)?.pages.push(entry);
  return groups;
}, []);

function pageKey(page: LLMPage) {
  return page.slugs.join("/") || "index";
}

/** The page's group in the navigation, or -1 when the sidebar omits it. */
export function llmGroupOf(page: LLMPage) {
  return llmGroups.findIndex(
    (group) =>
      group.pages.includes(pageKey(page)) ||
      group.directories.includes(page.slugs[0] ?? ""),
  );
}

/** A page the sidebar omits stays reachable at the end of the first group. */
function groupRank(page: LLMPage) {
  return Math.max(0, llmGroupOf(page));
}

/** Groups in sidebar order; guides as listed, directory pages alphabetical. */
function sortedPages(pages: LLMPage[]) {
  const position = (page: LLMPage) => {
    const listed = llmGroups[groupRank(page)]?.pages ?? [];
    const at = listed.indexOf(pageKey(page));
    return at === -1 ? listed.length : at;
  };
  return [...pages].sort((a, b) => {
    const difference = groupRank(a) - groupRank(b);
    if (difference) return difference;
    const listed = position(a) - position(b);
    if (listed) return listed;
    return a.slugs.join("/").localeCompare(b.slugs.join("/"), "en-US");
  });
}

function markdownURL(origin: string, locale: Locale, page: LLMPage) {
  const url = new URL("/api/llms-markdown", origin);
  url.searchParams.set("locale", locale);
  url.searchParams.set("slug", page.slugs.join("/"));
  return url.href;
}

function pageURL(origin: string, locale: Locale, page: LLMPage) {
  const path = ["/docs", ...page.slugs].join("/");
  return `${origin}${localePath(locale, path)}`;
}

function pageLink(origin: string, locale: Locale, page: LLMPage) {
  const title = page.title.replace(/[[\]\n]/g, " ");
  const description = page.description?.replace(/\s+/g, " ");
  return `- [${title}](${markdownURL(origin, locale, page)})${description ? `: ${description}` : ""}`;
}

export function renderLLMIndex(
  pages: LLMPage[],
  locale: Locale,
  origin: string,
) {
  const text = messages[locale];
  const ordered = sortedPages(pages);
  const sections = llmGroups.flatMap((group, index) => {
    const members = ordered.filter((page) => groupRank(page) === index);
    if (members.length === 0) return [];
    return [
      `## ${text.groups[group.label] ?? group.label}`,
      members.map((page) => pageLink(origin, locale, page)).join("\n"),
    ];
  });
  return [
    "# SUI",
    `> ${text.summary}`,
    ...sections,
    "## Optional",
    `- [${text.full}](${origin}${localePath(locale, "/llms-full.txt")})`,
  ]
    .join("\n\n")
    .concat("\n");
}

function codeFence(source: string, language: string) {
  const longest = Math.max(
    2,
    ...[...source.matchAll(/`+/g)].map((m) => m[0].length),
  );
  const fence = "`".repeat(longest + 1);
  return `${fence}${language}\n${source.trimEnd()}\n${fence}`;
}

// Read a tag without evaluating expressions. Nested JSX in an attribute can
// contain its own '>', so quotes and brace depth delimit the outer tag.
function readTag(input: string, start: number) {
  let quote = "";
  let braces = 0;
  for (let i = start + 1; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === quote && input[i - 1] !== "\\") quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "{") braces++;
    else if (char === "}") braces--;
    else if (char === ">" && braces === 0) return input.slice(start, i + 1);
  }
  return undefined;
}

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1];
}

export async function toLLMMarkdown(
  raw: string,
  context: {
    locale: Locale;
    origin: string;
    pages: LLMPage[];
    example: LLMContent["example"];
  },
) {
  const protectedText: string[] = [];
  const protect = (text: string) => {
    protectedText.push(text);
    return `\uE000${protectedText.length - 1}\uE000`;
  };
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  let body = raw.slice(frontmatter?.[0].length ?? 0);
  // Install commands are written once, as npm, for the site's package-manager
  // tabs; plain Markdown shows the npm command and how to run it elsewhere.
  body = body.replace(
    /^```npm[^\n]*\n([\s\S]*?)^```[ \t]*$/gm,
    (_, commands: string) =>
      `\`\`\`bash\n${commands}\`\`\`\n\n${messages[context.locale].packageManagers}`,
  );
  // Preserve code verbatim, including JSX and import statements inside examples.
  body = body.replace(
    /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm,
    protect,
  );
  body = body.replace(/(`+)([^`]|`(?!\1))*?\1/g, protect);
  body = body.replace(
    /^import\s[\s\S]*?(?:;[ \t]*$|from\s+["'][^"']+["'][ \t]*;?[ \t]*$)/gm,
    "",
  );
  body = body.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  body = body.replace(/\s*\[#[^\]\n]+\]/g, "");

  let result = "";
  for (let i = 0; i < body.length; ) {
    if (
      body[i] !== "<" ||
      !/^<\/?[A-Za-z][\w.-]*(?=\s|\/?>)/.test(body.slice(i))
    ) {
      result += body[i++];
      continue;
    }
    const tag = readTag(body, i);
    if (!tag) {
      result += body[i++];
      continue;
    }
    const name = tag.match(/^<\/?([\w.]+)/)?.[1];
    const closing = tag.startsWith("</");
    if (name === "ComponentPreview" || name === "ComponentSource") {
      const exampleName = attribute(tag, "name");
      if (!exampleName) throw new Error("Example tag is missing a name");
      const source = await context.example(exampleName);
      result += `\n\n### ${messages[context.locale].example}: ${exampleName}\n\n${protect(codeFence(source, "tsx"))}\n\n`;
    } else if (name === "ComponentIndex") {
      result += sortedPages(context.pages)
        .filter(
          (page) => page.slugs[0] === "components" && page.slugs.length > 1,
        )
        .map((page) => pageLink(context.origin, context.locale, page))
        .join("\n");
    } else if (name === "Step" && !closing) {
      result += "\n\n### ";
    } else if (name === "Callout" && !closing) {
      const title = attribute(tag, "title");
      result += title ? `\n\n**${title}**\n\n` : "\n\n";
    } else if (name === "img") {
      const src = attribute(tag, "src");
      if (src) result += `![${attribute(tag, "alt") ?? ""}](${src})`;
    } else if (name === "a" && !closing) {
      const href = attribute(tag, "href");
      const end = body.indexOf("</a>", i + tag.length);
      if (href && end !== -1) {
        result += `[${body.slice(i + tag.length, end).trim()}](${href})`;
        i = end + 4;
        continue;
      }
    } else if (
      closing ||
      ["Steps", "figure", "figcaption"].includes(name ?? "")
    ) {
      result += "\n\n";
    }
    i += tag.length;
  }
  // Frontmatter carries useful upstream documentation/API links.
  const links = [
    ...(frontmatter?.[1].matchAll(/^\s+(doc|api):\s+(https?:\/\/\S+)/gm) ?? []),
  ].map(
    ([, name, href]) =>
      `- [${name === "api" ? "API reference" : "Documentation"}](${href})`,
  );
  result = result.replace(/\n{3,}/g, "\n\n").trim();
  result = result.replace(
    /\uE000(\d+)\uE000/g,
    (_, index: string) => protectedText[Number(index)] ?? "",
  );
  if (links.length) result += `\n\n${links.join("\n")}`;
  return `${result}\n`;
}

async function renderPage(
  content: LLMContent,
  page: LLMPage,
  locale: Locale,
  origin: string,
  pages: LLMPage[],
) {
  const body = await toLLMMarkdown(await content.markdown(page), {
    locale,
    origin,
    pages,
    example: content.example,
  });
  return `# ${page.title}\n\n${page.description ? `${page.description}\n\n` : ""}${messages[locale].source}: ${pageURL(origin, locale, page)}\n\n${body}`;
}

const cacheHeaders = { "Cache-Control": "public, max-age=300, s-maxage=3600" };

export async function llmsResponse(
  content: LLMContent,
  request: Request,
  kind: "index" | "full" | "page",
  lang?: string,
) {
  const url = new URL(request.url);
  const locale =
    kind === "page"
      ? (url.searchParams.get("locale") ?? defaultLocale)
      : (lang ?? defaultLocale);
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  if (kind !== "page" && lang === defaultLocale) {
    url.pathname = localePath(defaultLocale, url.pathname);
    return new Response(null, { status: 308, headers: { Location: url.href } });
  }
  const pages = content.pages(locale);
  let text: string;
  if (kind === "index") text = renderLLMIndex(pages, locale, url.origin);
  else if (kind === "full") {
    const bodies = await Promise.all(
      sortedPages(pages).map((page) =>
        renderPage(content, page, locale, url.origin, pages),
      ),
    );
    text = `# SUI\n\n> ${messages[locale].summary}\n\n${bodies.join("\n\n---\n\n")}`;
  } else {
    const slug = url.searchParams.get("slug") ?? "";
    const page = pages.find((item) => item.slugs.join("/") === slug);
    if (!page) return new Response("Not found", { status: 404 });
    text = await renderPage(content, page, locale, url.origin, pages);
  }
  return new Response(text, {
    headers: {
      ...cacheHeaders,
      "Content-Type": `${kind === "page" ? "text/markdown" : "text/plain"}; charset=utf-8`,
    },
  });
}
