"use client";

import { cva } from "class-variance-authority";
import { cn } from "cn";
import {
  CircleCheckIcon,
  InfoIcon,
  type LucideIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  type ComponentProps,
  createContext,
  isValidElement,
  useContext,
  useId,
  useRef,
} from "react";
import type {
  Components,
  Options as ReactMarkdownOptions,
} from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import { useViewerTheme } from "../hooks/use-viewer-theme";
import { useGlassEnabled } from "../lib/glass/context";
import { CodeViewer, type CodeViewerLabels } from "./code-viewer";
import { GlassSurface } from "./glass";

interface MarkdownNode {
  type?: string;
  depth?: number;
  url?: string;
  properties?: Record<string, unknown>;
  lang?: string;
  value?: string;
  data?: Record<string, unknown>;
  children?: MarkdownNode[];
}

const MARKDOWN_TABLE_ALIGN_CLASSES = {
  center: "text-center",
  right: "text-right",
  left: "text-left",
} as const;

function getMarkdownTableAlignClass(align: string | undefined) {
  if (align === "center" || align === "right" || align === "left") {
    return MARKDOWN_TABLE_ALIGN_CLASSES[align];
  }
  return undefined;
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "summary",
    "kbd",
    "sub",
    "sup",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), "className", "target", "rel"],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    div: [...(defaultSchema.attributes?.div ?? []), "className", "data-alert"],
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      "type",
      "checked",
      "disabled",
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "className",
      "aria-hidden",
    ],
    svg: [
      ...(defaultSchema.attributes?.svg ?? []),
      "className",
      "height",
      "role",
      "style",
      "viewBox",
      "width",
      "xmlns",
    ],
    path: [...(defaultSchema.attributes?.path ?? []), "d", "fill", "stroke"],
    g: [...(defaultSchema.attributes?.g ?? []), "fill", "stroke", "transform"],
    line: [
      ...(defaultSchema.attributes?.line ?? []),
      "stroke",
      "strokeWidth",
      "x1",
      "x2",
      "y1",
      "y2",
    ],
    rect: [
      ...(defaultSchema.attributes?.rect ?? []),
      "fill",
      "height",
      "rx",
      "ry",
      "stroke",
      "width",
      "x",
      "y",
    ],
    td: [...(defaultSchema.attributes?.td ?? []), "align"],
    th: [...(defaultSchema.attributes?.th ?? []), "align"],
  },
};

const markdownRemarkPlugins: ReactMarkdownOptions["remarkPlugins"] = [
  remarkGfm,
  remarkViewerHeadingIds,
  [remarkToc, { heading: "contents|table[ -]of[ -]contents|toc", tight: true }],
  remarkBreaks,
  remarkMath,
  remarkMathCodeBlocks,
  remarkGitHubAlerts,
];

const markdownRehypePlugins: ReactMarkdownOptions["rehypePlugins"] = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
];

const alerts = {
  note: { label: "Note", icon: InfoIcon },
  tip: { label: "Tip", icon: CircleCheckIcon },
  important: { label: "Important", icon: InfoIcon },
  warning: { label: "Warning", icon: TriangleAlertIcon },
  caution: { label: "Caution", icon: TriangleAlertIcon },
} satisfies Record<string, { label: string; icon: LucideIcon }>;

const alertVariants = cva("", {
  variants: {
    element: {
      surface:
        "not-prose my-5 rounded-lg border px-4 py-3 text-foreground text-sm ring-1 ring-border [&_p+p]:mt-2 [&_p]:my-0",
      title: "mb-2 flex items-start gap-2 font-semibold",
    },
    variant: {
      note: "",
      tip: "",
      important: "",
      warning: "",
      caution: "",
    },
  },
  compoundVariants: [
    {
      element: "surface",
      variant: "note",
      class: "border-primary/30 bg-primary/5",
    },
    {
      element: "surface",
      variant: "tip",
      class: "border-primary/30 bg-primary/5",
    },
    {
      element: "surface",
      variant: "important",
      class: "border-primary/30 bg-primary/5",
    },
    {
      element: "surface",
      variant: "warning",
      class: "border-border/35 bg-muted/10",
    },
    {
      element: "surface",
      variant: "caution",
      class: "border-destructive/30 bg-destructive/5",
    },
    {
      element: "title",
      variant: "note",
      class: "text-primary",
    },
    {
      element: "title",
      variant: "tip",
      class: "text-primary",
    },
    {
      element: "title",
      variant: "important",
      class: "text-primary",
    },
    {
      element: "title",
      variant: "warning",
      class: "text-foreground",
    },
    {
      element: "title",
      variant: "caution",
      class: "text-destructive",
    },
  ],
  defaultVariants: {
    variant: "note",
  },
});

export type MarkdownViewerLabels = {
  empty: string;
  note: string;
  tip: string;
  important: string;
  warning: string;
  caution: string;
  code?: Partial<CodeViewerLabels>;
};
export interface MarkdownViewerProps {
  content: string;
  theme?: "light" | "dark";
  className?: string;
  glass?: boolean;
  labels?: Partial<MarkdownViewerLabels>;
}

const MarkdownContext = createContext<{
  headingPrefix: string;
  theme: "light" | "dark";
  labels?: Partial<MarkdownViewerLabels>;
}>({ headingPrefix: "", theme: "light" });

function createHeadingId(
  headingPrefix: string,
  level: number,
  children: unknown,
  offset?: number,
) {
  const baseId = `${headingPrefix}-h${level}-${slugify(getNodeText(children))}`;
  return offset === undefined ? baseId : `${baseId}-${offset}`;
}

export function MarkdownViewer({
  content,
  theme,
  className,
  glass,
  labels,
}: Readonly<MarkdownViewerProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassEnabled = useGlassEnabled(glass);
  const headingPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { resolvedTheme: appTheme } = useViewerTheme(rootRef);
  const resolvedTheme = theme ?? appTheme;

  if (!content.trim()) {
    return (
      <div className={cn("text-muted-foreground text-sm", className)}>
        {labels?.empty ?? "No markdown content"}
      </div>
    );
  }

  return (
    <MarkdownContext value={{ headingPrefix, theme: resolvedTheme, labels }}>
      <GlassSurface
        ref={rootRef}
        glass={glassEnabled}
        data-slot="markdown-viewer"
        className={cn(
          "max-w-none text-foreground text-sm",
          resolvedTheme === "dark" && "dark",
          "[&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item]:my-1 [&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:gap-2 [&_.task-list-item_input]:mt-1",
          "[&_.footnotes]:mt-10 [&_.footnotes]:border-t [&_.footnotes]:pt-4 [&_.footnotes]:text-sm",
          "[&_.math-display]:my-4 [&_.math-display]:overflow-x-auto [&_.math-inline_svg]:inline-block",
          className,
        )}
      >
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={[
            ...(markdownRehypePlugins ?? []),
            [rehypeViewerAnchors, { prefix: headingPrefix }],
          ]}
          remarkRehypeOptions={{ clobberPrefix: `${headingPrefix}-` }}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </GlassSurface>
    </MarkdownContext>
  );
}

function remarkMathCodeBlocks() {
  return (tree: MarkdownNode) => {
    walkMarkdownNode(tree, (node) => {
      if (node.type !== "code" || node.lang !== "math") return;
      node.type = "math";
      node.lang = undefined;
    });
  };
}

function remarkGitHubAlerts() {
  return (tree: MarkdownNode) => {
    walkMarkdownNode(tree, (node) => {
      if (node.type !== "blockquote") return;

      const firstParagraph = node.children?.[0];
      const firstText = firstParagraph?.children?.[0];
      if (
        firstParagraph?.type !== "paragraph" ||
        firstText?.type !== "text" ||
        !firstText.value
      ) {
        return;
      }

      const match = firstText.value.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*\n?/i,
      );
      if (!match) return;

      const type = match[1].toLowerCase() as keyof typeof alerts;
      if (!(type in alerts)) return;

      firstText.value = firstText.value
        .slice(match[0].length)
        .replace(/^\s+/, "");
      while (
        firstParagraph.children?.[0] &&
        isEmptyAlertLeadNode(firstParagraph.children[0])
      ) {
        firstParagraph.children.shift();
      }
      if (firstParagraph.children?.length === 0) {
        node.children?.shift();
      }
      node.data = {
        hName: "div",
        hProperties: {
          className: `markdown-alert markdown-alert-${type}`,
          dataAlert: type,
        },
      };
      node.children?.unshift({
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: {
            className: `markdown-alert-title markdown-alert-title-${type}`,
          },
        },
        children: [{ type: "text", value: alerts[type].label }],
      });
    });
  };
}

function isEmptyAlertLeadNode(node: MarkdownNode) {
  return (
    (node.type === "text" && (node.value ?? "").trim().length === 0) ||
    node.type === "break"
  );
}

function walkMarkdownNode(
  node: MarkdownNode,
  visitor: (node: MarkdownNode) => void,
) {
  visitor(node);
  if (!node.children) return;
  for (const child of node.children) {
    walkMarkdownNode(child, visitor);
  }
}

function withoutMarkdownNode<TProps extends { node?: unknown }>(props: TProps) {
  const { node: _node, ...elementProps } = props;
  return elementProps;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-");
  return slug || "section";
}

function getNodeText(children: unknown): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(getNodeText).join("");
  if (isValidElement<{ children?: unknown }>(children))
    return getNodeText(children.props.children);
  return "";
}

const MarkdownDiv = (
  props: ComponentProps<"div"> & {
    node?: unknown;
    labels?: Partial<MarkdownViewerLabels>;
  },
) => {
  const { className, children, labels, ...elementProps } =
    withoutMarkdownNode(props);
  const classNames = String(className ?? "");

  if (!classNames.includes("markdown-alert")) {
    return (
      <div className={className} {...elementProps}>
        {children}
      </div>
    );
  }

  const alertType =
    (Object.keys(alerts) as Array<keyof typeof alerts>).find(
      (type) =>
        classNames.includes(`markdown-alert-${type}`) ||
        classNames.includes(`markdown-alert-title-${type}`),
    ) ?? "note";

  if (classNames.includes("markdown-alert-title")) {
    const Icon = alerts[alertType].icon;

    return (
      <div
        className={alertVariants({ element: "title", variant: alertType })}
        {...elementProps}
      >
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{labels?.[alertType] ?? children}</span>
      </div>
    );
  }

  return (
    <div
      className={alertVariants({ element: "surface", variant: alertType })}
      {...elementProps}
    >
      {children}
    </div>
  );
};

const markdownBlockElements: Pick<
  Components,
  "blockquote" | "details" | "hr" | "img" | "li" | "ol" | "p" | "summary" | "ul"
> = {
  blockquote: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <blockquote
        className={cn(
          "my-6 border-primary/60 border-l-2 pl-5 text-muted-foreground italic [&>p]:my-0",
          className,
        )}
        {...elementProps}
      />
    );
  },
  details: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <details
        className={cn(
          "my-5 rounded-lg border bg-muted/25 px-4 py-3",
          className,
        )}
        {...elementProps}
      />
    );
  },
  hr: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <hr className={cn("my-8 border-border", className)} {...elementProps} />
    );
  },
  img: (props) => {
    const { className, alt, ...elementProps } = withoutMarkdownNode(props);
    return (
      <img
        className={cn("my-6 max-w-full rounded-lg border shadow-sm", className)}
        alt={alt ?? ""}
        {...elementProps}
      />
    );
  },
  li: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return <li className={cn("mt-2 pl-1", className)} {...elementProps} />;
  },
  ol: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <ol
        className={cn("my-5 ml-6 list-decimal space-y-1", className)}
        {...elementProps}
      />
    );
  },
  p: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <p
        className={cn("my-5 leading-7 first:mt-0 last:mb-0", className)}
        {...elementProps}
      />
    );
  },
  summary: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <summary
        className={cn("cursor-pointer font-medium text-foreground", className)}
        {...elementProps}
      />
    );
  },
  ul: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <ul
        className={cn("my-5 ml-6 list-disc space-y-1", className)}
        {...elementProps}
      />
    );
  },
};

function markdownNodeText(node: MarkdownNode): string {
  return node.value ?? node.children?.map(markdownNodeText).join("") ?? "";
}
function remarkViewerHeadingIds() {
  return (tree: MarkdownNode) => {
    const used = new Map<string, number>();
    walkMarkdownNode(tree, (node) => {
      if (node.type !== "heading") return;
      const slug = slugify(markdownNodeText(node));
      const occurrence = used.get(slug) ?? 0;
      used.set(slug, occurrence + 1);
      node.data = {
        ...node.data,
        hProperties: {
          ...((node.data?.hProperties as object) ?? {}),
          id: occurrence ? `${slug}-${occurrence}` : slug,
        },
      };
    });
  };
}
function rehypeViewerAnchors({ prefix }: { prefix: string }) {
  return (tree: MarkdownNode) => {
    const ids = new Map<string, string>();
    const used = new Set<string>();
    walkMarkdownNode(tree, (node) => {
      const props = node.properties;
      if (!props) return;
      for (const property of ["id", "name"])
        if (typeof props[property] === "string") {
          const previous = props[property];
          let next = `${prefix}-${previous}`;
          let duplicate = 1;
          while (used.has(next)) next = `${prefix}-${previous}-${duplicate++}`;
          used.add(next);
          props[property] = next;
          if (!ids.has(previous)) ids.set(previous, next);
          const original = previous.replace(/^(user-content-)+/, "");
          if (!ids.has(original)) ids.set(original, next);
        }
    });
    walkMarkdownNode(tree, (node) => {
      const props = node.properties;
      if (!props) return;
      if (typeof props.href === "string" && props.href.startsWith("#")) {
        const target = ids.get(props.href.slice(1));
        if (target) props.href = `#${target}`;
      }
      for (const property of ["ariaDescribedBy", "ariaLabelledBy"]) {
        const value = props[property];
        if (Array.isArray(value))
          props[property] = value.map((id) =>
            typeof id === "string" ? (ids.get(id) ?? id) : id,
          );
        else if (typeof value === "string")
          props[property] = value
            .split(/\s+/)
            .map((id) => ids.get(id) ?? id)
            .join(" ");
      }
    });
  };
}

const markdownComponents: Components = {
  div: function MarkdownDivRenderer(props) {
    const { labels } = useContext(MarkdownContext);
    return <MarkdownDiv {...props} labels={labels} />;
  },
  ...markdownBlockElements,
  a: (props) => {
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <a
        className={cn(
          "font-medium text-primary underline underline-offset-4 hover:text-primary/80",
          className,
        )}
        {...elementProps}
        rel={
          typeof elementProps.href === "string" &&
          elementProps.href.startsWith("#")
            ? undefined
            : "noopener noreferrer"
        }
        target={
          typeof elementProps.href === "string" &&
          elementProps.href.startsWith("#")
            ? undefined
            : "_blank"
        }
      >
        {children}
      </a>
    );
  },
  code: (props) => {
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <code
        className={cn(
          "rounded-md border bg-muted px-1.5 py-0.5 font-medium font-mono text-[0.875em] text-foreground",
          className,
        )}
        {...elementProps}
      >
        {children}
      </code>
    );
  },
  pre: function MarkdownCodeRenderer({ children, node }) {
    const { theme: resolvedTheme, labels } = useContext(MarkdownContext);
    const codeNode = node?.children.find(
      (child) => child.type === "element" && child.tagName === "code",
    );
    const classes =
      codeNode?.type === "element" ? codeNode.properties.className : undefined;
    let className = "";
    if (Array.isArray(classes)) className = classes.join(" ");
    else if (typeof classes === "string") className = classes;
    const lang = /language-([\w-]+)/.exec(className)?.[1] ?? "text";
    return (
      <CodeViewer
        code={getNodeText(children).replace(/\n$/, "")}
        lang={lang}
        theme={resolvedTheme}
        labels={labels?.code}
        className="not-prose my-5 shadow-sm"
        title={lang}
      />
    );
  },
  h1: function MarkdownHeading1(props) {
    const { headingPrefix } = useContext(MarkdownContext);
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <h1
        id={createHeadingId(
          headingPrefix,
          1,
          children,
          props.node?.position?.start?.offset,
        )}
        className={cn(
          "mb-6 scroll-m-20 font-semibold text-2xl first:mt-0 last:mb-0",
          className,
        )}
        {...elementProps}
      >
        {children}
      </h1>
    );
  },
  h2: function MarkdownHeading2(props) {
    const { headingPrefix } = useContext(MarkdownContext);
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <h2
        id={createHeadingId(
          headingPrefix,
          2,
          children,
          props.node?.position?.start?.offset,
        )}
        className={cn(
          "mt-10 mb-4 scroll-m-20 border-b pb-2 font-semibold text-xl first:mt-0 last:mb-0",
          className,
        )}
        {...elementProps}
      >
        {children}
      </h2>
    );
  },
  h3: function MarkdownHeading3(props) {
    const { headingPrefix } = useContext(MarkdownContext);
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <h3
        id={createHeadingId(
          headingPrefix,
          3,
          children,
          props.node?.position?.start?.offset,
        )}
        className={cn(
          "mt-8 mb-3 scroll-m-20 font-semibold text-xl first:mt-0 last:mb-0",
          className,
        )}
        {...elementProps}
      >
        {children}
      </h3>
    );
  },
  h4: function MarkdownHeading4(props) {
    const { headingPrefix } = useContext(MarkdownContext);
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <h4
        id={createHeadingId(
          headingPrefix,
          4,
          children,
          props.node?.position?.start?.offset,
        )}
        className={cn(
          "mt-6 mb-2 scroll-m-20 font-semibold text-lg first:mt-0 last:mb-0",
          className,
        )}
        {...elementProps}
      >
        {children}
      </h4>
    );
  },
  h5: function MarkdownHeading5(props) {
    const { headingPrefix } = useContext(MarkdownContext);
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <h5
        id={createHeadingId(
          headingPrefix,
          5,
          children,
          props.node?.position?.start?.offset,
        )}
        className={cn(
          "mt-5 mb-2 font-semibold text-sm first:mt-0 last:mb-0",
          className,
        )}
        {...elementProps}
      >
        {children}
      </h5>
    );
  },
  h6: function MarkdownHeading6(props) {
    const { headingPrefix } = useContext(MarkdownContext);
    const { className, children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <h6
        id={createHeadingId(
          headingPrefix,
          6,
          children,
          props.node?.position?.start?.offset,
        )}
        className={cn(
          "mt-5 mb-2 font-semibold text-muted-foreground text-sm first:mt-0 last:mb-0",
          className,
        )}
        {...elementProps}
      >
        {children}
      </h6>
    );
  },
  kbd: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <kbd
        className={cn(
          "rounded border bg-muted px-1.5 py-0.5 font-medium font-mono text-[0.8em] text-muted-foreground",
          className,
        )}
        {...elementProps}
      />
    );
  },
  strong: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <strong
        className={cn("font-semibold text-foreground", className)}
        {...elementProps}
      />
    );
  },
  sup: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <sup
        className={cn("[&>a]:text-sm [&>a]:no-underline", className)}
        {...elementProps}
      />
    );
  },
  table: (props) => {
    const { children, ...elementProps } = withoutMarkdownNode(props);
    return (
      <div
        className={
          "not-prose my-6 w-full overflow-x-auto rounded-lg border border-border shadow-sm"
        }
      >
        <table
          className="w-full min-w-full border-separate border-spacing-0 text-sm"
          {...elementProps}
        >
          {children}
        </table>
      </div>
    );
  },
  tbody: (props) => {
    const { className, ...elementProps } = withoutMarkdownNode(props);
    return (
      <tbody
        className={cn("[&_tr:last-child>*]:border-b-0", className)}
        {...elementProps}
      />
    );
  },
  td: (props) => {
    const { className, align, ...elementProps } = withoutMarkdownNode(props);

    return (
      <td
        align={align}
        className={cn(
          "border-border border-r border-b px-4 py-2.5 align-top last:border-r-0",
          getMarkdownTableAlignClass(align),
          className,
        )}
        {...elementProps}
      />
    );
  },
  th: (props) => {
    const { className, align, ...elementProps } = withoutMarkdownNode(props);

    return (
      <th
        align={align}
        className={cn(
          "border-border border-r border-b bg-muted px-4 py-2.5 align-top font-semibold last:border-r-0",
          getMarkdownTableAlignClass(align),
          className,
        )}
        {...elementProps}
      />
    );
  },
};
