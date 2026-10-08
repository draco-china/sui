import { isLocale, type Locale } from "./i18n";

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
    guides: "Getting started",
    components: "Components",
    blocks: "Blocks",
    utils: "Utils",
    full: "Complete documentation",
    source: "Page",
    example: "Example",
  },
  "zh-CN": {
    summary:
      "SUI 是基于 Base UI 和 Tailwind CSS 构建的可组合 React 组件库。本文档包含工作区中的完整示例源码",
    guides: "开始使用",
    components: "组件",
    blocks: "Blocks",
    utils: "工具",
    full: "完整文档",
    source: "页面",
    example: "示例",
  },
} as const;

function sortedPages(pages: LLMPage[]) {
  return [...pages].sort((a, b) => {
    const section = (page: LLMPage) => {
      if (page.slugs[0] === "components") return 1;
      if (page.slugs[0] === "blocks") return 2;
      if (page.slugs[0] === "utils") return 3;
      return 0;
    };
    const difference = section(a) - section(b);
    if (difference) return difference;
    if (section(a))
      return a.slugs.join("/").localeCompare(b.slugs.join("/"), "en-US");
    return a.title.localeCompare(b.title, "en-US");
  });
}

function markdownURL(origin: string, locale: Locale, page: LLMPage) {
  const url = new URL("/api/llms-markdown", origin);
  url.searchParams.set("locale", locale);
  url.searchParams.set("slug", page.slugs.join("/"));
  return url.href;
}

function pageURL(origin: string, locale: Locale, page: LLMPage) {
  const prefix = locale === "zh-CN" ? "/zh-CN" : "";
  return `${origin}${prefix}/docs${page.slugs.length ? `/${page.slugs.join("/")}` : ""}`;
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
  const guides = ordered.filter(
    (page) => !["components", "blocks", "utils"].includes(page.slugs[0] ?? ""),
  );
  const components = ordered.filter((page) => page.slugs[0] === "components");
  const blocks = ordered.filter((page) => page.slugs[0] === "blocks");
  const utils = ordered.filter((page) => page.slugs[0] === "utils");
  const prefix = locale === "zh-CN" ? "/zh-CN" : "";
  return [
    "# SUI",
    `> ${text.summary}`,
    `## ${text.guides}`,
    guides.map((page) => pageLink(origin, locale, page)).join("\n"),
    `## ${text.components}`,
    components.map((page) => pageLink(origin, locale, page)).join("\n"),
    ...(blocks.length
      ? [
          `## ${text.blocks}`,
          blocks.map((page) => pageLink(origin, locale, page)).join("\n"),
        ]
      : []),
    ...(utils.length
      ? [
          `## ${text.utils}`,
          utils.map((page) => pageLink(origin, locale, page)).join("\n"),
        ]
      : []),
    "## Optional",
    `- [${text.full}](${origin}${prefix}/llms-full.txt)`,
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
      ? (url.searchParams.get("locale") ?? "en-US")
      : (lang ?? "en-US");
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  if (kind !== "page" && lang === "en-US") {
    url.pathname = url.pathname.replace(/^\/en-US(?=\/)/, "");
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
