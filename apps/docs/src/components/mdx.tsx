import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import type * as PageTree from "fumadocs-core/page-tree";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { useTreeContext } from "fumadocs-ui/contexts/tree";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import type { MDXComponents } from "mdx/types";
import { getLocale, localePath } from "../lib/i18n";
import { CodeBlock, CodePre } from "./code-block";
import { ComponentPreview, ComponentSource } from "./component-preview";
import { Heading } from "./heading";

function pagesUnder(nodes: PageTree.Node[], prefix: string): PageTree.Item[] {
  return nodes.flatMap((node) => {
    if (node.type === "folder") return pagesUnder(node.children, prefix);
    if (node.type === "page" && node.url.startsWith(prefix)) return [node];
    return [];
  });
}

/** Lists component pages with the title and description of their own frontmatter. */
export function ComponentIndex() {
  const { lang } = useParams({ strict: false });
  const { full } = useTreeContext();
  const pages = pagesUnder(
    full.children,
    localePath(getLocale(lang), "/docs/components/"),
  );
  return (
    <div className="component-index not-prose">
      {pages.map((page) => (
        <Link key={page.url} to={page.url}>
          <span>{page.name}</span>
          <span>{page.description}</span>
        </Link>
      ))}
    </div>
  );
}

export function getMDXComponents(overrides?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CodeBlock,
    pre: CodePre,
    h1: (props) => <Heading as="h1" {...props} />,
    h2: (props) => <Heading as="h2" {...props} />,
    h3: (props) => <Heading as="h3" {...props} />,
    h4: (props) => <Heading as="h4" {...props} />,
    h5: (props) => <Heading as="h5" {...props} />,
    h6: (props) => <Heading as="h6" {...props} />,
    Button,
    ExternalLinkIcon,
    InfoIcon,
    Kbd,
    KbdGroup,
    ComponentPreview,
    ComponentSource,
    ComponentIndex,
    Steps,
    Step,
    Tabs,
    Tab,
    ...overrides,
  } satisfies MDXComponents;
}

export { getMDXComponents as useMDXComponents };

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
