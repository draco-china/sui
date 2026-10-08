"use client";

import { useParams } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { CopyIcon } from "@workspace/ui/components/copy-icon";
import type { IconNode } from "@workspace/ui/components/morph-icon";
import { useClipboard } from "@workspace/ui/hooks/use-clipboard";
import { cn } from "cn";
import type { ComponentPropsWithoutRef } from "react";
import { getLocale } from "../lib/i18n";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingProps = ComponentPropsWithoutRef<"h1"> & { as?: HeadingTag };
const linkShape: IconNode = [
  [
    "path",
    {
      d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    },
  ],
];

function Heading({
  as: As = "h1",
  id,
  className,
  children,
  ...props
}: HeadingProps) {
  const { lang } = useParams({ strict: false });
  const { status, copy } = useClipboard(id ?? "");
  const labels =
    getLocale(lang) === "zh-CN"
      ? {
          idle: "复制标题链接",
          pending: "正在复制标题链接",
          copied: "标题链接已复制",
          error: "复制失败",
        }
      : {
          idle: "Copy heading link",
          pending: "Copying heading link",
          copied: "Heading link copied",
          error: "Copy failed",
        };
  if (!id)
    return (
      <As {...props} className={className}>
        {children}
      </As>
    );
  return (
    <As
      {...props}
      id={id}
      className={cn(
        "group/heading flex scroll-m-28 flex-row items-center gap-1",
        className,
      )}
    >
      <a data-card="" href={`#${id}`}>
        {children}
      </a>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="not-prose shrink-0 text-muted-foreground opacity-0 transition-opacity group-focus-within/heading:opacity-100 group-hover/heading:opacity-100"
        disabled={status === "pending"}
        aria-busy={status === "pending"}
        aria-label={labels[status]}
        onClick={() => {
          const url = new URL(window.location.href);
          url.hash = id;
          void copy(url.href);
        }}
      >
        <CopyIcon idleIcon={linkShape} status={status} className="size-3.5" />
        <span role="status" className="sr-only">
          {status === "copied" || status === "error" ? labels[status] : ""}
        </span>
      </Button>
    </As>
  );
}

export { Heading };
