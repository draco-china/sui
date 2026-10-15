"use client";

import {
  type ComponentType,
  type CSSProperties,
  createContext,
  type RefObject,
  useContext,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { GlassMaterial } from "./defaults";
import { acquireGlass, updateGlassConfiguration } from "./runtime";

export type { GlassMaterial } from "./defaults";

export type GlassMode = "css" | "svg" | "auto";

export type GlassOptions = {
  strength?: number;
  tint?: string;
  tintOpacity?: number;
  highlight?: number;
};

export type GlassCaptureTarget =
  | HTMLElement
  | null
  | RefObject<HTMLElement | null>;

export type GlassConfig = {
  mode?: GlassMode;
  material?: GlassMaterial;
  options?: GlassOptions;
  captureTarget?: GlassCaptureTarget;
};

export type GlassConfiguration = GlassConfig & { id: string };

type GlassContextValue = {
  configuration?: GlassConfig;
  enabled: boolean;
  surface: boolean;
};

export const GlassContext = createContext<GlassContextValue>({
  enabled: false,
  surface: false,
});

export type GlassProps = { glass?: boolean; glassConfig?: GlassConfig };

export function withGlass<P extends object>(
  Component: ComponentType<P>,
  kind: "surface" | "control" | "scope" | "portal" = "surface",
  overrides?: Pick<GlassConfig, "mode" | "material">,
) {
  function GlassComponent({ glass, glassConfig, ...props }: P & GlassProps) {
    const context = useContext(GlassContext);
    const id = useId();
    const [mounted, setMounted] = useState(false);
    const enabled =
      glass ??
      (context.enabled &&
        (kind === "scope" || kind === "portal" || !context.surface));
    const configuration = useMemo(() => {
      return {
        ...context.configuration,
        ...glassConfig,
        ...overrides,
        options: {
          ...context.configuration?.options,
          ...glassConfig?.options,
        },
      };
    }, [context.configuration, glassConfig]);
    const initialConfiguration = useEffectEvent(() => configuration);
    const mode = configuration?.mode;
    const surface = enabled && kind !== "scope";
    useLayoutEffect(() => {
      if (!surface) return;
      setMounted(true);
      return acquireGlass({ ...initialConfiguration(), id, mode });
    }, [surface, id, mode]);
    useLayoutEffect(() => {
      if (surface && configuration)
        updateGlassConfiguration({ ...configuration, id, mode });
    }, [surface, configuration, id, mode]);
    const part =
      glass === undefined &&
      context.enabled &&
      context.surface &&
      (kind === "surface" || kind === "control");
    let childSurface = context.surface || surface;
    if (kind === "scope") childSurface = glass !== true && context.surface;
    const options = configuration?.options;
    const originalStyle = (
      props as {
        style?: CSSProperties | ((state: unknown) => CSSProperties | undefined);
      }
    ).style;
    const materialStyle = {} as CSSProperties & Record<string, unknown>;
    if (options?.tint) materialStyle["--glass-base"] = options.tint;
    if (Number.isFinite(options?.tintOpacity))
      materialStyle["--glass-opacity"] =
        `${Math.min(1, Math.max(0, options?.tintOpacity ?? 0)) * 100}%`;
    if (options?.highlight === 0) {
      materialStyle["--glass-edge"] = "none";
      materialStyle["--glass-initial-edge-shadow"] = "0 0 #0000";
    }
    let initialStyle = originalStyle;
    if (Object.keys(materialStyle).length) {
      if (typeof originalStyle === "function")
        initialStyle = (state: unknown) => ({
          ...originalStyle(state),
          ...materialStyle,
        });
      else initialStyle = { ...originalStyle, ...materialStyle };
    }
    return (
      <GlassContext.Provider
        value={{
          configuration,
          enabled: enabled || (glass === undefined && context.enabled),
          surface: childSurface,
        }}
      >
        <Component
          {...(props as P)}
          {...(part ? { "data-glass-part": kind } : {})}
          {...(surface
            ? {
                style: initialStyle,
                "data-glass": "true",
                "data-glass-scope": id,
                "data-glass-material": configuration?.material ?? "clear",
                "data-glass-state": "loading",
                "data-glass-mounted": mounted,
              }
            : {})}
        />
      </GlassContext.Provider>
    );
  }
  GlassComponent.displayName = `Glass(${Component.displayName ?? Component.name})`;
  return GlassComponent;
}

export function useGlassEnabled(glass?: boolean) {
  const context = useContext(GlassContext);
  return glass ?? (context.enabled && !context.surface);
}
