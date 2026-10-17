"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps } from "react";
import { withGlass } from "@/lib/glass/with-glass";

export { type GlassTarget, refreshGlass } from "@/lib/glass/runtime";
export type {
  GlassConfig,
  GlassEdge,
  GlassProps,
} from "@/lib/glass/with-glass";

function Surface({ render, ref, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props,
    ref,
    render,
    state: { slot: "glass-surface" },
  });
}

const DecoratedSurface = withGlass(Surface);

/**
 * A glass panel, Clear unless `frosted` is set. Pass `render={<nav />}` (or
 * any element) to keep native semantics. Controls inside stay ordinary.
 */
export function GlassSurface({
  glass = true,
  frosted,
  ...props
}: ComponentProps<typeof DecoratedSurface>) {
  return (
    <DecoratedSurface
      glass={frosted ? false : glass}
      frosted={frosted}
      {...props}
    />
  );
}
