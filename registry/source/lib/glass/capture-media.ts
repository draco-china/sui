import { glassSamplePadding } from "@/lib/glass/refraction";

export type GlassCaptureBounds = Pick<
  DOMRect,
  "left" | "top" | "right" | "bottom"
>;

export function glassCaptureRatio() {
  return Math.min(2, Math.sqrt(8_388_608 / (innerWidth * innerHeight)));
}

// Align shared requests to the existing half-resolution Gaussian pixel grid.
export function glassMediaBounds(
  requests: readonly (GlassCaptureBounds & { width: number; height: number })[],
): GlassCaptureBounds | undefined {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const rect of requests) {
    if (
      !rect.width ||
      !rect.height ||
      rect.right <= 0 ||
      rect.bottom <= 0 ||
      rect.left >= innerWidth ||
      rect.top >= innerHeight
    )
      continue;
    left = Math.min(left, rect.left - glassSamplePadding);
    top = Math.min(top, rect.top - glassSamplePadding);
    right = Math.max(right, rect.right + glassSamplePadding);
    bottom = Math.max(bottom, rect.bottom + glassSamplePadding);
  }
  if (!Number.isFinite(left)) return;
  const ratio = glassCaptureRatio();
  const axis = (start: number, end: number, size: number) => {
    const pixels = Math.floor(size * ratio);
    // Odd full dimensions change the downsampling grid; retain that axis.
    if (pixels % 2) return [0, pixels / ratio];
    return [
      Math.max(0, Math.floor((start * ratio) / 2) * 2) / ratio,
      Math.min(pixels, Math.ceil((end * ratio) / 2) * 2) / ratio,
    ];
  };
  const [x0, x1] = axis(left, right, innerWidth);
  const [y0, y1] = axis(top, bottom, innerHeight);
  return { left: x0, top: y0, right: x1, bottom: y1 };
}

export function glassMediaSource(target: HTMLElement) {
  if (target.dataset.glassCapture !== "media") return undefined;
  const media = target.querySelector<HTMLVideoElement | HTMLImageElement>(
    "[data-glass-backdrop]",
  );
  if (!media || media.closest("[data-glass-exclude]")) return undefined;
  return media;
}

// A dedicated media-only capture target avoids serializing UI for each video frame.
export async function captureGlassMedia(
  target: HTMLElement,
  region?: GlassCaptureBounds,
) {
  const media = glassMediaSource(target);
  if (!media) return undefined;
  let source = media;
  if (media.tagName === "VIDEO") {
    const video = media as HTMLVideoElement;
    if (
      video.poster &&
      video.paused &&
      video.currentTime === 0 &&
      video.played.length === 0
    ) {
      const poster = target.ownerDocument.createElement("img");
      if (video.crossOrigin) poster.crossOrigin = video.crossOrigin;
      poster.src = video.poster;
      await poster.decode();
      source = poster;
    }
  }
  let width: number;
  let height: number;
  if (source.tagName === "VIDEO") {
    const video = source as HTMLVideoElement;
    if (video.readyState < 2) throw new Error("Glass video is not ready");
    width = video.videoWidth;
    height = video.videoHeight;
  } else {
    const image = source as HTMLImageElement;
    width = image.naturalWidth;
    height = image.naturalHeight;
  }
  if (!width || !height) throw new Error("Glass media is not ready");
  const bounds = media.getBoundingClientRect();
  const clip = target.getBoundingClientRect();
  const style = getComputedStyle(media);
  if (style.objectFit !== "cover" && style.objectFit !== "contain")
    throw new Error("Glass media capture requires cover or contain");
  const canvas = target.ownerDocument.createElement("canvas");
  const ratio = glassCaptureRatio();
  const origin: [number, number] = [region?.left ?? 0, region?.top ?? 0];
  canvas.width = Math.max(
    1,
    region
      ? Math.round((region.right - region.left) * ratio)
      : Math.floor(innerWidth * ratio),
  );
  canvas.height = Math.max(
    1,
    region
      ? Math.round((region.bottom - region.top) * ratio)
      : Math.floor(innerHeight * ratio),
  );
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Glass media canvas unavailable");
  const scale =
    style.objectFit === "cover"
      ? Math.max(bounds.width / width, bounds.height / height)
      : Math.min(bounds.width / width, bounds.height / height);
  const paintedWidth = width * scale;
  const paintedHeight = height * scale;
  context.save();
  context.scale(ratio, ratio);
  if (region) context.translate(-origin[0], -origin[1]);
  context.beginPath();
  context.rect(clip.left, clip.top, clip.width, clip.height);
  context.clip();
  context.drawImage(
    source,
    bounds.left + (bounds.width - paintedWidth) / 2,
    bounds.top + (bounds.height - paintedHeight) / 2,
    paintedWidth,
    paintedHeight,
  );
  context.restore();
  context.getImageData(0, 0, 1, 1);
  return { canvas, ratio, origin };
}
