import { createFileRoute } from "@tanstack/react-router";
import { isLocale } from "../lib/i18n";
import { source } from "../lib/source";

const rawPages = import.meta.glob<string>("../../content/docs/**/*.mdx", {
  query: "?raw",
  import: "default",
});

export const Route = createFileRoute("/api/markdown")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const locale = url.searchParams.get("locale") ?? "en-US";
        if (!isLocale(locale))
          return new Response("Not found", { status: 404 });
        const slugs = (url.searchParams.get("slug") ?? "")
          .split("/")
          .filter(Boolean);
        const page = source.getPage(slugs, locale);
        const load = page && rawPages[`../../content/docs/${page.path}`];
        if (!load) return new Response("Not found", { status: 404 });
        return new Response(await load(), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
