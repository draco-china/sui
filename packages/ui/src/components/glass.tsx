import type { ComponentProps, ReactNode } from "react";
import { useId, useImperativeHandle, useMemo } from "react";
import {
  type GlassCaptureTarget,
  GlassContext,
  type GlassMaterial,
  type GlassMode,
  type GlassOptions,
  type GlassProviderRef,
  withGlass,
} from "../lib/glass/context";
import { refreshGlass } from "../lib/glass/runtime";

export type {
  GlassCaptureTarget,
  GlassHandle,
  GlassMaterial,
  GlassMode,
  GlassOptions,
} from "../lib/glass/context";

export type GlassProviderProps = {
  children: ReactNode;
  options?: GlassOptions;
  mode?: GlassMode;
  material?: GlassMaterial;
  captureTarget?: GlassCaptureTarget;
  ref?: GlassProviderRef;
};

export function GlassProvider({
  children,
  options,
  mode = "css",
  material = "frosted",
  captureTarget,
  ref,
}: GlassProviderProps) {
  const id = useId();
  const { strength, blur, tint, tintOpacity, highlight } = options ?? {};
  const configuration = useMemo(
    () => ({
      id,
      mode,
      material,
      options: { strength, blur, tint, tintOpacity, highlight },
      captureTarget,
    }),
    [
      id,
      mode,
      material,
      strength,
      blur,
      tint,
      tintOpacity,
      highlight,
      captureTarget,
    ],
  );
  useImperativeHandle(
    ref,
    () => ({
      refresh: () => {
        refreshGlass(id);
      },
    }),
    [id],
  );
  return (
    <GlassContext.Provider
      value={{ configuration, material, enabled: false, surface: false }}
    >
      {children}
    </GlassContext.Provider>
  );
}

function Surface(props: ComponentProps<"div">) {
  return <div data-slot="glass-surface" {...props} />;
}

const DecoratedSurface = withGlass(Surface);

export function GlassSurface({
  glass = true,
  material,
  ...props
}: Omit<ComponentProps<typeof DecoratedSurface>, "glassMaterial"> & {
  material?: GlassMaterial;
}) {
  return <DecoratedSurface glass={glass} glassMaterial={material} {...props} />;
}
