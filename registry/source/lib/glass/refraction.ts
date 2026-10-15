export const glassMaxBevelWidth = 17;
export const glassBevelFraction = 0.25;
export const glassMaxEdgeClarity = 0.8;
// Covers maximum GPU displacement (64 × .45 + .45), 2px blur and antialiasing.
export const glassSamplePadding = 40;

export function glassBevelWidth(width: number, height: number) {
  return Math.min(
    glassMaxBevelWidth,
    Math.min(width, height) * glassBevelFraction,
  );
}

export function glassRefractionStrength(
  strength: number,
  width: number,
  height: number,
) {
  const bevel = glassBevelWidth(width, height);
  // The smoothstep profile has a maximum slope of 1.5 / bevel. With
  // the normal map's 0.45 scale and this gain, the sampling slope stays
  // above 0.1 even at saturation, while the lens becomes more pronounced.
  return ((bevel * strength) / (bevel + strength)) * (4 / 3);
}

export function glassRefractionProfile(depth: number, bevel: number) {
  const t = Math.max(0, Math.min(1, depth / bevel));
  return 1 - t * t * (3 - 2 * t);
}
