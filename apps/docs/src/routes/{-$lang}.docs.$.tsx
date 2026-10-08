import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@workspace/ui/components/button";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/spacious";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/spacious/page";
import { Suspense, use } from "react";
import { MarkdownCopyButton } from "../components/markdown-copy-button";
import { getMDXComponents } from "../components/mdx";
import { getLocale, isLocale, type Locale } from "../lib/i18n";
import {
  DocumentationActions,
  DocumentationMobileHeader,
  layoutOptions,
} from "../lib/layout";
import { docs, source } from "../lib/source";

const loadDocument = createServerFn({ method: "GET" })
  .validator((data: { slugs: string[]; locale: Locale }) => {
    if (
      !data ||
      !isLocale(data.locale) ||
      !Array.isArray(data.slugs) ||
      data.slugs.some(
        (slug) => typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug),
      )
    )
      throw notFound();
    return data;
  })
  .handler(async ({ data }) => {
    const page = source.getPage(data.slugs, data.locale);
    if (!page) throw notFound();
    return {
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      pageTree: await source.serializePageTree(source.getPageTree(data.locale)),
    };
  });

export const Route = createFileRoute("/{-$lang}/docs/$")({
  loader: async ({ params }) => {
    const data = await loadDocument({
      data: {
        slugs: params._splat?.split("/").filter(Boolean) ?? [],
        locale: getLocale(params.lang),
      },
    });
    await docs.getPage(data.path)?.preload();
    return data;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Docs"} — SUI` },
      {
        name: "description",
        content: loaderData?.description ?? "SUI component documentation",
      },
    ],
    links: [
      {
        rel: "alternate",
        type: "text/markdown",
        href: `/api/llms-markdown?${new URLSearchParams({ locale: getLocale(params.lang), slug: params._splat ?? "" })}`,
      },
    ],
  }),
  component: Documentation,
});

function DocumentContent({ path }: { path: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`Document missing: ${path}`);
  const { toc } = use(page.load());
  const Body = page.body;
  const { lang, _splat } = Route.useParams();
  const markdownUrl = `/api/markdown?${new URLSearchParams({ locale: getLocale(lang), slug: _splat ?? "" })}`;
  const llmMarkdownUrl = `/api/llms-markdown?${new URLSearchParams({ locale: getLocale(lang), slug: _splat ?? "" })}`;
  return (
    <DocsPage id="main-content" toc={toc}>
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <div className="mb-8 flex items-center gap-2 border-b pb-6">
        <MarkdownCopyButton
          markdownUrl={markdownUrl}
          locale={getLocale(lang)}
        />
        <ViewOptionsPopover
          markdownUrl={llmMarkdownUrl}
          render={(props) => (
            <Button
              {...props}
              variant="secondary"
              size="sm"
              className="gap-2"
            />
          )}
        />
      </div>
      <DocsBody>
        <Body components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

function Documentation() {
  const { path, pageTree } = useFumadocsLoader(Route.useLoaderData());
  const { lang } = Route.useParams();
  return (
    <DocsLayout
      tree={pageTree}
      {...layoutOptions(getLocale(lang))}
      links={[]}
      slots={{
        ...layoutOptions(getLocale(lang)).slots,
        actions: DocumentationActions,
        header: DocumentationMobileHeader,
      }}
      tabs={false}
    >
      <Suspense
        fallback={
          <p className="p-6" role="status">
            {getLocale(lang) === "zh-CN"
              ? "正在加载文档…"
              : "Loading documentation…"}
          </p>
        }
      >
        <DocumentContent path={path} />
      </Suspense>
    </DocsLayout>
  );
}
