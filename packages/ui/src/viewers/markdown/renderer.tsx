"use client";

import { cn } from "cn";
import { useId, useMemo, useRef } from "react";
import ReactMarkdown, {
  type Components,
  type Options as ReactMarkdownOptions,
} from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { ImageGroup } from "../../components/image";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { MarkdownContext, markdownComponents } from "./components";
import type { MarkdownViewerLabels } from "./labels";
import {
  closeOpenFence,
  markdownRemarkPlugins,
  rehypeViewerAnchors,
  sanitizeSchema,
} from "./plugins";

type PluginList = NonNullable<ReactMarkdownOptions["remarkPlugins"]>;

export interface MarkdownViewerProps {
  content: string;
  theme?: "light" | "dark";
  className?: string;
  labels?: Partial<MarkdownViewerLabels>;
  /** `streaming` tolerates an unfinished last block and marks it as writing. */
  status?: "streaming" | "complete";
  /** Added after the built-in remark plugins. */
  remarkPlugins?: PluginList;
  /**
   * Added after raw HTML parsing and before sanitizing, which always runs
   * last. Extend output through `components` rather than new attributes.
   */
  rehypePlugins?: PluginList;
  /** Element renderers merged over the built-in ones, e.g. `img` or `a`. */
  components?: Components;
}

const NO_PLUGINS: PluginList = [];

export function MarkdownViewer({
  content,
  theme,
  className,
  labels,
  status,
  remarkPlugins = NO_PLUGINS,
  rehypePlugins = NO_PLUGINS,
  components,
}: Readonly<MarkdownViewerProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { resolvedTheme: appTheme } = useColorScheme(rootRef);
  const resolvedTheme = theme ?? appTheme;

  const streaming = status === "streaming";
  const source = streaming ? closeOpenFence(content) : content;
  const streamingEnd = streaming ? source.trimEnd().length : undefined;
  const elements = useMemo(
    () => ({ ...markdownComponents, ...components }),
    [components],
  );

  if (!content.trim()) {
    return (
      <div className={cn("text-muted-foreground text-sm", className)}>
        {labels?.empty ?? "No markdown content"}
      </div>
    );
  }

  return (
    <MarkdownContext
      value={{ headingPrefix, theme: resolvedTheme, labels, streamingEnd }}
    >
      <div
        ref={rootRef}
        data-slot="markdown-viewer"
        className={cn(
          "max-w-none text-foreground text-sm",
          // Only an explicit override owns a local theme boundary. Mirroring
          // the inherited theme here would make the observer read its own output.
          theme === "dark" && "dark",
          "[&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item]:my-1 [&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:gap-2 [&_.task-list-item_input]:mt-1",
          "[&_.footnotes]:mt-10 [&_.footnotes]:border-t [&_.footnotes]:pt-4 [&_.footnotes]:text-sm",
          className,
        )}
      >
        <ImageGroup labels={labels?.image}>
          <ReactMarkdown
            remarkPlugins={[...(markdownRemarkPlugins ?? []), ...remarkPlugins]}
            rehypePlugins={[
              rehypeRaw,
              ...rehypePlugins,
              [rehypeSanitize, sanitizeSchema],
              [rehypeViewerAnchors, { prefix: headingPrefix }],
            ]}
            remarkRehypeOptions={{ clobberPrefix: `${headingPrefix}-` }}
            components={elements}
          >
            {source}
          </ReactMarkdown>
        </ImageGroup>
      </div>
    </MarkdownContext>
  );
}
