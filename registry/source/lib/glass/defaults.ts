/** Refraction strength shared by both materials. */
export const glassDefaults = { strength: 22 } as const;

// Web approximations of Apple's Clear and Regular materials. Clear keeps the
// backdrop recognizable; Regular frosts it so text stays legible over busy
// content. `blur` is the SVG refraction blur. The CSS fallback in glass.css
// blurs a little more (6px and 16px) to separate the layers, and both
// saturate the backdrop by 1.3.
export const glassMaterials = {
  clear: { tintOpacity: 0.12, blur: 4 },
  regular: { tintOpacity: 0.3, blur: 14 },
} as const;

export type GlassMaterial = keyof typeof glassMaterials;

/** Regular is the default, as on Apple platforms; Clear suits media backdrops. */
export const glassDefaultMaterial: GlassMaterial = "regular";

/**
 * Edge light: the SUI 1.1 rim lit from the top-left and bottom-right corners
 * (default), or the SUI 1.3 bevel lit from the top and bottom.
 */
const glassEdges = ["diagonal", "vertical"] as const;

export type GlassEdge = (typeof glassEdges)[number];

export const glassDefaultEdge: GlassEdge = "diagonal";
