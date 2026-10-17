"use client";

import {
  type ComponentType,
  type CSSProperties,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { GlassConfig } from "@/lib/glass/defaults";
import { acquireGlass, updateGlassConfiguration } from "@/lib/glass/runtime";

export type { GlassConfig, GlassEdge } from "@/lib/glass/defaults";

/**
 * `glass` turns on Clear liquid glass, with its own settings or the
 * defaults; `frosted` turns on the CSS-only frosted material, and `glass`
 * wins when both are set. Nothing is inherited: a component is glass only
 * when it says so. Inside another glass layer it keeps its tint and edge
 * light but does not blur the backdrop again.
 */
export type GlassProps = { glass?: boolean | GlassConfig; frosted?: boolean };

type StyleProp =
  | CSSProperties
  | ((state: unknown) => CSSProperties | undefined)
  | undefined;

/**
 * Adds the tint settings to a component's style, or to its style callback, so
 * the first paint already uses them before the runtime reads the material.
 */
function withTintStyle(style: StyleProp, configuration: GlassConfig) {
  const tint: Record<string, string> = {};
  if (configuration.tint) tint["--glass-base"] = configuration.tint;
  if (Number.isFinite(configuration.tintOpacity))
    tint["--glass-opacity"] =
      `${Math.min(1, Math.max(0, configuration.tintOpacity ?? 0)) * 100}%`;
  if (!Object.keys(tint).length) return style;
  if (typeof style === "function")
    return (state: unknown) => ({ ...style(state), ...tint });
  return { ...style, ...tint };
}

const noSettings: GlassConfig = {};

export function withGlass<P extends object>(Component: ComponentType<P>) {
  function GlassComponent({
    glass = false,
    frosted = false,
    ...props
  }: P & GlassProps) {
    const id = useId();
    const [mounted, setMounted] = useState(false);
    const clear = glass !== false;
    const settings = typeof glass === "object" ? glass : noSettings;
    // Inline settings are new on every render; keying by content keeps one
    // configuration, so the runtime only hears about real changes.
    const key = JSON.stringify(settings);
    // biome-ignore lint/correctness/useExhaustiveDependencies: the key captures the settings' content.
    const configuration = useMemo(() => settings, [key]);
    const initialConfiguration = useEffectEvent(() => configuration);
    useLayoutEffect(() => {
      if (!clear) return;
      setMounted(true);
      return acquireGlass({ ...initialConfiguration(), id });
    }, [clear, id]);
    useLayoutEffect(() => {
      if (clear) updateGlassConfiguration({ ...configuration, id });
    }, [clear, configuration, id]);
    if (clear)
      return (
        <Component
          {...(props as P)}
          style={withTintStyle(
            (props as { style?: StyleProp }).style,
            configuration,
          )}
          data-glass="true"
          data-glass-scope={id}
          data-glass-text-glow={String(configuration.textGlow ?? false)}
          data-glass-state="loading"
          data-glass-mounted={mounted}
        />
      );
    if (frosted) return <Component {...(props as P)} data-frosted="true" />;
    return <Component {...(props as P)} />;
  }
  GlassComponent.displayName = `Glass(${Component.displayName ?? Component.name})`;
  return GlassComponent;
}
