import {
  type ComponentType,
  type CSSProperties,
  createContext,
  type Ref,
  type RefObject,
  useContext,
  useLayoutEffect,
} from "react";
import { acquireGlass, updateGlassConfiguration } from "./runtime";

export type GlassMode = "css" | "auto";
export type GlassMaterial = "clear" | "frosted";

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
  material?: GlassMaterial;
  options?: GlassOptions;
  captureTarget?: GlassCaptureTarget;
};

type GlassContextValue = {
  configuration?: GlassConfiguration;
  material?: GlassMaterial;
  enabled: boolean;
  surface: boolean;
};

export const GlassContext = createContext<GlassContextValue>({
  enabled: false,
  surface: false,
});

export type GlassProps = { glass?: boolean; glassMaterial?: GlassMaterial };

export function withGlass<P extends object>(
  Component: ComponentType<P>,
  kind: "surface" | "control" | "scope" | "portal" = "surface",
) {
  function GlassComponent({ glass, glassMaterial, ...props }: P & GlassProps) {
    const context = useContext(GlassContext);
    const enabled =
      glass ?? (context.enabled && (kind !== "surface" || !context.surface));
    const configuration = context.configuration;
    const id = configuration?.id ?? "default";
    const material =
      glassMaterial ?? context.material ?? configuration?.material ?? "frosted";
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
    const materialStyle = {} as CSSProperties & Record<string, unknown>;
    if (options?.tint) materialStyle["--glass-base"] = options.tint;
    if (Number.isFinite(options?.blur))
      materialStyle["--glass-blur"] =
        `${Math.min(24, Math.max(0, options?.blur ?? 0))}px`;
    if (Number.isFinite(options?.tintOpacity))
      materialStyle["--glass-opacity"] =
        `${Math.min(1, Math.max(0, options?.tintOpacity ?? 0)) * 100}%`;
    if (options?.highlight === 0) materialStyle["--glass-edge"] = "none";
    const initialStyle =
      typeof originalStyle === "function"
        ? (state: unknown) => ({ ...originalStyle(state), ...materialStyle })
        : { ...originalStyle, ...materialStyle };
    return (
      <GlassContext.Provider
        value={{
          configuration,
          material,
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
                "data-glass-material": material,
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
