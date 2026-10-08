import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import type { MDXComponents } from "mdx/types";
import { components } from "../lib/catalog";
import { getLocale, localePath } from "../lib/i18n";
import { CodeBlock, CodePre } from "./code-block";
import { ComponentPreview, ComponentSource } from "./component-preview";
import { Heading } from "./heading";

export function ComponentIndex() {
  const { lang } = useParams({ strict: false });
  const locale = getLocale(lang);
  return (
    <div className="component-index not-prose">
      {components.map((component) => (
        <Link
          key={component.slug}
          to={localePath(locale, `/docs/components/${component.slug}`)}
        >
          <span>{component.name}</span>
          <span>{component.description[locale]}</span>
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
