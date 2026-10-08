import "@tanstack/react-start/server-only";
import { type LLMContent, llmsResponse } from "./llms";
import { source } from "./source";

const rawPages = import.meta.glob<string>("../../content/docs/**/*.mdx", {
  query: "?raw",
  import: "default",
});
const rawExamples = import.meta.glob<string>("../examples/variants/*.tsx", {
  query: "?raw",
  import: "default",
});

const content: LLMContent = {
  pages: (locale) =>
    source.getPages(locale).map((page) => ({
      path: page.path,
      slugs: page.slugs,
      title: page.data.title,
      description: page.data.description,
    })),
  markdown: async (page) => {
    const load = rawPages[`../../content/docs/${page.path}`];
    if (!load) throw new Error(`Missing document source: ${page.path}`);
    return load();
  },
  example: async (name) => {
    const load = rawExamples[`../examples/variants/${name}.tsx`];
    if (!load) throw new Error(`Missing example source: ${name}`);
    return load();
  },
};

export function serveLLMs(
  request: Request,
  kind: "index" | "full" | "page",
  lang?: string,
) {
  return llmsResponse(content, request, kind, lang);
}
