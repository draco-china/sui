export type ImageTransform = {
  scale: number;
  rotate: number;
  x: number;
  y: number;
};
export const defaultImageTransform: ImageTransform = {
  scale: 1,
  rotate: 0,
  x: 0,
  y: 0,
};
export function clampImageScale(scale: number) {
  return Number.isFinite(scale) ? Math.min(5, Math.max(0.1, scale)) : 1;
}
export function normalizeImageIndex(index: number, length: number) {
  if (length > 0)
    return Math.min(
      length - 1,
      Math.max(0, Number.isFinite(index) ? Math.trunc(index) : 0),
    );
  return 0;
}
export function wrapImageIndex(index: number, length: number) {
  return length > 0 ? ((Math.trunc(index) % length) + length) % length : 0;
}
