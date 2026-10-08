import {
  type ComponentType,
  type CSSProperties,
  createContext,
  type Ref,
  type RefObject,
  useContext,
  useLayoutEffect,
} from "react";
import { type GlassIntensity, glassIntensityDefaults } from "./intensity";
import { acquireGlass, updateGlassConfiguration } from "./runtime";

export type { GlassIntensity } from "./intensity";

export type GlassMode = "css" | "auto";

export type GlassOptions = {
  strength?: number;
  blur?: number;
  tint?: string;
  tintOpacity?: number;
  highlight?: number;
};

export type GlassHandle = { refresh: () => void };
export type GlassCaptureTarget =
  | HTMLElement
  | null
  | RefObject<HTMLElement | null>;

export type GlassConfiguration = {
  id: string;
  mode?: GlassMode;
  intensity?: GlassIntensity;
  options?: GlassOptions;
  captureTarget?: GlassCaptureTarget;
};

type GlassContextValue = {
  configuration?: GlassConfiguration;
  intensity?: GlassIntensity;
  enabled: boolean;
  surface: boolean;
};

export const GlassContext = createContext<GlassContextValue>({
  enabled: false,
  surface: false,
});

export type GlassProps = { glass?: boolean; glassIntensity?: GlassIntensity };

export function withGlass<P extends object>(
  Component: ComponentType<P>,
  kind: "surface" | "control" | "scope" | "portal" = "surface",
) {
  function GlassComponent({ glass, glassIntensity, ...props }: P & GlassProps) {
    const context = useContext(GlassContext);
    const enabled =
      glass ?? (context.enabled && (kind !== "surface" || !context.surface));
    const configuration = context.configuration;
    const id = configuration?.id ?? "default";
    const intensity =
      glassIntensity ??
      context.intensity ??
      configuration?.intensity ??
      "default";
    useLayoutEffect(() => {
      if (!enabled) return;
      return acquireGlass({ id });
    }, [enabled, id]);
    useLayoutEffect(() => {
      if (enabled && configuration) updateGlassConfiguration(configuration);
    }, [enabled, configuration]);
    const surface = enabled && kind !== "scope";
    let childSurface = context.surface || surface;
    if (kind === "scope") childSurface = glass !== true && context.surface;
    const options = configuration?.options;
    const originalStyle = (
      props as {
        style?: CSSProperties | ((state: unknown) => CSSProperties | undefined);
      }
    ).style;
    const defaults = glassIntensityDefaults(intensity);
    const materialStyle = {
      "--glass-initial-blur": `${defaults.blur}px`,
      "--glass-initial-opacity": `${defaults.tintOpacity * 100}%`,
    } as CSSProperties & Record<string, unknown>;
    if (options?.tint) materialStyle["--glass-base"] = options.tint;
    if (Number.isFinite(options?.blur))
      materialStyle["--glass-blur"] =
        `${Math.min(24, Math.max(0, options?.blur ?? 0))}px`;
    if (Number.isFinite(options?.tintOpacity))
      materialStyle["--glass-opacity"] =
        `${Math.min(1, Math.max(0, options?.tintOpacity ?? 0)) * 100}%`;
    if (options?.highlight === 0) {
      materialStyle["--glass-edge"] = "none";
      materialStyle["--glass-initial-edge-shadow"] = "0 0 #0000";
    }
    const initialStyle =
      typeof originalStyle === "function"
        ? (state: unknown) => ({ ...originalStyle(state), ...materialStyle })
        : { ...originalStyle, ...materialStyle };
    return (
      <GlassContext.Provider
        value={{
          configuration,
          intensity,
          enabled,
          surface: childSurface,
        }}
      >
        <Component
          {...(props as P)}
          {...(surface
            ? {
                style: initialStyle,
                "data-glass": "true",
                "data-glass-scope": configuration?.id ?? "default",
                "data-glass-intensity": intensity,
                "data-glass-state": "loading",
              }
            : {})}
        />
      </GlassContext.Provider>
    );
  }
  GlassComponent.displayName = `Glass(${Component.displayName ?? Component.name})`;
  return GlassComponent;
}

export type GlassProviderRef = Ref<GlassHandle>;

export function useGlassEnabled(glass?: boolean) {
  const context = useContext(GlassContext);
  return glass ?? (context.enabled && !context.surface);
}
