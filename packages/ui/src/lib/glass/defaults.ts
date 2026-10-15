export const glassDefaults = {
  strength: 22,
  tintOpacity: 0.1,
  highlight: 0.3,
  minimumContrast: 0,
} as const;

export const glassMaterials = {
  clear: glassDefaults,
  regular: { ...glassDefaults, tintOpacity: 0.35 },
} as const;

export type GlassMaterial = keyof typeof glassMaterials;
