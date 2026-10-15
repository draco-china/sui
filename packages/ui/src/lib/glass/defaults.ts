export const glassDefaults = {
  strength: 22,
  tintOpacity: 0.12,
} as const;

// Web approximations of Apple's Clear and Regular materials. Clear keeps the
// backdrop recognizable; Regular frosts it so text stays legible over busy
// content. Both share the edge light and saturation. Without SVG refraction
// the CSS fallback blurs a little more to separate the layers.
export const glassMaterials = {
  clear: { ...glassDefaults, saturation: 1.3, blur: { svg: 4, css: 6 } },
  regular: {
    ...glassDefaults,
    tintOpacity: 0.3,
    saturation: 1.3,
    blur: { svg: 14, css: 16 },
  },
} as const;

export type GlassMaterial = keyof typeof glassMaterials;

/** Regular is the default, as on Apple platforms; Clear suits media backdrops. */
export const glassDefaultMaterial: GlassMaterial = "regular";

/**
 * Edge light: the SUI 1.1 rim lit from the top-left and bottom-right corners
 * (default), or the SUI 1.3 bevel lit from the top and bottom.
 */
export const glassEdges = ["diagonal", "vertical"] as const;

export type GlassEdge = (typeof glassEdges)[number];

export const glassDefaultEdge: GlassEdge = "diagonal";
