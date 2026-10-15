import type { SvgGlassRenderer } from "@/lib/glass/svg-renderer";

let svg: Promise<SvgGlassRenderer | undefined> | undefined;
let instance: SvgGlassRenderer | undefined;
let failed = false;
let controller = new AbortController();

/** CSS-only material where reduced transparency or forced colors are preferred. */
export function glassBaseOnly() {
  return Boolean(
    window.matchMedia?.(
      "(prefers-reduced-transparency: reduce), (forced-colors: active)",
    ).matches,
  );
}

/** The shared native SVG renderer, unless the browser cannot paint SVG backdrops. */
export async function prepareGlassRenderer() {
  if (glassBaseOnly() || failed) return;
  const session = controller;
  svg ??= (async () => {
    try {
      const { SvgGlassRenderer } = await import("@/lib/glass/svg-renderer");
      const renderer = await SvgGlassRenderer.create();
      if (session.signal.aborted) {
        renderer.destroy();
        return;
      }
      instance = renderer;
      return renderer;
    } catch {
      if (!session.signal.aborted) failed = true;
    }
  })();
  const renderer = await svg;
  if (!session.signal.aborted && !failed) return renderer;
}

export function failGlassRenderer() {
  failed = true;
  instance?.destroy();
  instance = undefined;
}

export function releaseGlassRenderers() {
  controller.abort();
  instance?.destroy();
  instance = undefined;
  svg = undefined;
  failed = false;
  controller = new AbortController();
}
