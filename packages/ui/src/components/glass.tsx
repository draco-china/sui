"use client";

import type { ComponentProps } from "react";
import { withGlass } from "../lib/glass/context";

export type {
  GlassCaptureTarget,
  GlassConfig,
  GlassMaterial,
  GlassMode,
  GlassOptions,
} from "../lib/glass/context";
export { refreshGlassTarget as refreshGlass } from "../lib/glass/runtime";

function Surface(props: ComponentProps<"div">) {
  return <div data-slot="glass-surface" {...props} />;
}

const DecoratedSurface = withGlass(Surface);

export function GlassSurface({
  glass = true,
  ...props
}: ComponentProps<typeof DecoratedSurface>) {
  return <DecoratedSurface glass={glass} {...props} />;
}
