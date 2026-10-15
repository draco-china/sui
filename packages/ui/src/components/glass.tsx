"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps } from "react";
import { withGlass, withoutGlass } from "../lib/glass/context";

export type {
  GlassConfig,
  GlassEdge,
  GlassMaterial,
  GlassOptions,
} from "../lib/glass/context";
export { type GlassTarget, refreshGlass } from "../lib/glass/runtime";

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
 * A glass panel. Pass `render={<nav />}` (or any element) to keep native
 * semantics; controls inside reuse its material unless they opt out.
 */
export function GlassSurface({
  glass = true,
  ...props
}: ComponentProps<typeof DecoratedSurface>) {
  return <DecoratedSurface glass={glass} {...props} />;
}

function Content({ render, ref, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props,
    ref,
    render,
    state: { slot: "glass-content" },
  });
}

/**
 * An ordinary content region inside a glass surface: its own controls keep
 * their native styling, while menus and popovers it opens still use glass.
 */
export const GlassContent = withoutGlass(Content);
