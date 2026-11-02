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
} from "react";
import type { Components } from "react-markdown";
import { Image } from "../../components/image";
import { CodeViewer } from "../code-viewer";
import type { MarkdownViewerLabels } from "./labels";
import { type AlertType, alertTitles, slugify } from "./plugins";

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

const alertIcons = {
  note: InfoIcon,
  tip: CircleCheckIcon,
  important: InfoIcon,
  warning: TriangleAlertIcon,
  caution: TriangleAlertIcon,
} satisfies Record<AlertType, LucideIcon>;

const alertVariants = cva("", {
  variants: {
    element: {
      surface:
        "not-prose my-5 rounded-2xl border px-4 py-3 text-foreground text-sm [&_p+p]:mt-2 [&_p]:my-0",
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
      class: "text-accent-foreground",
    },
    {
      element: "title",
      variant: "tip",
      class: "text-accent-foreground",
    },
    {
      element: "title",
      variant: "important",
      class: "text-accent-foreground",
    },
    {
      element: "title",
      variant: "warning",
      class: "text-foreground",
    },
    {
      element: "title",
      variant: "caution",
      class: "text-destructive-foreground",
    },
  ],
  defaultVariants: {
    variant: "note",
  },
});

export const MarkdownContext = createContext<{
  headingPrefix: string;
  theme: "light" | "dark";
  labels?: Partial<MarkdownViewerLabels>;
  /** While streaming, blocks that reach this offset are still being written. */
  streamingEnd?: number;
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

function withoutMarkdownNode<TProps extends { node?: unknown }>(props: TProps) {
  const { node: _node, ...elementProps } = props;
  return elementProps;
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
    (Object.keys(alertTitles) as AlertType[]).find(
      (type) =>
        classNames.includes(`markdown-alert-${type}`) ||
        classNames.includes(`markdown-alert-title-${type}`),
    ) ?? "note";

  if (classNames.includes("markdown-alert-title")) {
    const Icon = alertIcons[alertType];

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
  img: function MarkdownImage(props) {
    const { labels } = useContext(MarkdownContext);
    const { className, alt, src, ...elementProps } = withoutMarkdownNode(props);
    const imageClass = cn(
      "my-6 max-w-full rounded-lg border shadow-sm",
      className,
    );
    if (typeof src !== "string" || !src)
      return <img className={imageClass} alt={alt ?? ""} {...elementProps} />;
    // Inside the viewer's ImageGroup, so every image in a document is one
    // gallery. Images keep their natural size, capped by the column.
    return (
      <Image
        src={src}
        alt={alt ?? ""}
        labels={labels?.image}
        className={cn(
          imageClass,
          "[&>img]:h-auto [&>img]:w-auto [&>img]:max-w-full",
        )}
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

export const markdownComponents: Components = {
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
          "font-medium text-accent-foreground underline underline-offset-4 hover:text-accent-foreground",
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
    const {
      theme: resolvedTheme,
      labels,
      streamingEnd,
    } = useContext(MarkdownContext);
    const end = node?.position?.end?.offset;
    const streaming =
      streamingEnd !== undefined && end !== undefined && end >= streamingEnd;
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
        language={lang}
        status={streaming ? "streaming" : undefined}
        theme={resolvedTheme}
        labels={labels?.code}
        className="not-prose my-5 shadow-sm"
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
          "not-prose my-6 w-full overflow-x-auto rounded-2xl border border-border shadow-sm"
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
