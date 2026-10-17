/**
 * Clear liquid glass, a Web approximation of Apple's Clear material: the
 * backdrop stays recognizable through SVG refraction, where `blur` is the
 * refraction blur; its CSS fallback in glass.css blurs 6px. It saturates the
 * backdrop by 1.3. Frosted glass is CSS only and lives in frosted.css.
 */
export const glassDefaults = {
  strength: 22,
  tintOpacity: 0.12,
  blur: 4,
} as const;

/**
 * Edge light: the SUI 1.1 rim lit from the top-left and bottom-right corners
 * (default), or the SUI 1.3 bevel lit from the top and bottom.
 */
const glassEdges = ["diagonal", "vertical"] as const;

export type GlassEdge = (typeof glassEdges)[number];

export const glassDefaultEdge: GlassEdge = "diagonal";

export type GlassConfig = {
  /** Edge light from the top-left and bottom-right corners, or from the top and bottom. */
  edge?: GlassEdge;
  /** Refraction strength. */
  strength?: number;
  /** The tint color; the component's own background by default. */
  tint?: string;
  /** The tint's opacity from 0 to 1. */
  tintOpacity?: number;
  /**
   * A tight glow in the tint behind text and icons, for legibility over busy
   * backdrops. Off by default.
   */
  textGlow?: boolean;
};

/** One component's settings, as the runtime receives them. */
export type GlassConfiguration = GlassConfig & { id: string };
