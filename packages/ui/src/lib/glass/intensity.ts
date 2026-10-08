export type GlassIntensity = "sm" | "default" | "lg";

const intensityDefaults = {
  sm: { blur: 4, tintOpacity: 0.4 },
  default: { blur: 6, tintOpacity: 0.6 },
  lg: { blur: 8, tintOpacity: 0.78 },
} as const;

export function glassIntensityDefaults(intensity?: string) {
  if (intensity === "sm") return intensityDefaults.sm;
  if (intensity === "lg") return intensityDefaults.lg;
  return intensityDefaults.default;
}
