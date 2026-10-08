import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

export function DocumentationLink({
  href,
  prefetch = true,
  ...props
}: ComponentProps<"a"> & { prefetch?: boolean }) {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("/api/") ||
    href.startsWith("/r/") ||
    /^\/(?:(?:en-US|zh-CN)\/)?llms(?:-full)?\.txt(?:[?#]|$)/.test(href)
  ) {
    return <a href={href} {...props} />;
  }
  return <Link to={href} preload={prefetch ? "intent" : false} {...props} />;
}
