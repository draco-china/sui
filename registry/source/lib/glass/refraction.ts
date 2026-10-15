// A narrower band keeps small controls from bending half their height.
const glassMaxBevelWidth = 12;
const glassBevelFraction = 0.15;
export const glassMaxEdgeClarity = 0.8;

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
