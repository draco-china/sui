"use client";

import { cn } from "cn";
import type { ComponentProps } from "react";

type HtmlViewerProps = Omit<ComponentProps<"iframe">, "srcDoc"> & {
  content: string;
  labels?: { preview?: string };
};
function HtmlViewer({
  content,
  sandbox = "allow-scripts",
  className,
  title,
  labels,
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

export { HtmlViewer };
