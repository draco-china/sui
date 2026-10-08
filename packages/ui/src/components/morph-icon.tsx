"use client";

import { cn } from "cn";
import { canonicalD, type Morph } from "morphicons/dom";
import type { IconInput, SpringPreset } from "morphicons/react";
import { MorphIcon as MorphIconPrimitive } from "morphicons/react";
import type { ComponentProps } from "react";

type MorphIconProps = ComponentProps<typeof MorphIconPrimitive>;

function MorphIcon({
  className,
  size = 16,
  strokeWidth = 2,
  spring = "snappy",
  reducedMotion = "user",
  ...props
}: MorphIconProps) {
  return (
    <MorphIconPrimitive
      size={size}
      strokeWidth={strokeWidth}
      spring={spring}
      reducedMotion={reducedMotion}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

export type {
  IconInput,
  IconNode,
  MorphHandle,
} from "morphicons/react";
export type { MorphIconProps };
export { MorphIcon };

function morphToCompletion(
  morph: Morph,
  path: SVGPathElement,
  icon: IconInput,
  spring: SpringPreset = "snappy",
) {
  let frame = 0;
  let settled = false;
  let finish: (completed: boolean) => void = () => {};
  const finished = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  const complete = (completed: boolean) => {
    if (settled) return;
    settled = true;
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", visibilityChanged);
    finish(completed);
  };
  const endpoint = canonicalD(icon);
  morph.morphTo(icon, spring);
  const check = () => {
    if (
      document.hidden ||
      (morph.reducedMotion === "user" &&
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches)
    )
      morph.set(icon);
    // progress can still be 1 before the first spring frame. The canonical
    // endpoint is only painted when the driver really settles or motion is off.
    if (morph.progress === 1 && path.getAttribute("d") === endpoint)
      complete(true);
    else frame = requestAnimationFrame(check);
  };
  const visibilityChanged = () => {
    if (document.hidden) {
      morph.set(icon);
      complete(true);
    }
  };
  document.addEventListener("visibilitychange", visibilityChanged);
  check();
  return { finished, cancel: () => complete(false) };
}

export { createMorph, type Morph } from "morphicons/dom";
export { morphToCompletion };
