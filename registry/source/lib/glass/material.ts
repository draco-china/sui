type RGB = [number, number, number];
type RGBA = [number, number, number, number];

function matches(left: RGBA, right: RGBA) {
  if (left[3] === 0) return false;
  // Compare premultiplied bytes: low-alpha Canvas colors lose RGB precision.
  const scale = left[3] * 255;
  return left
    .slice(0, 3)
    .every(
      (value, index) =>
        Math.abs(
          Math.round(value * scale) - Math.round(right[index] * scale),
        ) <= 1,
    );
}

/** Keep semantic paint independent from the transparency of the glass tint. */
export function glassMaterial({
  paint,
  tint,
  opacity,
  primary,
  foreground,
  background,
  text,
  overrideTint,
  surfaceColors = [],
  destructive,
  customPaint = false,
}: {
  paint: RGBA;
  tint: RGBA;
  opacity: number;
  primary: RGBA;
  foreground: RGBA;
  background: RGBA;
  text: RGBA;
  overrideTint?: RGBA;
  surfaceColors?: RGBA[];
  destructive?: RGBA;
  customPaint?: boolean;
}) {
  const chromatic =
    Math.max(...paint.slice(0, 3)) - Math.min(...paint.slice(0, 3)) > 0.04;
  const surface = surfaceColors.find(
    (color) => color[3] > 0 && matches(paint, color),
  );
  const semantic =
    paint[3] > 0 &&
    (customPaint ||
      (primary[3] > 0 && matches(paint, primary)) ||
      (destructive && destructive[3] > 0 && matches(paint, destructive)) ||
      (!surface && (paint[3] < 1 || (chromatic && !matches(paint, tint)))) ||
      (foreground[3] > 0 &&
        background[3] > 0 &&
        matches(paint, foreground) &&
        matches(text, background)));
  if (!semantic) {
    const base = overrideTint ?? surface ?? (paint[3] > 0 ? paint : tint);
    return { tint: base.slice(0, 3) as RGB, opacity: opacity * base[3] };
  }
  const glassTint = overrideTint ?? tint;
  const neutral = opacity * glassTint[3] * (1 - paint[3]);
  const combined = paint[3] + neutral;
  return {
    tint: paint
      .slice(0, 3)
      .map(
        (channel, index) =>
          (channel * paint[3] + glassTint[index] * neutral) / combined,
      ) as RGB,
    opacity: combined,
  };
}
