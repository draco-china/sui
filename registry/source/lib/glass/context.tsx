"use client";

import {
  type ComponentType,
  type CSSProperties,
  createContext,
  useContext,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  type GlassEdge,
  type GlassMaterial,
  glassDefaultMaterial,
} from "@/lib/glass/defaults";
import { acquireGlass, updateGlassConfiguration } from "@/lib/glass/runtime";

export type { GlassEdge, GlassMaterial } from "@/lib/glass/defaults";

export type GlassOptions = {
  strength?: number;
  tint?: string;
  tintOpacity?: number;
};

/** Native SVG refraction, falling back to the CSS material where unsupported. */
export type GlassConfig = {
  material?: GlassMaterial;
  /** Edge light from the top-left and bottom-right corners, or from the top and bottom. */
  edge?: GlassEdge;
  options?: GlassOptions;
};

export type GlassConfiguration = GlassConfig & { id: string };

type GlassContextValue = {
  configuration?: GlassConfig;
  enabled: boolean;
  surface: boolean;
  /** Inside a content-layer component: its own controls stay ordinary. */
  content?: boolean;
};

/**
 * Floating layers use the legible Regular material lit from the top and
 * bottom, as on iOS, whatever their surroundings use. A layer's own
 * glassConfig still chooses otherwise.
 */
const popupConfiguration = {
  material: "regular",
  edge: "vertical",
} as const satisfies GlassConfig;

export const GlassContext = createContext<GlassContextValue>({
  enabled: false,
  surface: false,
});

export type GlassProps = { glass?: boolean; glassConfig?: GlassConfig };

/**
 * - surface: a glass layer; inside another glass surface it shares that one.
 * - control: like a surface, for interactive controls.
 * - field: a form field that is glass on its own, like an iOS search field,
 *   but stays an ordinary field with its focus ring inside a glass surface.
 * - scope: passes the setting on without becoming glass itself.
 * - portal: a floating layer that is always its own glass surface.
 */
export function withGlass<P extends object>(
  Component: ComponentType<P>,
  kind: "surface" | "control" | "field" | "scope" | "portal" = "surface",
  overrides?: Pick<GlassConfig, "material">,
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
        ...(kind === "portal" ? popupConfiguration : undefined),
        ...glassConfig,
        ...overrides,
        options: {
          ...context.configuration?.options,
          ...glassConfig?.options,
        },
      };
    }, [context.configuration, glassConfig]);
    const initialConfiguration = useEffectEvent(() => configuration);
    const surface = enabled && kind !== "scope";
    useLayoutEffect(() => {
      if (!surface) return;
      setMounted(true);
      return acquireGlass({ ...initialConfiguration(), id });
    }, [surface, id]);
    useLayoutEffect(() => {
      if (surface && configuration)
        updateGlassConfiguration({ ...configuration, id });
    }, [surface, configuration, id]);
    const part =
      glass === undefined &&
      context.enabled &&
      context.surface &&
      !context.content &&
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
          // A real glass layer starts its own controls; scopes pass content on,
          // and an ordinary field keeps its own buttons ordinary.
          content: !surface && (kind === "field" || Boolean(context.content)),
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
                "data-glass-material":
                  configuration?.material ?? glassDefaultMaterial,
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

/**
 * Content-layer components and their own controls stay ordinary inside an
 * enabled glass scope, while floating layers they open (menus, popovers,
 * tooltips) still follow it. Explicit `glass` on a child still wins.
 */
export function withoutGlass<P extends object>(Component: ComponentType<P>) {
  function PlainComponent(props: P) {
    const context = useContext(GlassContext);
    const value = useMemo(
      () => ({ ...context, surface: true, content: true }),
      [context],
    );
    return (
      <GlassContext.Provider value={value}>
        <Component {...props} />
      </GlassContext.Provider>
    );
  }
  PlainComponent.displayName = Component.displayName ?? Component.name;
  return PlainComponent;
}

export function useGlassEnabled(glass?: boolean) {
  const context = useContext(GlassContext);
  return glass ?? (context.enabled && !context.surface);
}
