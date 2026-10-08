import type { GlassMode } from "./context";
import type { GlassRenderer } from "./renderer";
import type { SvgGlassRenderer } from "./svg-renderer";

type Backend = {
  kind: "vgpu" | "svg";
  renderer: GlassRenderer | SvgGlassRenderer;
};
let gpu: Promise<Backend | undefined> | undefined;
let svg: Promise<Backend | undefined> | undefined;
let gpuInstance: GlassRenderer | undefined;
let svgInstance: SvgGlassRenderer | undefined;
let controller = new AbortController();
let gpuFailed = false;
let svgFailed = false;

export function glassBaseOnly(mode: GlassMode = "auto") {
  return (
    mode === "css" ||
    window.matchMedia?.(
      "(prefers-reduced-transparency: reduce), (forced-colors: active)",
    ).matches
  );
}

export async function prepareGlassRenderer(mode: GlassMode = "auto") {
  if (glassBaseOnly(mode)) return;
  const session = controller;
  if (mode === "auto" && !gpuFailed) {
    gpu ??= (async () => {
      try {
        const { GlassRenderer } = await import("./renderer");
        const renderer = await GlassRenderer.create(session.signal);
        if (session.signal.aborted) {
          renderer.destroy();
          return;
        }
        gpuInstance = renderer;
        return { kind: "vgpu", renderer } satisfies Backend;
      } catch {
        if (!session.signal.aborted) gpuFailed = true;
      }
    })();
    const backend = await gpu;
    if (session.signal.aborted) return;
    if (backend && !gpuFailed) return backend;
  }
  if (svgFailed) return;
  svg ??= (async () => {
    try {
      const { SvgGlassRenderer } = await import("./svg-renderer");
      const renderer = await SvgGlassRenderer.create();
      if (session.signal.aborted) {
        renderer.destroy();
        return;
      }
      svgInstance = renderer;
      return { kind: "svg", renderer } satisfies Backend;
    } catch {
      if (!session.signal.aborted) svgFailed = true;
    }
  })();
  const backend = await svg;
  if (!session.signal.aborted && !svgFailed) return backend;
}

export function failGlassRenderer(kind: Backend["kind"]) {
  if (kind === "vgpu") {
    gpuFailed = true;
    gpuInstance?.destroy();
    gpuInstance = undefined;
  } else {
    svgFailed = true;
    svgInstance?.destroy();
    svgInstance = undefined;
  }
}

export function releaseGlassRenderers() {
  controller.abort();
  gpuInstance?.destroy();
  svgInstance?.destroy();
  gpuInstance = undefined;
  svgInstance = undefined;
  gpu = undefined;
  svg = undefined;
  gpuFailed = false;
  svgFailed = false;
  controller = new AbortController();
}
