"use client";

import { cn } from "cn";
import type { ComponentProps } from "react";
import { withGlass } from "../lib/glass/context";

type HtmlViewerProps = Omit<ComponentProps<"iframe">, "srcDoc"> & {
  content: string;
  glass?: boolean;
  labels?: { preview?: string };
};
function HtmlViewerImplementation({
  content,
  sandbox = "allow-scripts",
  className,
  title,
  labels,
  glass: _glass,
  ...props
}: HtmlViewerProps) {
  return (
    <iframe
      {...props}
      data-slot="html-viewer"
      srcDoc={content}
      sandbox={sandbox}
      className={cn("size-full border-0 bg-background", className)}
      title={title ?? labels?.preview ?? "HTML preview"}
    />
  );
}

export type { HtmlViewerProps };

const HtmlViewer = withGlass(HtmlViewerImplementation);

export { HtmlViewer };
