"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId, useImperativeHandle, useLayoutEffect, useMemo } from "react";
import {
  type GlassCaptureTarget,
  GlassContext,
  type GlassIntensity,
  type GlassMode,
  type GlassOptions,
  type GlassProviderRef,
  withGlass,
} from "../lib/glass/context";
import {
  acquireGlass,
  refreshGlass,
  updateGlassConfiguration,
} from "../lib/glass/runtime";

export type {
  GlassCaptureTarget,
  GlassHandle,
  GlassIntensity,
  GlassMode,
  GlassOptions,
} from "../lib/glass/context";

export type GlassProviderProps = {
  children: ReactNode;
  options?: GlassOptions;
  mode?: GlassMode;
  intensity?: GlassIntensity;
  captureTarget?: GlassCaptureTarget;
  ref?: GlassProviderRef;
};

export function GlassProvider({
  children,
  options,
  mode = "auto",
  intensity = "default",
  captureTarget,
  ref,
}: GlassProviderProps) {
  const id = useId();
  const { strength, blur, tint, tintOpacity, highlight } = options ?? {};
  const configuration = useMemo(
    () => ({
      id,
      mode,
      intensity,
      options: { strength, blur, tint, tintOpacity, highlight },
      captureTarget,
    }),
    [
      id,
      mode,
      intensity,
      strength,
      blur,
      tint,
      tintOpacity,
      highlight,
      captureTarget,
    ],
  );
  useLayoutEffect(() => {
    if (mode === "css") return;
    return acquireGlass({ id, mode });
  }, [id, mode]);
  useLayoutEffect(
    () => updateGlassConfiguration(configuration),
    [configuration],
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
      value={{ configuration, intensity, enabled: false, surface: false }}
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
  intensity,
  ...props
}: Omit<ComponentProps<typeof DecoratedSurface>, "glassIntensity"> & {
  intensity?: GlassIntensity;
}) {
  return (
    <DecoratedSurface glass={glass} glassIntensity={intensity} {...props} />
  );
}
