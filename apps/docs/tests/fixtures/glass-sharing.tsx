import { mock, spyOn } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import type { GlassConfiguration } from "../../../../packages/ui/src/lib/glass/context";
import {
  GlassContrastError,
  GlassTextContrastCache,
  resolveGlassContrastTint,
} from "../../../../packages/ui/src/lib/glass/contrast";
import { glassMaterial } from "../../../../packages/ui/src/lib/glass/material";
import type { GlassFrame } from "../../../../packages/ui/src/lib/glass/renderer";

let materialReads = 0;
const computeMaterial = glassMaterial;
mock.module("../../../../packages/ui/src/lib/glass/material", () => ({
  glassMaterial(input: Parameters<typeof computeMaterial>[0]) {
    materialReads++;
    return computeMaterial(input);
  },
}));

const window = new Window({ url: "http://localhost" });
const textReads = spyOn(GlassTextContrastCache.prototype, "read");
const document = window.document;
const fontEvents = new window.EventTarget();
Object.defineProperty(document, "fonts", { value: fontEvents });
function loadedFont(family: string) {
  const event = new window.Event("loadingdone");
  Object.defineProperty(event, "fontfaces", { value: [{ family }] });
  fontEvents.dispatchEvent(event);
}
let nextDecode: Promise<void> | undefined;
let nextRender: Promise<void> | undefined;
let frameDecodes = 0;
Object.defineProperty(window, "Image", {
  value: class {
    src = "";
    async decode() {
      frameDecodes++;
      const pending = nextDecode;
      nextDecode = undefined;
      await pending;
    }
  },
});
type ObserverEntry = { target: unknown; isIntersecting?: boolean };
const observers: Observer[] = [];
class Observer {
  disconnected = false;
  observed = new Set<unknown>();
  constructor(readonly callback: (entries: ObserverEntry[]) => void) {
    observers.push(this);
  }
  observe(target: unknown) {
    this.observed.add(target);
  }
  unobserve(target: unknown) {
    this.observed.delete(target);
  }
  disconnect() {
    this.disconnected = true;
    this.observed.clear();
  }
}
const resizeObservers: Observer[] = [];
class Resize extends Observer {
  constructor(callback: (entries: ObserverEntry[]) => void) {
    super(callback);
    resizeObservers.push(this);
  }
}
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  MutationObserver: window.MutationObserver,
  ResizeObserver: Resize,
  IntersectionObserver: Observer,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  innerWidth: 800,
  innerHeight: 600,
});
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value: () => ({
    fillStyle: "#ffffff",
    fillRect() {},
    clearRect() {},
    getImageData() {
      const rgb = this.fillStyle.match(/^rgba?\(([^)]+)\)$/)?.[1];
      if (rgb) {
        const channels = rgb.split(",").map(Number);
        return {
          data: new Uint8Array([
            channels[0],
            channels[1],
            channels[2],
            (channels[3] ?? 1) * 255,
          ]),
        };
      }
      if (/^#[a-f\d]{6}$/i.test(this.fillStyle)) {
        const channels =
          this.fillStyle
            .slice(1)
            .match(/../g)
            ?.map((channel) => Number.parseInt(channel, 16)) ?? [];
        return { data: new Uint8Array([...channels, 255]) };
      }
      return { data: new Uint8Array([255, 255, 255, 255]) };
    },
  }),
});
const croppedRequests = process.argv.includes("--media-region-only");
const captureOrigins = new WeakMap<HTMLCanvasElement, [number, number]>();
const captures: {
  target: HTMLElement;
  blocked: Set<Element>;
  snapshot: HTMLCanvasElement;
  started: number;
  mediaOnly: boolean;
}[] = [];
const renders: { source: HTMLCanvasElement; frame: GlassFrame }[] = [];
let svgAvailable = false;
type SvgGeometry = Pick<
  GlassFrame,
  "width" | "height" | "radius" | "radiusY" | "strength"
>;
const svgFilters: { element: HTMLElement; geometry: SvgGeometry }[] = [];
const svgReleases: HTMLElement[] = [];
const activeSvgFilters = new Map<HTMLElement, string>();
let svgFilterSequence = 0;
let svgFailure = false;
let rendererCreations = 0;
let rendererDestructions = 0;
let captureDelay = 0;
let activeCaptures = 0;
let peakCaptures = 0;
let fontLeases = 0;
let fontAcquisitions = 0;
const contrastFailures: GlassFrame[] = [];
let nextRenderFailure: Error | undefined;
let nextCaptureFailure: Error | undefined;
let nextCaptureFailureMediaOnly: boolean | undefined;
const { glassLayoutSize, GlassResourceError } = await import(
  "../../../../packages/ui/src/lib/glass/capture"
);
mock.module("../../../../packages/ui/src/lib/glass/capture", () => ({
  GlassResourceError,
  releaseGlassFrame: (url: string) => URL.revokeObjectURL(url),
  glassLayoutSize,
  acquireGlassCaptureFonts: () => {
    fontAcquisitions++;
    fontLeases++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      fontLeases--;
    };
  },
  glassCapturePixelRatio: () => 1,
  glassCaptureOrigin: (canvas: HTMLCanvasElement) =>
    captureOrigins.get(canvas) ?? [0, 0],
  captureGlassBackground: async (
    target: HTMLElement,
    blocked: Set<Element>,
    mediaOnly = true,
    region?: { left: number; top: number; right: number; bottom: number },
  ) => {
    activeCaptures++;
    peakCaptures = Math.max(peakCaptures, activeCaptures);
    const snapshot = document.createElement(
      "canvas",
    ) as unknown as HTMLCanvasElement;
    snapshot.width = 800;
    snapshot.height = 600;
    if (croppedRequests && mediaOnly && region) {
      snapshot.width = Math.round(region.right - region.left);
      snapshot.height = Math.round(region.bottom - region.top);
      captureOrigins.set(snapshot, [region.left, region.top]);
    }
    captures.push({
      target,
      blocked: new Set(blocked),
      snapshot,
      started: performance.now(),
      mediaOnly,
    });
    await new Promise((resolve) => setTimeout(resolve, captureDelay));
    activeCaptures--;
    if (
      nextCaptureFailure &&
      (nextCaptureFailureMediaOnly === undefined ||
        mediaOnly === nextCaptureFailureMediaOnly)
    ) {
      const error = nextCaptureFailure;
      nextCaptureFailure = undefined;
      nextCaptureFailureMediaOnly = undefined;
      throw error;
    }
    return snapshot;
  },
}));
const internalDefaults = {
  strength: 22,
  tintOpacity: 0.1,
  highlight: 0.3,
  minimumContrast: 0,
};
mock.module("../../../../packages/ui/src/lib/glass/defaults", () => ({
  glassDefaults: internalDefaults,
  glassMaterials: {
    clear: internalDefaults,
    regular: { ...internalDefaults, tintOpacity: 0.35 },
  },
}));
mock.module("../../../../packages/ui/src/lib/glass/renderer", () => ({
  GlassRenderer: {
    create: async () => {
      rendererCreations++;
      return {
        render: async (source: HTMLCanvasElement, frame: GlassFrame) => {
          renders.push({ source, frame });
          const pending = nextRender;
          nextRender = undefined;
          if (pending) await pending;
          if (nextRenderFailure) {
            const error = nextRenderFailure;
            nextRenderFailure = undefined;
            throw error;
          }
          if (
            frame.textColors &&
            (frame.minimumContrast ?? 0) > 0 &&
            !resolveGlassContrastTint(
              frame.tint,
              frame.textColors,
              (frame.minimumContrast ?? 0) + 0.05,
            )
          ) {
            contrastFailures.push(frame);
            throw new GlassContrastError(
              "Glass text colors have no shared contrast background",
            );
          }
          return new Blob(["glass frame"]);
        },
        destroy: () => rendererDestructions++,
      };
    },
  },
}));
mock.module("../../../../packages/ui/src/lib/glass/svg-renderer", () => ({
  SvgGlassRenderer: {
    create: async () => {
      if (!svgAvailable) throw new Error("SVG unavailable in this fixture");
      return {
        filter: (element: HTMLElement, geometry: SvgGeometry) => {
          if (svgFailure) throw new Error("SVG rendering failed");
          svgFilters.push({ element, geometry });
          let value = activeSvgFilters.get(element);
          if (!value) {
            value = `url("#fixture-glass-${++svgFilterSequence}")`;
            activeSvgFilters.set(element, value);
          }
          return value;
        },
        release: (element: HTMLElement) => {
          svgReleases.push(element);
          activeSvgFilters.delete(element);
        },
        destroy: () => activeSvgFilters.clear(),
      };
    },
  },
}));
const { acquireGlass, refreshGlass, updateGlassConfiguration } = await import(
  "../../../../packages/ui/src/lib/glass/runtime"
);
const rects = new WeakMap<Element, DOMRect>();
let paintOrder: HTMLElement[] = [];
Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  value(this: Element) {
    return rects.get(this) ?? new window.DOMRect(0, 0, 800, 600);
  },
});
Object.defineProperty(document, "elementsFromPoint", {
  value: (x: number, y: number) =>
    paintOrder.filter((element) => {
      const rect = element.getBoundingClientRect();
      return (
        getComputedStyle(element).pointerEvents !== "none" &&
        x >= rect.left &&
        x < rect.right &&
        y >= rect.top &&
        y < rect.bottom
      );
    }),
});
function place(
  element: HTMLElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  rects.set(
    element,
    new window.DOMRect(x, y, width, height) as unknown as DOMRect,
  );
}
function stage() {
  const target = document.createElement("section") as unknown as HTMLElement;
  document.body.append(
    target as unknown as Parameters<typeof document.body.append>[0],
  );
  place(target, 0, 0, 800, 600);
  return target;
}
function surface(
  target: HTMLElement,
  scope: string,
  x: number,
  y: number,
  width = 120,
  height = 40,
) {
  const element = document.createElement("div") as unknown as HTMLElement;
  element.dataset.glass = "true";
  element.dataset.glassScope = scope;
  element.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
  element.style.borderRadius = "12px";
  target.append(element);
  place(element, x, y, width, height);
  return element;
}
function configuration(
  id: string,
  target: HTMLElement,
  strength = 22,
): GlassConfiguration {
  return { id, mode: "auto", captureTarget: target, options: { strength } };
}
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 350));
}
async function waitForRenderer(element: HTMLElement, renderer: string) {
  const deadline = performance.now() + 2000;
  while (
    element.dataset.glassRenderer !== renderer &&
    performance.now() < deadline
  )
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(element.dataset.glassRenderer, renderer);
}
async function waitForRender(count: number) {
  const limit = performance.now() + 2000;
  while (renders.length < count && performance.now() < limit)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(renders.length >= count, "a frame must reach the pending decode");
}
function latestFrame(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const match = [...renders].reverse().find(({ source, frame }) => {
    const origin = captureOrigins.get(source) ?? [0, 0];
    return (
      frame.origin &&
      frame.origin[0] + origin[0] === rect.left &&
      frame.origin[1] + origin[1] === rect.top
    );
  });
  assert.ok(
    match,
    `surface ${element.dataset.glassScope} must produce a frame with its viewport origin`,
  );
  return match;
}

if (croppedRequests) {
  const shared = stage();
  shared.dataset.glassCapture = "media";
  const video = document.createElement("video");
  video.setAttribute("data-glass-backdrop", "");
  shared.append(video as unknown as Node);
  place(video as unknown as HTMLElement, 0, 0, 800, 600);
  const a = surface(shared, "region-a", 100, 100, 120, 40);
  const b = surface(shared, "region-b", 300, 120, 120, 40);
  paintOrder = [a, b, video as unknown as HTMLElement, shared];
  const releaseA = acquireGlass(configuration("region-a", shared));
  const releaseB = acquireGlass(configuration("region-b", shared));
  await settle();
  assert.equal(
    captures.length,
    1,
    "compatible region requests share one raster",
  );
  assert.equal(latestFrame(a).source, latestFrame(b).source);
  assert.deepEqual(captureOrigins.get(latestFrame(a).source), [60, 60]);
  assert.deepEqual(latestFrame(a).frame.origin, [40, 40]);
  assert.deepEqual(latestFrame(b).frame.origin, [240, 60]);
  releaseA();
  releaseB();
  shared.remove();

  const layered = stage();
  layered.dataset.glassCapture = "media";
  layered.append(video as unknown as Node);
  const lower = surface(layered, "region-low", 100, 100, 180, 80);
  const upper = surface(layered, "region-high", 110, 110, 180, 80);
  lower.style.position = "absolute";
  lower.style.zIndex = "1";
  upper.style.position = "relative";
  upper.style.zIndex = "2";
  paintOrder = [upper, lower, video as unknown as HTMLElement, layered];
  const releaseLow = acquireGlass(configuration("region-low", layered));
  const releaseHigh = acquireGlass(configuration("region-high", layered));
  await settle();
  const initial = latestFrame(lower).source;
  assert.deepEqual(captureOrigins.get(initial), [60, 60]);
  updateGlassConfiguration(configuration("region-low", layered, 40));
  await settle();
  assert.equal(
    latestFrame(lower).source,
    initial,
    "classification shrink reuses the covering media raster",
  );
  place(lower, 600, 100, 180, 80);
  const currentResize = resizeObservers.find((observer) =>
    observer.observed.has(lower),
  );
  assert.ok(currentResize);
  currentResize.callback([{ target: lower }]);
  await settle();
  const moved = latestFrame(lower);
  assert.notEqual(
    moved.source,
    initial,
    "movement beyond coverage captures a new region",
  );
  assert.deepEqual(captureOrigins.get(moved.source), [560, 60]);
  assert.deepEqual(moved.frame.origin, [40, 40]);
  releaseLow();
  releaseHigh();
  layered.remove();
  assert.equal(fontLeases, 0);
  assert.equal(activeCaptures, 0);
  textReads.mockRestore();
  await window.happyDOM.close();
  console.log(
    "shared cropped regions, source offsets, coverage reuse and cleanup passed",
  );
  process.exit(0);
}

if (process.argv.includes("--live-media-only")) {
  const createdUrls: string[] = [];
  const revokedUrls: string[] = [];
  const createUrl = URL.createObjectURL.bind(URL);
  const revokeUrl = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    const url = createUrl(blob);
    createdUrls.push(url);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    revokedUrls.push(url);
    revokeUrl(url);
  };
  svgAvailable = true;
  const mixedTarget = stage();
  const pureTarget = stage();
  mixedTarget.dataset.glassCapture = "media";
  pureTarget.dataset.glassCapture = "media";
  const mixedVideo = document.createElement("video");
  const pureVideo = document.createElement("video");
  let playing = true;
  Object.defineProperty(mixedVideo, "paused", { get: () => !playing });
  for (const video of [mixedVideo, pureVideo]) {
    video.dataset.glassBackdrop = "true";
    video.style.cssText = "position:absolute;z-index:0;object-fit:cover";
    place(video as unknown as HTMLElement, 0, 0, 800, 600);
  }
  mixedTarget.append(mixedVideo as unknown as Node);
  pureTarget.append(pureVideo as unknown as Node);
  const caption = document.createElement("p");
  caption.textContent = "Ordinary retained paint";
  caption.style.cssText = "position:absolute;z-index:1;color:white";
  place(caption as unknown as HTMLElement, 20, 100, 120, 40);
  mixedTarget.append(caption as unknown as Node);
  const mixed = surface(mixedTarget, "live-mixed", 20, 100);
  const pure = surface(pureTarget, "live-pure", 350, 100);
  mixed.style.cssText += ";position:absolute;z-index:2";
  pure.style.cssText += ";position:absolute;z-index:2";
  paintOrder = [
    mixed,
    pure,
    caption as unknown as HTMLElement,
    mixedVideo as unknown as HTMLElement,
    pureVideo as unknown as HTMLElement,
    mixedTarget,
    pureTarget,
  ];
  const releaseMixed = acquireGlass(configuration("live-mixed", mixedTarget));
  await waitForRenderer(mixed, "svg");
  assert.equal(
    captures.length,
    0,
    "mixed playing video must stay live without DOM capture",
  );
  const releasePure = acquireGlass(configuration("live-pure", pureTarget));
  await waitForRenderer(pure, "vgpu");
  assert.equal(captures.length, 1);
  assert.equal(captures[0].mediaOnly, true);
  const pureFrame = pure.style.getPropertyValue("--glass-frame");

  playing = false;
  mixedVideo.dispatchEvent(new window.Event("pause"));
  await waitForRenderer(mixed, "vgpu");
  assert.equal(captures.at(-1)?.target, mixedTarget);
  assert.equal(captures.at(-1)?.mediaOnly, false);
  const mixedFrame = mixed.style.getPropertyValue("--glass-frame");
  assert.ok(mixedFrame);
  assert.equal(rendererCreations, 1);

  playing = true;
  mixedVideo.dispatchEvent(new window.Event("play"));
  await waitForRenderer(mixed, "svg");
  assert.equal(mixed.style.getPropertyValue("--glass-frame"), "");
  assert.equal(pure.style.getPropertyValue("--glass-frame"), pureFrame);
  const beforeTimeUpdate = captures.length;
  mixedVideo.dispatchEvent(new window.Event("timeupdate"));
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(captures.length, beforeTimeUpdate);

  const beforeMotion = captures.length;
  place(pure, 350, 140, 120, 40);
  window.dispatchEvent(new window.Event("scroll"));
  await waitForRenderer(pure, "svg");
  assert.equal(pure.style.getPropertyValue("--glass-frame"), "");
  assert.equal(captures.length, beforeMotion);
  await waitForRenderer(pure, "vgpu");
  assert.deepEqual(latestFrame(pure).frame.origin, [350, 140]);
  assert.notEqual(pure.style.getPropertyValue("--glass-frame"), pureFrame);

  releaseMixed();
  releasePure();
  assert.equal(fontLeases, 0);
  assert.equal(activeSvgFilters.size, 0);
  assert.ok(createdUrls.every((url) => revokedUrls.includes(url)));
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = revokeUrl;
  mixedTarget.remove();
  pureTarget.remove();
  textReads.mockRestore();
  await window.happyDOM.close();
  console.log(
    "mixed live video, pause recovery, pure-media isolation and cleanup passed",
  );
  process.exit(0);
}

const target = stage();
const unrelatedScroller = document.createElement("aside");
document.body.append(unrelatedScroller);
const backgroundText = document.createElement("p");
backgroundText.style.fontFamily = "BackgroundFont";
backgroundText.textContent = "Captured background text";
target.append(backgroundText as unknown as Node);
const left = surface(target, "left", 20, 30);
const right = surface(target, "right", 300, 80);
left.style.fontFamily = "SurfaceOnly";
paintOrder = [left, right, target];
const releaseLeft = acquireGlass(configuration("left", target));
const releaseRight = acquireGlass(configuration("right", target));
await settle();
assert.equal(
  captures.length,
  1,
  "two configurations on one scene share one capture",
);
assert.equal(rendererCreations, 1, "managers share a renderer");
assert.equal(
  fontLeases,
  2,
  "each sampling manager holds one document font lease",
);
assert.equal(captures[0]?.target, target);
assert.ok(captures[0]?.blocked.has(left));
assert.ok(captures[0]?.blocked.has(right));
assert.equal(latestFrame(left).source, captures[0]?.snapshot);

assert.equal(latestFrame(right).source, captures[0]?.snapshot);
assert.equal(
  latestFrame(left).source.width,
  800,
  "frames receive the full viewport, not a crop",
);
assert.equal(latestFrame(right).source.height, 600);
assert.equal(latestFrame(left).frame.margin, 0);
assert.equal(left.dataset.glassState, "ready");
assert.equal(right.dataset.glassState, "ready");
const decorativeCounter = document.createElement("span");
decorativeCounter.setAttribute("data-glass-decoration", "");
const decorativeText = document.createTextNode("60 FPS");
decorativeCounter.append(decorativeText);
target.append(decorativeCounter as unknown as Node);
const capturesBeforeCounter = captures.length;
const frameBeforeCounter = left.style.getPropertyValue("--glass-frame");
decorativeText.data = "59 FPS";
await new Promise((resolve) => setTimeout(resolve, 100));
assert.equal(
  captures.length,
  capturesBeforeCounter,
  "excluded decoration text cannot invalidate a background snapshot",
);
assert.equal(left.style.getPropertyValue("--glass-frame"), frameBeforeCounter);
decorativeCounter.remove();

const frameBeforeLease = left.style.getPropertyValue("--glass-frame");
const capturesBeforeLease = captures.length;
const rendersBeforeLease = renders.length;
const releaseAdditionalLease = acquireGlass({ id: "left", mode: "auto" });
assert.equal(
  left.dataset.glassState,
  "ready",
  "mounting another control must retain its scope's active rendering mode",
);
assert.equal(
  left.style.getPropertyValue("--glass-frame"),
  frameBeforeLease,
  "joining an existing scope cannot clear its decoded frame",
);
releaseAdditionalLease();
await settle();
assert.equal(
  captures.length,
  capturesBeforeLease,
  "joining a scope retains its capture target and cached background",
);
assert.equal(
  renders.length,
  rendersBeforeLease,
  "an unchanged scene keeps its decoded frame instead of repainting",
);
const externalStatus = document.createElement("p");
document.body.append(externalStatus);
externalStatus.textContent = "Unrelated page status";
await settle();
assert.equal(
  captures.length,
  capturesBeforeLease,
  "an unrelated status outside the capture target cannot resample the scene",
);
assert.equal(left.dataset.glassState, "ready");
assert.equal(left.style.getPropertyValue("--glass-frame"), frameBeforeLease);
externalStatus.remove();
const previousImage = left.style.getPropertyValue("--glass-frame");
let finishDecode = () => {};
nextDecode = new Promise<void>((resolve) => {
  finishDecode = resolve;
});
updateGlassConfiguration(configuration("left", target, 23));
await settle();
assert.equal(
  left.style.getPropertyValue("--glass-frame"),
  previousImage,
  "previous frame remains until the new image is decoded",
);
finishDecode();
await settle();
assert.notEqual(left.style.getPropertyValue("--glass-frame"), previousImage);

place(left, 35, 45, 120, 40);
updateGlassConfiguration(configuration("left", target, 34));
updateGlassConfiguration(configuration("right", target, 12));
await settle();
assert.equal(
  captures.length,
  1,
  "coordinates and material updates cannot recapture an unchanged scene",
);
assert.equal(latestFrame(left).frame.strength, 34);
assert.equal(latestFrame(right).frame.strength, 12);
assert.equal(latestFrame(left).source, captures[0]?.snapshot);

const beforeHighlightRender = renders.length;
const beforeHighlightCapture = captures.length;
const beforeHighlightEdge = left.style.getPropertyValue("--glass-edge");
updateGlassConfiguration({
  ...configuration("left", target, 34),
  options: { strength: 34, highlight: 0.5 },
});
await settle();
assert.equal(
  renders.length,
  beforeHighlightRender,
  "SVG-only highlight updates skip GPU rendering",
);
assert.equal(
  captures.length,
  beforeHighlightCapture,
  "SVG-only highlight updates reuse the background",
);
assert.notEqual(
  left.style.getPropertyValue("--glass-edge"),
  beforeHighlightEdge,
);

const beforeFonts = captures.length;
loadedFont("OutsideFont");
loadedFont("SurfaceOnly");
unrelatedScroller.dispatchEvent(new window.Event("scroll"));
await settle();
assert.equal(
  captures.length,
  beforeFonts,
  "unrelated scrolling and excluded fonts do not resample",
);
loadedFont("BackgroundFont");
await settle();
assert.equal(
  captures.length,
  beforeFonts + 1,
  "a font used by ordinary captured text invalidates the snapshot",
);

async function expectRefresh(change: () => void, reason: string) {
  const before = captures.length;
  const previous = latestFrame(left).source;
  change();
  await settle();
  assert.equal(
    captures.length,
    before + 1,
    `${reason} invalidates the scene once across managers`,
  );
  assert.notEqual(latestFrame(left).source, previous);
  assert.equal(latestFrame(left).source, latestFrame(right).source);
}
await expectRefresh(() => {
  const text = document.createElement("p") as unknown as HTMLParagraphElement;
  text.textContent = "Changed background";
  target.append(text);
}, "DOM mutation");
await expectRefresh(
  () => document.dispatchEvent(new window.Event("input", { bubbles: true })),
  "input",
);
await expectRefresh(
  () => document.documentElement.classList.add("dark"),
  "theme",
);
await expectRefresh(
  () => target.dispatchEvent(new window.Event("scroll") as unknown as Event),
  "captured container scroll",
);
await expectRefresh(() => {
  document.dispatchEvent(new window.Event("input", { bubbles: true }));
  document.dispatchEvent(new window.Event("input", { bubbles: true }));
  target.dispatchEvent(new window.Event("load") as unknown as Event);
  document.documentElement.dataset.color = "mist";
  window.dispatchEvent(new window.Event("scroll"));
}, "coalesced input, resource, palette and scroll events");
releaseLeft();
releaseRight();
unrelatedScroller.remove();
assert.equal(rendererDestructions, 1);
assert.equal(fontLeases, 0, "the final manager releases its font lifecycle");
assert.equal(left.dataset.glassState, undefined);
assert.equal(right.dataset.glassState, undefined);
const afterRelease = captures.length;
document.dispatchEvent(new window.Event("input", { bubbles: true }));
await settle();
assert.equal(
  captures.length,
  afterRelease,
  "released managers stop observing background changes",
);
target.remove();

const layers = stage();
const lower = surface(layers, "lower", 100, 100, 180, 80);
const upper = surface(layers, "upper", 110, 110, 180, 80);
paintOrder = [upper, lower, layers];
const beforeLayers = captures.length;
const releaseLower = acquireGlass(configuration("lower", layers));
const releaseUpper = acquireGlass(configuration("upper", layers));
await settle();
assert.equal(
  captures.length,
  beforeLayers + 1,
  "overlapping Glass surfaces on the same plane share their compatible clean background",
);
assert.equal(latestFrame(lower).source, latestFrame(upper).source);
const lowerCapture = [...captures]
  .reverse()
  .find(({ snapshot }) => snapshot === latestFrame(lower).source);
const upperCapture = [...captures]
  .reverse()
  .find(({ snapshot }) => snapshot === latestFrame(upper).source);
assert.ok(lowerCapture?.blocked.has(lower));
assert.ok(lowerCapture?.blocked.has(upper));
assert.ok(upperCapture?.blocked.has(upper));
assert.equal(
  upperCapture?.blocked.has(lower),
  true,
  "same-plane Glass peers are excluded together regardless of their DOM paint order",
);
releaseLower();
releaseUpper();
layers.remove();

const tabs = stage();
const track = surface(tabs, "track", 100, 100, 240, 48);
track.dataset.slot = "glass-surface";
track.dataset.glassContrast = "surface";
const indicator = surface(track, "indicator", 120, 108, 64, 32);
indicator.dataset.slot = "glass-surface";
paintOrder = [indicator, track, tabs];
const beforeTabs = captures.length;
const tabsRevocations = spyOn(URL, "revokeObjectURL");
const releaseTrack = acquireGlass(configuration("track", tabs));
const releaseIndicator = acquireGlass(configuration("indicator", tabs));
await settle();
assert.equal(
  captures.length,
  beforeTabs + 2,
  "a nested Glass surface captures its retained parent while the parent samples its own backdrop",
);
assert.notEqual(
  latestFrame(track).source,
  latestFrame(indicator).source,
  "different retained backgrounds cannot reuse the same snapshot",
);
assert.equal(
  latestFrame(track).frame.textColors,
  undefined,
  "navigation derives shared contrast from the surface foreground",
);
const indicatorCapture = captures.find(
  ({ snapshot }) => snapshot === latestFrame(indicator).source,
);
assert.ok(indicatorCapture?.blocked.has(indicator));
assert.equal(
  indicatorCapture?.blocked.has(track),
  false,
  "nested Glass retains its lower parent and ordinary content as the actual backdrop",
);
assert.deepEqual(latestFrame(indicator).frame.origin, [120, 108]);
const retainedTrackFrame = track.style.getPropertyValue("--glass-frame");
const retainedTrackUrl = retainedTrackFrame.match(/url\("([^")]+)"\)/)?.[1];
const childFrameUrl = indicator.style
  .getPropertyValue("--glass-frame")
  .match(/url\("([^")]+)"\)/)?.[1];
assert.ok(retainedTrackUrl);
assert.ok(childFrameUrl);
releaseIndicator();
assert.equal(
  tabsRevocations.mock.calls.some(([url]) => url === childFrameUrl),
  true,
  "child release revokes its own frame URL",
);
assert.equal(
  tabsRevocations.mock.calls.some(([url]) => url === retainedTrackUrl),
  false,
  "child cleanup cannot revoke its live parent's frame URL",
);
assert.equal(
  indicator.style.getPropertyValue("--glass-frame"),
  "",
  "releasing a child clears only its own rendered frame",
);
assert.equal(indicator.dataset.glassState, undefined);
assert.equal(
  track.style.getPropertyValue("--glass-frame"),
  retainedTrackFrame,
  "child cleanup preserves the lower parent's live frame",
);
assert.equal(track.dataset.glassState, "ready");
releaseTrack();
assert.equal(
  tabsRevocations.mock.calls.some(([url]) => url === retainedTrackUrl),
  true,
  "parent release finally revokes its own frame URL",
);
tabsRevocations.mockRestore();
tabs.remove();

const sharedPlane = stage();
const plainWrapperA = document.createElement("div") as unknown as HTMLElement;
const plainWrapperB = document.createElement("div") as unknown as HTMLElement;
sharedPlane.append(plainWrapperA, plainWrapperB);
place(plainWrapperA, 20, 30, 160, 80);
place(plainWrapperB, 300, 30, 160, 80);
const planeA = surface(plainWrapperA, "cross-parent-plane-a", 30, 40);
const planeB = surface(plainWrapperB, "cross-parent-plane-b", 310, 40);
paintOrder = [planeA, planeB, plainWrapperA, plainWrapperB, sharedPlane];
const beforeSharedPlane = captures.length;
const releasePlaneA = acquireGlass(
  configuration("cross-parent-plane-a", sharedPlane),
);
const releasePlaneB = acquireGlass(
  configuration("cross-parent-plane-b", sharedPlane),
);
await settle();
assert.notEqual(planeA.parentElement, planeB.parentElement);
assert.equal(
  captures.length,
  beforeSharedPlane + 1,
  "transparent DOM wrappers do not split a shared CSS painting plane",
);
assert.equal(latestFrame(planeA).source, latestFrame(planeB).source);
const sharedPlaneCapture = captures.find(
  ({ snapshot }) => snapshot === latestFrame(planeA).source,
);
assert.ok(sharedPlaneCapture);
assert.equal(sharedPlaneCapture.blocked.has(planeA), true);
assert.equal(
  sharedPlaneCapture.blocked.has(planeB),
  true,
  "same-plane peers are excluded even with different DOM parents",
);
assert.equal(sharedPlaneCapture.blocked.has(plainWrapperA), false);
assert.equal(sharedPlaneCapture.blocked.has(plainWrapperB), false);
const beforeSamePlaneMaterial = captures.length;
const originalPlaneA = latestFrame(planeA).source;
const originalPlaneB = latestFrame(planeB).source;
updateGlassConfiguration(
  configuration("cross-parent-plane-a", sharedPlane, 40),
);
await settle();
assert.equal(
  captures.length,
  beforeSamePlaneMaterial,
  "same-plane peers are excluded and therefore do not depend on each other's material frames",
);
assert.equal(latestFrame(planeA).source, originalPlaneA);
assert.equal(latestFrame(planeB).source, originalPlaneB);
releasePlaneA();
releasePlaneB();
sharedPlane.remove();

const orderedPlanes = stage();
orderedPlanes.dataset.glassCapture = "media";
const orderedBackdrop = document.createElement("video");
orderedBackdrop.setAttribute("data-glass-backdrop", "");
orderedPlanes.append(orderedBackdrop as unknown as Node);
place(orderedBackdrop as unknown as HTMLElement, 0, 0, 800, 600);
const lowerPlane = surface(orderedPlanes, "css-plane-low", 100, 100, 180, 80);
const upperPlane = surface(orderedPlanes, "css-plane-high", 110, 110, 180, 80);
lowerPlane.style.position = "relative";
lowerPlane.style.zIndex = "1";
upperPlane.style.position = "relative";
upperPlane.style.zIndex = "2";
paintOrder = [
  upperPlane,
  lowerPlane,
  orderedBackdrop as unknown as HTMLElement,
  orderedPlanes,
];
const beforeOrderedPlanes = captures.length;
const releaseLowerPlane = acquireGlass(
  configuration("css-plane-low", orderedPlanes),
);
const releaseUpperPlane = acquireGlass(
  configuration("css-plane-high", orderedPlanes),
);
await settle();
assert.equal(lowerPlane.parentElement, upperPlane.parentElement);
assert.equal(
  captures.length,
  beforeOrderedPlanes + 2,
  "different CSS painting phases require different backgrounds despite sharing a DOM parent",
);
const lowerPlaneCapture = captures.find(
  ({ snapshot }) => snapshot === latestFrame(lowerPlane).source,
);
const upperPlaneCapture = captures.find(
  ({ snapshot }) => snapshot === latestFrame(upperPlane).source,
);
assert.ok(lowerPlaneCapture);
assert.ok(upperPlaneCapture);
assert.equal(
  lowerPlaneCapture.mediaOnly,
  true,
  "a known higher Glass sibling does not block direct media sampling for the lower surface",
);
assert.equal(
  lowerPlaneCapture.blocked.size,
  0,
  "direct media sampling draws no Glass DOM and therefore needs no DOM exclusion mask",
);
assert.equal(
  upperPlaneCapture.mediaOnly,
  false,
  "an overlapping lower Glass sibling must be retained in the upper surface's DOM composite",
);
assert.equal(upperPlaneCapture.blocked.has(upperPlane), true);
assert.equal(
  upperPlaneCapture.blocked.has(lowerPlane),
  false,
  "the lower painted layer remains visible behind the higher Glass surface",
);
assert.notEqual(latestFrame(lowerPlane).source, latestFrame(upperPlane).source);
const initialLowerBackground = latestFrame(lowerPlane).source;
const initialUpperBackground = latestFrame(upperPlane).source;
const beforeLowerPaintChange = captures.length;
updateGlassConfiguration(configuration("css-plane-low", orderedPlanes, 40));
await settle();
assert.equal(
  latestFrame(lowerPlane).source,
  initialLowerBackground,
  "changing a lower layer's material reuses its own unchanged backdrop",
);
assert.notEqual(
  latestFrame(upperPlane).source,
  initialUpperBackground,
  "the higher CSS layer resamples its retained lower sibling frame",
);
const lowerPaintCaptures = captures.slice(beforeLowerPaintChange);
assert.ok(lowerPaintCaptures.length > 0);
assert.ok(
  lowerPaintCaptures.every(
    ({ target, blocked }) =>
      target === orderedPlanes &&
      blocked.has(upperPlane) &&
      !blocked.has(lowerPlane),
  ),
  "dependency refresh captures the retained-lower backdrop rather than invalidating every plane",
);
const updatedUpperBackground = latestFrame(upperPlane).source;
const beforeUpperPaintChange = captures.length;
updateGlassConfiguration(configuration("css-plane-high", orderedPlanes, 35));
await settle();
assert.equal(
  captures.length,
  beforeUpperPaintChange,
  "a higher layer's own material update does not invalidate the lower layer's backdrop",
);
assert.equal(latestFrame(lowerPlane).source, initialLowerBackground);
assert.equal(latestFrame(upperPlane).source, updatedUpperBackground);
releaseUpperPlane();
const afterUpperRelease = captures.length;
const rendersAfterUpperRelease = renders.length;
updateGlassConfiguration(configuration("css-plane-low", orderedPlanes, 45));
await settle();
assert.equal(
  captures.length,
  afterUpperRelease,
  "a released higher layer no longer requests captures when its lower backdrop changes",
);
assert.equal(
  renders
    .slice(rendersAfterUpperRelease)
    .some(
      ({ frame }) => frame.origin?.[0] === 110 && frame.origin?.[1] === 110,
    ),
  false,
  "lower updates do not render a released upper consumer",
);
assert.equal(upperPlane.style.getPropertyValue("--glass-frame"), "");
releaseLowerPlane();
orderedPlanes.remove();

const zeroStage = stage();
const zero = surface(zeroStage, "zero", 20, 30);
zero.style.backgroundColor = "transparent";
paintOrder = [zero, zeroStage];
const releaseZero = acquireGlass({
  ...configuration("zero", zeroStage),
  options: { tintOpacity: 0 },
});
await settle();
assert.equal(
  latestFrame(zero).frame.blur,
  2,
  "GPU blur remains internal at 2px",
);
assert.equal(
  latestFrame(zero).frame.tintOpacity,
  0,
  "zero tint override is valid",
);
releaseZero();
zeroStage.remove();

const radiusStage = stage();
const capsule = surface(radiusStage, "capsule", 20, 30, 300, 64);
capsule.style.borderRadius = "50%";
paintOrder = [capsule, radiusStage];
const releaseCapsule = acquireGlass(configuration("capsule", radiusStage));
await settle();
assert.deepEqual(latestFrame(capsule).frame.radius, [150, 150, 150, 150]);
assert.deepEqual(latestFrame(capsule).frame.radiusY, [32, 32, 32, 32]);
const originalStyle = getComputedStyle;
const ellipticalCorners = ["80% 60%", "40% 20%", "10% 30%", "20% 50%"];
const cornerProperties = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
];
// happy-dom does not parse two-axis longhand radii; supply the browser's computed values.
globalThis.getComputedStyle = (element) => {
  const style = originalStyle(element);
  if (element !== capsule) return style;
  return new Proxy(style, {
    get(target, property) {
      const index = cornerProperties.indexOf(String(property));
      if (index >= 0) return ellipticalCorners[index];
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
};
updateGlassConfiguration(configuration("capsule", radiusStage));
await settle();
const scaled = latestFrame(capsule).frame;
assert.deepEqual(scaled.radius, [200, 100, 25, 50]);
for (const [index, expected] of [32, 64 / 6, 16, 80 / 3].entries())
  assert.ok(Math.abs((scaled.radiusY?.[index] ?? 0) - expected) < 1e-10);
globalThis.getComputedStyle = originalStyle;
releaseCapsule();
radiusStage.remove();

const scaledStage = stage();
const scaledSurface = surface(scaledStage, "scaled-radius", 20, 30, 150, 16);
scaledSurface.style.width = "300px";
scaledSurface.style.height = "64px";
scaledSurface.style.boxSizing = "border-box";
scaledSurface.style.borderRadius = "20px";
paintOrder = [scaledSurface, scaledStage];
const releaseScaled = acquireGlass(configuration("scaled-radius", scaledStage));
await settle();
assert.deepEqual(latestFrame(scaledSurface).frame.radius, [10, 10, 10, 10]);
assert.deepEqual(
  latestFrame(scaledSurface).frame.radiusY,
  [5, 5, 5, 5],
  "non-uniform visual scaling preserves the DOM's corner geometry",
);
releaseScaled();
scaledStage.remove();

for (const pointerEvents of ["auto", "none"] as const) {
  const overlayStage = stage();
  const glass = surface(
    overlayStage,
    `overlay-${pointerEvents}`,
    100,
    100,
    300,
    300,
  );
  glass.style.position = "relative";
  glass.style.zIndex = "10";
  const decoration = document.createElement("div") as unknown as HTMLElement;
  decoration.style.position = "absolute";
  decoration.style.zIndex = "-1";
  decoration.style.pointerEvents = "none";
  decoration.style.backgroundColor = "#0088cc";
  overlayStage.prepend(decoration);
  place(decoration, 100, 100, 300, 300);
  const overlay = document.createElement("div") as unknown as HTMLElement;
  overlay.style.position = "absolute";
  overlay.style.zIndex = "20";
  overlay.style.pointerEvents = pointerEvents;
  overlay.style.backgroundColor = "#ff0000";
  overlayStage.append(overlay);
  place(overlay, 105, 105, 10, 10);
  paintOrder = [overlay, glass, decoration, overlayStage];
  const before: number = captures.length;
  const releaseOverlay = acquireGlass(
    configuration(`overlay-${pointerEvents}`, overlayStage),
  );
  await settle();
  assert.equal(captures.length, before + 1);
  assert.ok(
    captures.at(-1)?.blocked.has(overlay),
    `${pointerEvents} corner overlay is excluded even between the nine sample points`,
  );
  assert.equal(
    captures.at(-1)?.blocked.has(decoration),
    false,
    "lower pointer-events:none decoration remains in the background",
  );
  assert.equal(
    overlay.style.pointerEvents,
    pointerEvents,
    "sampling cannot temporarily alter the real DOM's hit-testing",
  );
  if (pointerEvents === "none") {
    overlay.style.zIndex = "10";
    decoration.style.zIndex = "10";
    await settle();
    assert.ok(captures.at(-1)?.blocked.has(overlay));
    assert.equal(
      captures.at(-1)?.blocked.has(decoration),
      false,
      "positioned layers with equal z-index follow DOM paint order",
    );
  }
  releaseOverlay();
  overlayStage.remove();
}

const uncertainStage = stage();
const uncertainGlass = surface(uncertainStage, "uncertain", 100, 100, 300, 300);
const uncertainOverlay = document.createElement(
  "div",
) as unknown as HTMLElement;
uncertainOverlay.style.pointerEvents = "none";
uncertainOverlay.style.backgroundColor = "#ff0000";
uncertainStage.append(uncertainOverlay);
place(uncertainOverlay, 105, 105, 10, 10);
paintOrder = [uncertainGlass, uncertainStage];
const beforeUncertain = captures.length;
const releaseUncertain = acquireGlass(
  configuration("uncertain", uncertainStage),
);
await settle();
assert.equal(
  captures.length,
  beforeUncertain,
  "ambiguous pointer-free layers cannot produce an incorrect screenshot",
);
assert.equal(uncertainGlass.dataset.glassState, "fallback");
releaseUncertain();
uncertainStage.remove();

const nestedStage = stage();
const parent = surface(nestedStage, "parent", 100, 100, 180, 80);
const child = surface(parent, "child", 115, 115, 120, 40);
const peer = surface(nestedStage, "peer", 400, 100);
paintOrder = [child, parent, peer, nestedStage];
const beforeNested = captures.length;
const releaseParent = acquireGlass(configuration("parent", nestedStage));
const releaseChild = acquireGlass(configuration("child", nestedStage));
const releasePeer = acquireGlass(configuration("peer", nestedStage));
await settle();
assert.equal(
  captures.length,
  beforeNested + 2,
  "parent/peer share their plane while nested child samples the retained parent",
);
const oldChildSnapshot = latestFrame(child).source;
const oldParentSnapshot = latestFrame(parent).source;
const oldPeerSnapshot = latestFrame(peer).source;
assert.equal(oldParentSnapshot, oldPeerSnapshot);
const parentFrame = parent.style.getPropertyValue("--glass-frame");
const beforeParentPaintChange = captures.length;
updateGlassConfiguration(configuration("parent", nestedStage, 40));
await settle();
assert.notEqual(parent.style.getPropertyValue("--glass-frame"), parentFrame);
assert.notEqual(
  latestFrame(child).source,
  oldChildSnapshot,
  "a child resamples the newly painted parent it retains as backdrop",
);
assert.equal(
  latestFrame(parent).source,
  oldParentSnapshot,
  "parent material changes reuse the parent's unchanged underlying background",
);
assert.equal(
  latestFrame(peer).source,
  oldPeerSnapshot,
  "a same-plane peer keeps its compatible cached background",
);
const parentPaintCaptures = captures.slice(beforeParentPaintChange);
assert.ok(parentPaintCaptures.length > 0);
assert.ok(
  parentPaintCaptures.every(
    ({ target, blocked }) =>
      target === nestedStage &&
      blocked.has(child) &&
      !blocked.has(parent) &&
      blocked.has(peer),
  ),
  "the child retains its parent while an out-of-footprint peer is excluded",
);
const beforePeerPaintChange = captures.length;
const updatedChildSnapshot = latestFrame(child).source;
updateGlassConfiguration(configuration("peer", nestedStage, 35));
await settle();
assert.equal(
  captures.length,
  beforePeerPaintChange,
  "an excluded same-plane peer outside the child's sample area creates no dependency refresh",
);
assert.equal(latestFrame(child).source, updatedChildSnapshot);
releaseChild();
const afterChildRelease = captures.length;
const rendersAfterChildRelease = renders.length;
updateGlassConfiguration(configuration("parent", nestedStage, 45));
await settle();
assert.equal(
  captures.length,
  afterChildRelease,
  "a released child stops requesting its retained-parent background",
);
assert.equal(
  renders
    .slice(rendersAfterChildRelease)
    .some(
      ({ frame }) => frame.origin?.[0] === 115 && frame.origin?.[1] === 115,
    ),
  false,
  "lower updates cannot render a released child",
);
assert.equal(child.style.getPropertyValue("--glass-frame"), "");
releaseParent();
releasePeer();
nestedStage.remove();

const createdUrls: string[] = [];
const revokedUrls: string[] = [];
const createUrl = URL.createObjectURL.bind(URL);
const revokeUrl = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = (blob) => {
  const url = createUrl(blob);
  createdUrls.push(url);
  return url;
};
URL.revokeObjectURL = (url) => {
  revokedUrls.push(url);
  revokeUrl(url);
};

const semanticStage = stage();
const semantic = surface(semanticStage, "semantic-state", 20, 30);
const semanticStyle = document.createElement("style");
semanticStyle.textContent =
  '[aria-pressed="true"], [data-checked] { background-color: rgb(0, 88, 204) !important; }';
document.head.append(semanticStyle);
paintOrder = [semantic, semanticStage];
const releaseSemantic = acquireGlass(
  configuration("semantic-state", semanticStage),
);
await waitForRenderer(semantic, "vgpu");
for (const attribute of ["aria-pressed", "data-checked"]) {
  const beforeSemanticCapture: number = captures.length;
  const previousSemanticUrl = createdUrls.at(-1);
  assert.ok(previousSemanticUrl);
  semantic.setAttribute(attribute, "true");
  const materialDeadline = performance.now() + 1000;
  while (
    semantic.style.getPropertyValue("--glass-base") !== "rgb(0, 88, 204)" &&
    performance.now() < materialDeadline
  )
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(
    semantic.style.getPropertyValue("--glass-base"),
    "rgb(0, 88, 204)",
    `${attribute} updates the material without input/change events or class changes`,
  );
  assert.equal(semantic.style.getPropertyValue("--glass-frame"), "");
  assert.ok(revokedUrls.includes(previousSemanticUrl));
  await settle();
  assert.equal(
    captures.length,
    beforeSemanticCapture,
    "solid semantic paint needs no hidden background capture",
  );
  assert.equal(semantic.dataset.glassState, "css");
  assert.equal(semantic.style.getPropertyValue("--glass-opacity"), "100%");
  assert.ok(
    semantic.style
      .getPropertyValue("--glass-edge")
      .includes("data:image/svg+xml"),
  );
  semantic.removeAttribute(attribute);
  await settle();
  assert.equal(
    semantic.dataset.glassState,
    "ready",
    "transparent paint resumes enhancement",
  );
  assert.equal(
    semantic.style.getPropertyValue("--glass-base"),
    "rgb(255, 255, 255)",
  );
}
releaseSemantic();
semanticStage.remove();
semanticStyle.remove();

for (const change of ["configuration", "theme", "state", "css"] as const) {
  const pendingStage = stage();
  const pending = surface(pendingStage, `pending-${change}`, 20, 30);
  paintOrder = [pending, pendingStage];
  let finishDecode = () => {};
  nextDecode = new Promise<void>((resolve) => {
    finishDecode = resolve;
  });
  const before = renders.length;
  const releasePending = acquireGlass(
    configuration(`pending-${change}`, pendingStage),
  );
  await waitForRender(before + 1);
  if (change === "configuration")
    updateGlassConfiguration(
      configuration(`pending-${change}`, pendingStage, 40),
    );
  else if (change === "theme") {
    document.documentElement.classList.toggle("dark");
    await new Promise((resolve) => setTimeout(resolve, 10));
  } else if (change === "state") {
    pending.removeAttribute("data-glass");
    await new Promise((resolve) => setTimeout(resolve, 10));
    pending.dataset.glass = "true";
    await new Promise((resolve) => setTimeout(resolve, 10));
  } else
    updateGlassConfiguration({
      ...configuration(`pending-${change}`, pendingStage),
      mode: "css",
    });
  const staleUrl = createdUrls.at(-1);
  assert.ok(staleUrl);
  finishDecode();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(
    revokedUrls.includes(staleUrl),
    `${change} rejects and revokes the old frame`,
  );
  assert.equal(pending.style.getPropertyValue("--glass-frame"), "");
  await settle();
  if (change === "css") assert.equal(pending.dataset.glassState, "css");
  else {
    assert.equal(pending.dataset.glassState, "ready");
    if (change === "configuration")
      assert.equal(latestFrame(pending).frame.strength, 40);
  }
  releasePending();
  pendingStage.remove();
}

const movingStage = stage();
const movingSurface = surface(movingStage, "moving-coordinates", 20, 30);
movingSurface.style.position = "absolute";
paintOrder = [movingSurface, movingStage];
const releaseMoving = acquireGlass(
  configuration("moving-coordinates", movingStage),
);
await settle();
const retainedFrame = movingSurface.style.getPropertyValue("--glass-frame");
assert.ok(retainedFrame);
let finishMovingDecode = () => {};
nextDecode = new Promise<void>((resolve) => {
  finishMovingDecode = resolve;
});
const beforeMovingRender = renders.length;
const beforeMovingCapture = captures.length;
updateGlassConfiguration(configuration("moving-coordinates", movingStage, 23));
await waitForRender(beforeMovingRender + 1);
const staleMovingUrl = createdUrls.at(-1);
assert.ok(staleMovingUrl);
let finishFreshDecode = () => {};
nextDecode = new Promise<void>((resolve) => {
  finishFreshDecode = resolve;
});
place(movingSurface, 60, 80, 120, 40);
await new Promise((resolve) => setTimeout(resolve, 10));
finishMovingDecode();
await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(
  movingSurface.style.getPropertyValue("--glass-frame"),
  retainedFrame,
  "moving while a PNG decodes rejects old coordinates without clearing the previous visible frame",
);
assert.ok(revokedUrls.includes(staleMovingUrl));
await waitForRender(beforeMovingRender + 2);
assert.deepEqual(latestFrame(movingSurface).frame.origin, [60, 80]);
assert.equal(latestFrame(movingSurface).frame.width, 120);
assert.equal(latestFrame(movingSurface).frame.height, 40);
assert.equal(
  captures.length,
  beforeMovingCapture,
  "new coordinates reuse the unchanged full-viewport background",
);
finishFreshDecode();
await settle();
assert.equal(movingSurface.dataset.glassState, "ready");
assert.notEqual(
  movingSurface.style.getPropertyValue("--glass-frame"),
  retainedFrame,
);
const beforeGeometryCapture = captures.length;
movingSurface.dataset.glassMotion = "true";
place(movingSurface, 70, 90, 140, 50);
movingSurface.style.left = "70px";
movingSurface.style.top = "90px";
movingSurface.style.width = "140px";
movingSurface.style.height = "50px";
await settle();
assert.deepEqual(latestFrame(movingSurface).frame.origin, [70, 90]);
assert.equal(latestFrame(movingSurface).frame.width, 140);
assert.equal(
  captures.length,
  beforeGeometryCapture,
  "adjacent geometry declarations retain the reusable full-viewport snapshot",
);
movingSurface.dataset.glassMotion = "false";
await settle();
assert.equal(
  captures.length,
  beforeGeometryCapture,
  "GSAP motion lifecycle reuses the captured background",
);
const afterMotionRender = renders.length;
await settle();
assert.equal(
  renders.length,
  afterMotionRender,
  "completed motion stops redraws",
);
const heldBackground = movingSurface.style.getPropertyValue("--glass-frame");
const beforeFrozenRender = renders.length;
movingSurface.dataset.glassFrozen = "true";
updateGlassConfiguration(configuration("moving-coordinates", movingStage, 24));
movingSurface.style.color = "rgb(30, 30, 30)";
await settle();
assert.equal(renders.length, beforeFrozenRender);
assert.equal(movingSurface.dataset.glassState, "ready");
assert.equal(
  movingSurface.style.getPropertyValue("--glass-frame"),
  heldBackground,
  "a held navigation surface keeps its committed background while label colors change",
);
const frozenContent = movingSurface.ownerDocument.createElement("span");
movingSurface.appendChild(frozenContent);
const beforeFrozenCapture = captures.length;
frozenContent.style.transform = "scale(1.2)";
frozenContent.dataset.active = "true";
await settle();
assert.equal(
  captures.length,
  beforeFrozenCapture,
  "held content animation does not invalidate its frozen background",
);
delete movingSurface.dataset.glassFrozen;
await settle();
assert.equal(latestFrame(movingSurface).frame.strength, 24);
const beforeFailedCapture =
  movingSurface.style.getPropertyValue("--glass-frame");
nextCaptureFailure = new Error("Temporary capture failure");
movingStage.style.backgroundColor = "rgb(80, 90, 100)";
await settle();
assert.equal(movingSurface.dataset.glassState, "ready");
assert.equal(
  movingSurface.style.getPropertyValue("--glass-frame"),
  beforeFailedCapture,
  "a failed moving-lens capture retains its decoded frame instead of flashing CSS",
);
window.dispatchEvent(new window.Event("scroll"));
await settle();
assert.notEqual(
  movingSurface.style.getPropertyValue("--glass-frame"),
  beforeFailedCapture,
  "capture resumes normally after a transient failure",
);
releaseMoving();
movingStage.remove();

const samplingStage = stage();
const samplingSurface = surface(samplingStage, "sampling-coordinates", 20, 30);
paintOrder = [samplingSurface, samplingStage];
captureDelay = 80;
const beforeSamplingCapture = captures.length;
const beforeSamplingRender = renders.length;
const releaseSampling = acquireGlass(
  configuration("sampling-coordinates", samplingStage),
);
while (captures.length === beforeSamplingCapture)
  await new Promise((resolve) => setTimeout(resolve, 5));
place(samplingSurface, 80, 90, 120, 40);
await settle();
assert.deepEqual(latestFrame(samplingSurface).frame.origin, [80, 90]);
assert.equal(
  renders.length,
  beforeSamplingRender + 1,
  "a snapshot awaited at obsolete coordinates never reaches rendering",
);
captureDelay = 0;
releaseSampling();
samplingStage.remove();

const themedStage = stage();
const themed = surface(themedStage, "themed", 20, 30);
paintOrder = [themed, themedStage];
const releaseThemed = acquireGlass(configuration("themed", themedStage));
await settle();
const previousThemeUrl = createdUrls.at(-1);
assert.ok(previousThemeUrl);
let finishThemeDecode = () => {};
nextDecode = new Promise<void>((resolve) => {
  finishThemeDecode = resolve;
});
const beforeThemeRender = renders.length;
themed.style.backgroundColor = "rgba(22, 22, 23, 0.5)";
await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(
  themed.dataset.glassState,
  "css",
  "theme changes immediately restore the matching CSS material during async work",
);
assert.equal(themed.style.getPropertyValue("--glass-frame"), "");
assert.ok(revokedUrls.includes(previousThemeUrl));
await waitForRender(beforeThemeRender + 1);
themed.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
await new Promise((resolve) => setTimeout(resolve, 10));
const staleThemeUrl = createdUrls.at(-1);
assert.ok(staleThemeUrl);
finishThemeDecode();
await new Promise((resolve) => setTimeout(resolve, 10));
assert.ok(revokedUrls.includes(staleThemeUrl));
assert.equal(themed.style.getPropertyValue("--glass-frame"), "");
await waitForRenderer(themed, "vgpu");
assert.equal(themed.dataset.glassState, "ready");
releaseThemed();
themedStage.remove();
assert.ok(
  createdUrls.every((url) => revokedUrls.includes(url)),
  "all pending and committed URLs are released after their surface owners unmount",
);

const schedulingLeft = stage();
const schedulingRight = stage();
const scheduledLeft = surface(schedulingLeft, "schedule-left", 20, 30);
const scheduledRight = surface(schedulingRight, "schedule-right", 300, 80);
paintOrder = [scheduledLeft, scheduledRight, schedulingLeft, schedulingRight];
captureDelay = 250;
peakCaptures = 0;
const beforeScheduling = captures.length;
const releaseSchedulingLeft = acquireGlass(
  configuration("schedule-left", schedulingLeft),
);
const releaseSchedulingRight = acquireGlass(
  configuration("schedule-right", schedulingRight),
);
await new Promise((resolve) => setTimeout(resolve, 750));
assert.equal(
  captures.length,
  beforeScheduling + 2,
  "different targets both capture their initial background",
);
assert.equal(
  peakCaptures,
  1,
  "even a screenshot slower than the sampling interval never overlaps another scope's screenshot",
);
captureDelay = 25;
async function pulse(type: "input" | "scroll", minimumGap: number) {
  const before = captures.length;
  const end = performance.now() + 650;
  while (performance.now() < end) {
    if (type === "scroll") window.dispatchEvent(new window.Event(type));
    else document.dispatchEvent(new window.Event(type, { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  const starts = captures.slice(before).map(({ started }) => started);
  assert.ok(
    starts.length >= 3,
    `${type} produces multiple real scheduled snapshots`,
  );
  for (let index = 1; index < starts.length; index++)
    assert.ok(
      starts[index] - starts[index - 1] >= minimumGap,
      `${type} snapshot starts remain globally limited across different targets: ${starts[index] - starts[index - 1]}ms`,
    );
  assert.equal(peakCaptures, 1);
}
await pulse("input", 195);
await pulse("scroll", 95);
let documentHidden = true;
Object.defineProperty(document, "hidden", {
  configurable: true,
  get: () => documentHidden,
});
document.dispatchEvent(new window.Event("visibilitychange"));
await new Promise((resolve) => setTimeout(resolve, 100));
const beforeHidden = captures.length;
document.dispatchEvent(new window.Event("input", { bubbles: true }));
window.dispatchEvent(new window.Event("scroll"));
await new Promise((resolve) => setTimeout(resolve, 250));
assert.equal(
  captures.length,
  beforeHidden,
  "previously active surfaces stop taking screenshots while the document is hidden",
);
documentHidden = false;
document.dispatchEvent(new window.Event("visibilitychange"));
await new Promise((resolve) => setTimeout(resolve, 300));
assert.ok(
  captures.length > beforeHidden,
  "visible scopes resume their invalidated scene",
);
releaseSchedulingLeft();
releaseSchedulingRight();
schedulingLeft.remove();
schedulingRight.remove();
const afterSchedulingRelease = captures.length;
document.dispatchEvent(new window.Event("input", { bubbles: true }));
window.dispatchEvent(new window.Event("scroll"));
await new Promise((resolve) => setTimeout(resolve, 250));
assert.equal(captures.length, afterSchedulingRelease);
assert.equal(activeCaptures, 0);
assert.equal(fontLeases, 0);
const cssOnlyStage = stage();
const cssOnlySurface = surface(cssOnlyStage, "css-only", 20, 30);
paintOrder = [cssOnlySurface, cssOnlyStage];
const releaseCssOnly = acquireGlass({
  id: "css-only",
  mode: "css",
  captureTarget: cssOnlyStage,
});
await settle();
assert.equal(
  fontLeases,
  0,
  "CSS-only scopes never acquire capture font resources",
);
const portalStage = stage();
const portalSurface = surface(portalStage, "css-only", 450, 250);
paintOrder = [portalSurface, cssOnlySurface, portalStage, cssOnlyStage];
await settle();
assert.equal(
  portalSurface.dataset.glassState,
  "css",
  "a newly mounted Portal outside a scoped capture target still inherits glass",
);
portalStage.remove();
releaseCssOnly();
cssOnlyStage.remove();
assert.equal(
  textReads.mock.calls.length,
  0,
  "disabled contrast avoids descendant style and color reads",
);
const mediaStage = stage();
mediaStage.dataset.glassCapture = "media";
const backdropVideo = document.createElement("video");
backdropVideo.setAttribute("data-glass-backdrop", "");
const mediaCallbacks = new Map<number, () => void>();
let nextMediaCallback = 0;
Object.defineProperties(backdropVideo, {
  requestVideoFrameCallback: {
    value: (callback: () => void) => {
      const handle = ++nextMediaCallback;
      mediaCallbacks.set(handle, callback);
      return handle;
    },
  },
  cancelVideoFrameCallback: {
    value: (handle: number) => mediaCallbacks.delete(handle),
  },
});
mediaStage.append(backdropVideo as unknown as Node);
place(backdropVideo as unknown as HTMLElement, 0, 0, 800, 600);
const offscopeVideo = document.createElement("video");
offscopeVideo.setAttribute("data-glass-backdrop", "");
document.body.append(offscopeVideo);
const mediaLeft = surface(mediaStage, "media-left", 20, 30);
const mediaRight = surface(mediaStage, "media-right", 300, 80);
const mediaOverlay = document.createElement("div") as unknown as HTMLElement;
mediaOverlay.style.position = "absolute";
mediaOverlay.style.zIndex = "20";
mediaOverlay.style.backgroundColor = "#ff0000";
mediaStage.append(mediaOverlay);
place(mediaOverlay, 25, 35, 10, 10);
paintOrder = [
  mediaOverlay,
  mediaLeft,
  mediaRight,
  backdropVideo as unknown as HTMLElement,
  mediaStage,
];
const mediaInitialCaptures = captures.length;
const releaseMediaLeft = acquireGlass(configuration("media-left", mediaStage));
const releaseMediaRight = acquireGlass(
  configuration("media-right", mediaStage),
);
await settle();
assert.equal(
  captures.length,
  mediaInitialCaptures + 1,
  "media scopes with different overlay masks share initial capture",
);
assert.equal(latestFrame(mediaLeft).source, latestFrame(mediaRight).source);
const beforeMediaMaterial = materialReads;
const mediaFrameCaptures = captures.length;
const mediaFrameRenders = renders.length;
assert.equal(backdropVideo.paused, true);
Object.defineProperty(backdropVideo, "paused", {
  value: false,
  configurable: true,
});
const previousMediaFrame = mediaLeft.style.getPropertyValue("--glass-frame");
assert.ok(previousMediaFrame);
let finishMediaDecode = () => {};
nextDecode = new Promise<void>((resolve) => {
  finishMediaDecode = resolve;
});
backdropVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
await waitForRender(mediaFrameRenders + 1);
assert.equal(
  mediaLeft.style.getPropertyValue("--glass-frame"),
  previousMediaFrame,
);
backdropVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
finishMediaDecode();
await new Promise((resolve) => setTimeout(resolve, 10));
assert.notEqual(
  mediaLeft.style.getPropertyValue("--glass-frame"),
  previousMediaFrame,
  "a newer background event cannot discard an already decoded frame with valid geometry",
);
await settle();
assert.equal(
  captures.length,
  mediaFrameCaptures + 2,
  "both media scopes share each changed background capture",
);
assert.equal(
  renders.length,
  mediaFrameRenders + 4,
  "both peers commit the in-flight and latest background batches",
);
assert.equal(
  renders[mediaFrameRenders]?.source,
  renders[mediaFrameRenders + 1]?.source,
);
assert.equal(
  renders[mediaFrameRenders + 2]?.source,
  renders[mediaFrameRenders + 3]?.source,
);
assert.equal(
  materialReads,
  beforeMediaMaterial,
  "media frames do not recompute native paint",
);
assert.equal(
  mediaCallbacks.size,
  2,
  "each GPU owner follows presented video frames",
);
const batchRenderStart = renders.length;
const batchCaptureStart = captures.length;
const beforeNativeMedia = {
  captures: captures.length,
  material: materialReads,
};
let finishBatchDecode = () => {};
nextDecode = new Promise<void>((resolve) => {
  finishBatchDecode = resolve;
});
for (const [handle, callback] of [...mediaCallbacks]) {
  mediaCallbacks.delete(handle);
  callback();
}
await waitForRender(batchRenderStart + 1);
for (const [handle, callback] of [...mediaCallbacks]) {
  mediaCallbacks.delete(handle);
  callback();
}
finishBatchDecode();
await settle();
assert.equal(
  renders[batchRenderStart]?.source,
  renders[batchRenderStart + 1]?.source,
  "a video tick during decode preserves the current batch's shared bitmap",
);
assert.equal(captures.length, batchCaptureStart + 2);
assert.notEqual(
  renders[batchRenderStart + 2]?.source,
  renders[batchRenderStart]?.source,
  "the next queued batch must sample a fresh video frame",
);
assert.equal(
  renders[batchRenderStart + 2]?.source,
  renders[batchRenderStart + 3]?.source,
  "the refreshed batch also shares one bitmap",
);
assert.equal(captures.length, beforeNativeMedia.captures + 2);
assert.equal(materialReads, beforeNativeMedia.material);
assert.equal(mediaCallbacks.size, 2, "native frame requests remain bounded");
offscopeVideo.dispatchEvent(new window.Event("pause", { bubbles: false }));
assert.equal(
  mediaCallbacks.size,
  2,
  "unrelated video pause leaves requests intact",
);
Object.defineProperty(backdropVideo, "paused", { value: true });
backdropVideo.dispatchEvent(new window.Event("pause", { bubbles: false }));
assert.equal(mediaCallbacks.size, 0, "pausing cancels native video requests");
Object.defineProperty(backdropVideo, "paused", { value: false });
backdropVideo.dispatchEvent(new window.Event("play", { bubbles: false }));
refreshGlass("media-left");
await settle();
assert.ok(
  materialReads > beforeMediaMaterial,
  "public refresh still refreshes material",
);
assert.equal(
  mediaCallbacks.size,
  2,
  "play resumes bounded native video requests",
);
const ignoredMediaMaterials = materialReads;
const ignoredMediaCaptures = captures.length;
backdropVideo.setAttribute("data-glass-exclude", "");
backdropVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
offscopeVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
await settle();
assert.equal(
  captures.length,
  ignoredMediaCaptures,
  "excluded and off-scope video cannot refresh",
);
assert.equal(materialReads, ignoredMediaMaterials);
releaseMediaLeft();
releaseMediaRight();
assert.equal(
  mediaCallbacks.size,
  0,
  "unmount cancels all pending video frames",
);
backdropVideo.remove();
const beforeMissingMedia = captures.length;
const releaseMissingMediaLeft = acquireGlass(
  configuration("media-left", mediaStage),
);
const releaseMissingMediaRight = acquireGlass(
  configuration("media-right", mediaStage),
);
await settle();
assert.equal(
  captures.length,
  beforeMissingMedia + 1,
  "out-of-footprint paint produces compatible DOM masks even without marked media",
);
assert.equal(latestFrame(mediaLeft).source, latestFrame(mediaRight).source);
releaseMissingMediaLeft();
releaseMissingMediaRight();
mediaStage.prepend(backdropVideo as unknown as Node);
backdropVideo.removeAttribute("data-glass-exclude");
mediaLeft.dataset.glassScope = "media-css";
const releaseMediaCss = acquireGlass({
  id: "media-css",
  mode: "css",
  captureTarget: mediaStage,
});
const regularStage = stage();
const regularVideo = document.createElement("video");
regularVideo.setAttribute("data-glass-backdrop", "");
regularStage.append(regularVideo as unknown as Node);
const regularSurface = surface(regularStage, "media-unmarked", 450, 30);
const emptyMediaStage = stage();
emptyMediaStage.dataset.glassCapture = "media";
const emptyVideo = document.createElement("video");
emptyVideo.setAttribute("data-glass-backdrop", "");
emptyMediaStage.append(emptyVideo as unknown as Node);
paintOrder = [mediaLeft, mediaRight, regularSurface, mediaStage, regularStage];
const releaseUnmarked = acquireGlass(
  configuration("media-unmarked", regularStage),
);
const releaseEmpty = acquireGlass(
  configuration("media-empty", emptyMediaStage),
);
await settle();
const excludedTargetCaptures = captures.length;
backdropVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
regularVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
emptyVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
await settle();
assert.equal(
  captures.length,
  excludedTargetCaptures,
  "CSS, unmarked target and no-Glass scopes do not capture media events",
);
releaseMediaCss();
releaseUnmarked();
releaseEmpty();
const mediaReleasedCaptures = captures.length;
backdropVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
regularVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
await settle();
assert.equal(
  captures.length,
  mediaReleasedCaptures,
  "released scopes remove media listeners",
);
assert.equal(fontLeases, 0);
mediaStage.remove();
regularStage.remove();
emptyMediaStage.remove();
offscopeVideo.remove();
const toolbarStage = stage();
toolbarStage.dataset.glassCapture = "media";
const toolbarVideo = document.createElement("video");
toolbarVideo.setAttribute("data-glass-backdrop", "");
toolbarStage.append(toolbarVideo as unknown as Node);
place(toolbarVideo as unknown as HTMLElement, 0, 0, 800, 600);
const ordinaryToolbar = document.createElement("div") as unknown as HTMLElement;
ordinaryToolbar.style.backgroundColor = "rgb(34, 51, 68)";
toolbarStage.append(ordinaryToolbar);
place(ordinaryToolbar, 20, 30, 160, 60);
const transparentToolbar = document.createElement(
  "div",
) as unknown as HTMLElement;
transparentToolbar.style.backgroundColor = "rgba(0, 0, 0, 0)";
toolbarStage.append(transparentToolbar);
place(transparentToolbar, 280, 30, 160, 60);
const toolbarAction = surface(
  ordinaryToolbar,
  "ordinary-toolbar-action",
  30,
  40,
);
const transparentAction = surface(
  transparentToolbar,
  "transparent-toolbar-action",
  290,
  40,
);
const transparentPeer = surface(
  toolbarStage,
  "transparent-toolbar-peer",
  520,
  40,
);
paintOrder = [
  toolbarAction,
  transparentAction,
  transparentPeer,
  ordinaryToolbar,
  transparentToolbar,
  toolbarVideo as unknown as HTMLElement,
  toolbarStage,
];
const beforeToolbarCaptures = captures.length;
const releaseToolbarAction = acquireGlass(
  configuration("ordinary-toolbar-action", toolbarStage),
);
const releaseTransparentAction = acquireGlass(
  configuration("transparent-toolbar-action", toolbarStage),
);
const releaseTransparentPeer = acquireGlass(
  configuration("transparent-toolbar-peer", toolbarStage),
);
await settle();
const toolbarCaptures = captures.slice(beforeToolbarCaptures);
assert.equal(
  toolbarCaptures.length,
  2,
  "ordinary-painted ancestry needs one DOM composite while compatible transparent siblings retain one shared media capture",
);
const ordinaryCapture = toolbarCaptures.find(
  ({ snapshot }) => snapshot === latestFrame(toolbarAction).source,
);
const transparentCapture = toolbarCaptures.find(
  ({ snapshot }) => snapshot === latestFrame(transparentAction).source,
);
assert.ok(ordinaryCapture);
assert.ok(transparentCapture);
assert.equal(
  ordinaryCapture.mediaOnly,
  false,
  "a Glass control over an ordinary colored toolbar captures that painted ancestor",
);
assert.equal(
  transparentCapture.mediaOnly,
  true,
  "a transparent toolbar preserves direct media sampling",
);
assert.equal(
  latestFrame(transparentAction).source,
  latestFrame(transparentPeer).source,
  "compatible direct-media siblings still share their snapshot",
);
assert.notEqual(
  latestFrame(toolbarAction).source,
  latestFrame(transparentAction).source,
  "DOM-backed and media-only sampling cannot reuse each other's snapshot",
);
assert.equal(
  ordinaryCapture.blocked.has(ordinaryToolbar),
  false,
  "the ordinary ancestor is retained as backdrop rather than filtered with its Glass child",
);
assert.equal(
  ordinaryCapture.blocked.has(toolbarAction),
  true,
  "the requesting Glass control remains absent from its own DOM overlay",
);
assert.deepEqual(latestFrame(toolbarAction).frame.origin, [30, 40]);
assert.deepEqual(latestFrame(transparentAction).frame.origin, [290, 40]);
releaseToolbarAction();
releaseTransparentAction();
releaseTransparentPeer();
toolbarStage.remove();

const ordinarySiblingStage = stage();
ordinarySiblingStage.dataset.glassCapture = "media";
const ordinarySiblingVideo = document.createElement("video");
ordinarySiblingVideo.setAttribute("data-glass-backdrop", "");
ordinarySiblingVideo.style.cssText =
  "position:absolute;z-index:0;object-fit:cover";
ordinarySiblingStage.append(ordinarySiblingVideo as unknown as Node);
place(ordinarySiblingVideo as unknown as HTMLElement, 0, 0, 800, 600);
const siblingPaint = document.createElement("div") as unknown as HTMLElement;
siblingPaint.style.cssText =
  "position:absolute;z-index:1;background-color:rgb(34,51,68);pointer-events:none";
ordinarySiblingStage.append(siblingPaint);
place(siblingPaint, 20, 30, 160, 60);
const siblingAbove = document.createElement("div") as unknown as HTMLElement;
siblingAbove.style.cssText =
  "position:absolute;z-index:3;background-color:rgb(244,66,77);pointer-events:none";
ordinarySiblingStage.append(siblingAbove);
place(siblingAbove, 40, 45, 60, 20);
const behindSiblingVideo = document.createElement(
  "div",
) as unknown as HTMLElement;
behindSiblingVideo.style.cssText =
  "position:absolute;z-index:-1;background-color:rgb(233,210,170)";
ordinarySiblingStage.append(behindSiblingVideo);
place(behindSiblingVideo, 330, 20, 360, 100);
const distantShadow = document.createElement("div") as unknown as HTMLElement;
distantShadow.style.cssText =
  "position:absolute;z-index:1;background:#223344;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);transform:matrix(1, 0, 0, 1, 0, 0)";
ordinarySiblingStage.append(distantShadow);
place(distantShadow, -1983, -1983, 312, 360);
const siblingSurface = surface(
  ordinarySiblingStage,
  "ordinary-sibling-surface",
  30,
  40,
);
const siblingPeerA = surface(
  ordinarySiblingStage,
  "ordinary-sibling-peer-a",
  350,
  40,
);
const siblingPeerB = surface(
  ordinarySiblingStage,
  "ordinary-sibling-peer-b",
  550,
  40,
);
for (const element of [siblingSurface, siblingPeerA, siblingPeerB]) {
  element.style.position = "relative";
  element.style.zIndex = "2";
}
// This stack is deliberately not DOM insertion order; pointer-free ordinary
// paint is absent from hit testing and must use its real CSS painting phase.
paintOrder = [
  siblingAbove,
  siblingSurface,
  siblingPeerA,
  siblingPeerB,
  siblingPaint,
  ordinarySiblingVideo as unknown as HTMLElement,
  behindSiblingVideo,
  ordinarySiblingStage,
];
const beforeSiblingCaptures = captures.length;
const releaseSiblingSurface = acquireGlass(
  configuration("ordinary-sibling-surface", ordinarySiblingStage),
);
const releaseSiblingPeerA = acquireGlass(
  configuration("ordinary-sibling-peer-a", ordinarySiblingStage),
);
const releaseSiblingPeerB = acquireGlass(
  configuration("ordinary-sibling-peer-b", ordinarySiblingStage),
);
await settle();
for (const element of [siblingSurface, siblingPeerA, siblingPeerB]) {
  assert.equal(element.dataset.glassRenderer, "vgpu");
  assert.equal(element.dataset.glassState, "ready");
}
const ordinarySiblingCaptures = captures.slice(beforeSiblingCaptures);
assert.equal(
  ordinarySiblingCaptures.length,
  2,
  "a painted ordinary sibling needs one DOM composite while pure-media peers keep one shared capture",
);
const ordinarySiblingCapture = ordinarySiblingCaptures.find(
  ({ snapshot }) => snapshot === latestFrame(siblingSurface).source,
);
const pureSiblingCapture = ordinarySiblingCaptures.find(
  ({ snapshot }) => snapshot === latestFrame(siblingPeerA).source,
);
assert.ok(ordinarySiblingCapture);
assert.ok(pureSiblingCapture);
assert.equal(
  ordinarySiblingCapture.mediaOnly,
  false,
  "ordinary paint between positioned media and Glass must enter its backdrop despite pointer-events:none",
);
assert.equal(
  ordinarySiblingCapture.blocked.has(siblingPaint),
  false,
  "the ordinary lower sibling is retained",
);
assert.equal(
  ordinarySiblingCapture.blocked.has(siblingAbove),
  true,
  "a pointer-free higher ordinary occluder is excluded by its precise CSS z phase",
);
assert.equal(ordinarySiblingCapture.blocked.has(siblingSurface), true);
assert.equal(ordinarySiblingCapture.blocked.has(siblingPeerA), true);
assert.equal(
  ordinarySiblingCapture.blocked.has(siblingPeerB),
  true,
  "same-plane Glass exclusions remain compatible with ordinary-paint sampling",
);
assert.equal(
  pureSiblingCapture.mediaOnly,
  true,
  "ordinary background below the positioned video cannot pollute direct-media sampling",
);
assert.equal(pureSiblingCapture.blocked.size, 0);
assert.equal(
  latestFrame(siblingPeerA).source,
  latestFrame(siblingPeerB).source,
  "pure-media peers remain compatible even while a neighboring surface retains ordinary paint",
);
assert.notEqual(
  latestFrame(siblingSurface).source,
  latestFrame(siblingPeerA).source,
);
const initialOrdinarySiblingSnapshot = latestFrame(siblingSurface).source;
const beforeSiblingPaintChange = captures.length;
siblingPaint.style.backgroundColor = "rgb(80,110,140)";
await settle();
assert.notEqual(
  latestFrame(siblingSurface).source,
  initialOrdinarySiblingSnapshot,
  "changing retained ordinary paint refreshes the sampled backdrop",
);
const changedSiblingCapture = captures
  .slice(beforeSiblingPaintChange)
  .find(({ snapshot }) => snapshot === latestFrame(siblingSurface).source);
assert.ok(changedSiblingCapture);
assert.equal(changedSiblingCapture.mediaOnly, false);
assert.equal(changedSiblingCapture.blocked.has(siblingPaint), false);
assert.equal(
  changedSiblingCapture.blocked.has(siblingAbove),
  true,
  "ordinary updates preserve the lower/higher paint mask",
);
assert.equal(
  latestFrame(siblingPeerA).source,
  latestFrame(siblingPeerB).source,
);
releaseSiblingSurface();
releaseSiblingPeerA();
releaseSiblingPeerB();
ordinarySiblingStage.remove();

svgAvailable = true;
const transientStage = stage();
const transientSurface = surface(transientStage, "transient-capture", 30, 40);
paintOrder = [transientSurface, transientStage];
const transientCreations = rendererCreations;
nextCaptureFailure = new Error("Glass background capture still active");
const releaseTransient = acquireGlass(
  configuration("transient-capture", transientStage),
);
await waitForRenderer(transientSurface, "svg");
assert.equal(transientSurface.dataset.glassState, "ready");
assert.equal(transientSurface.style.getPropertyValue("--glass-frame"), "");
assert.match(
  transientSurface.style.getPropertyValue("--glass-filter"),
  /^url\(/,
);
refreshGlass("transient-capture");
await waitForRenderer(transientSurface, "vgpu");
assert.equal(rendererCreations, transientCreations + 1);
assert.ok(transientSurface.style.getPropertyValue("--glass-frame"));
releaseTransient();
assert.equal(transientSurface.style.getPropertyValue("--glass-frame"), "");
assert.equal(transientSurface.style.getPropertyValue("--glass-filter"), "");
transientStage.remove();

svgAvailable = true;
const scopedStage = stage();
scopedStage.dataset.glassCapture = "media";
const scopedVideo = document.createElement("video") as unknown as HTMLElement;
scopedVideo.setAttribute("data-glass-backdrop", "");
scopedVideo.style.cssText = "position:absolute;z-index:0;object-fit:cover";
scopedStage.append(scopedVideo);
place(scopedVideo, 0, 0, 800, 600);
const scopedPaint = document.createElement("div") as unknown as HTMLElement;
scopedPaint.style.cssText = "position:absolute;z-index:1;background:#223344";
scopedStage.append(scopedPaint);
place(scopedPaint, 20, 30, 160, 80);
const outsideImage = document.createElement("img") as unknown as HTMLElement;
scopedStage.append(outsideImage);
place(outsideImage, 600, 30, 64, 64);
const outsideShadow = document.createElement("div") as unknown as HTMLElement;
outsideShadow.style.cssText =
  "position:absolute;z-index:1;box-shadow:-570px 0 0 blue";
scopedStage.append(outsideShadow);
place(outsideShadow, 600, 30, 64, 64);
const aboveShadow = document.createElement("div") as unknown as HTMLElement;
aboveShadow.style.cssText =
  "position:absolute;z-index:3;box-shadow:630px 0 0 red";
scopedStage.append(aboveShadow);
place(aboveShadow, -600, 30, 64, 64);
const scopedSurface = surface(scopedStage, "scoped-resource", 30, 40);
const scopedPeer = surface(scopedStage, "scoped-peer", 350, 40);
for (const element of [scopedSurface, scopedPeer]) {
  element.style.position = "relative";
  element.style.zIndex = "2";
}
paintOrder = [
  scopedSurface,
  scopedPeer,
  scopedPaint,
  outsideShadow,
  aboveShadow,
  outsideImage,
  scopedVideo,
  scopedStage,
];
const releaseScoped = acquireGlass(
  configuration("scoped-resource", scopedStage),
);
const releaseScopedPeer = acquireGlass(
  configuration("scoped-peer", scopedStage),
);
await waitForRenderer(scopedSurface, "vgpu");
await waitForRenderer(scopedPeer, "vgpu");
const scopedCapture = captures.find(
  ({ snapshot }) => snapshot === latestFrame(scopedSurface).source,
);
assert.ok(scopedCapture);
assert.equal(
  scopedCapture.blocked.has(outsideImage),
  true,
  "a resource outside the optical footprint is excluded before embedding",
);
assert.equal(scopedCapture.blocked.has(scopedPaint), false);
assert.equal(scopedCapture.mediaOnly, false);
assert.equal(
  scopedCapture.blocked.has(outsideShadow),
  false,
  "ordinary shadow paint is retained even when its border box misses the optical footprint",
);
assert.equal(
  scopedCapture.blocked.has(aboveShadow),
  true,
  "shadow paint from an offscreen owner above the surface is excluded using its paint order",
);
assert.equal(scopedSurface.dataset.glassRenderer, "vgpu");
assert.equal(scopedPeer.dataset.glassRenderer, "vgpu");
const originalScopedUrl = scopedSurface.style.getPropertyValue("--glass-frame");
nextCaptureFailure = new GlassResourceError(
  "Glass background image embedding failed",
);
nextCaptureFailureMediaOnly = false;
refreshGlass("scoped-resource");
await waitForRenderer(scopedSurface, "svg");
assert.equal(
  scopedSurface.dataset.glassRenderer,
  "svg",
  "unreadable retained resources use the local native chain",
);
assert.equal(
  scopedSurface.style.getPropertyValue("--glass-frame"),
  "",
  "native fallback removes its stale GPU frame",
);
assert.ok(originalScopedUrl);
assert.equal(
  scopedPeer.dataset.glassRenderer,
  "vgpu",
  "an independent peer keeps the healthy GPU backend",
);
const beforeUnsupportedRetry = captures.length;
updateGlassConfiguration(configuration("scoped-resource", scopedStage, 35));
await settle();
assert.equal(
  captures.length,
  beforeUnsupportedRetry,
  "material-only changes do not re-embed the same unsupported background",
);
assert.equal(scopedSurface.dataset.glassRenderer, "svg");
const retainedNativeFilter =
  scopedSurface.style.getPropertyValue("--glass-filter");
nextCaptureFailure = new Error("Temporary DOM capture failure");
nextCaptureFailureMediaOnly = false;
refreshGlass("scoped-resource");
const nativeRetryDeadline = performance.now() + 2000;
while (nextCaptureFailure && performance.now() < nativeRetryDeadline)
  await new Promise((resolve) => setTimeout(resolve, 10));
await settle();
assert.equal(nextCaptureFailure, undefined);
assert.equal(
  scopedSurface.dataset.glassState,
  "ready",
  "a transient retry keeps its existing native backdrop ready",
);
assert.equal(
  scopedSurface.style.getPropertyValue("--glass-filter"),
  retainedNativeFilter,
);
refreshGlass("scoped-resource");
await waitForRenderer(scopedSurface, "vgpu");
assert.equal(
  scopedSurface.dataset.glassRenderer,
  "vgpu",
  "refresh retries capabilities through the existing snapshot invalidation",
);
assert.equal(scopedPeer.dataset.glassRenderer, "vgpu");
releaseScoped();
releaseScopedPeer();
scopedStage.remove();
svgAvailable = false;

internalDefaults.minimumContrast = 4.5;
const textStage = stage();
const textSurface = surface(textStage, "text-contrast", 20, 30);
textSurface.style.color = "rgb(20, 20, 20)";
textSurface.innerHTML =
  '<p data-test-muted style="color:rgb(90,90,90)">Actual muted description</p><div style="background-color:rgb(230,230,230)"><span style="color:rgb(240,0,0)">Separate background</span></div>';
paintOrder = [textSurface, textStage];
const releaseText = acquireGlass(configuration("text-contrast", textStage));
await settle();
const firstTextColors = latestFrame(textSurface).frame.textColors;
assert.deepEqual(firstTextColors, [[90 / 255, 90 / 255, 90 / 255, 1]]);
window.dispatchEvent(new window.Event("scroll"));
await settle();
assert.equal(
  latestFrame(textSurface).frame.textColors,
  firstTextColors,
  "scrolling reuses the cached actual text color list",
);
const textTheme = document.createElement("style");
textTheme.textContent =
  '[data-color="contrast-test"] [data-test-muted] { color:rgb(180,180,180) !important; }';
document.head.append(textTheme);
const previousColor = document.documentElement.getAttribute("data-color");
document.documentElement.setAttribute("data-color", "contrast-test");
await settle();
assert.deepEqual(
  latestFrame(textSurface).frame.textColors,
  [[180 / 255, 180 / 255, 180 / 255, 1]],
  "theme mutations update child constraints passed to the GPU",
);
document.documentElement.removeAttribute("data-color");
textTheme.remove();
textSurface.querySelector("p")?.setAttribute("style", "color:rgb(120,120,120)");
await settle();
assert.deepEqual(
  latestFrame(textSurface).frame.textColors,
  [[120 / 255, 120 / 255, 120 / 255, 1]],
  "descendant style mutations invalidate actual text constraints",
);
releaseText();
textStage.remove();
if (previousColor !== null)
  document.documentElement.setAttribute("data-color", previousColor);
internalDefaults.minimumContrast = 4.5;
const isolatedStage = stage();
const goodSurface = surface(isolatedStage, "contrast-isolation", 20, 30);
const badSurface = surface(isolatedStage, "contrast-isolation", 300, 80);
goodSurface.innerHTML = '<p style="color:rgb(40,40,40)">Readable text</p>';
badSurface.innerHTML =
  '<p style="color:rgb(255,255,255)">Initially supported</p>';
paintOrder = [goodSurface, badSurface, isolatedStage];
const releaseIsolation = acquireGlass(
  configuration("contrast-isolation", isolatedStage),
);
await settle();
assert.equal(goodSurface.dataset.glassState, "ready");
assert.equal(badSurface.dataset.glassState, "ready");
const oldBadFrame = badSurface.style.getPropertyValue("--glass-frame");
const oldBadUrl = createdUrls.find((url) => oldBadFrame.includes(url));
assert.ok(oldBadUrl);
const beforeFailureUrls = createdUrls.length;
const beforeContrastFailures = contrastFailures.length;
badSurface.innerHTML =
  '<span style="color:rgb(0,102,204)">Unbacked blue</span><span style="color:rgb(255,255,255)">Unbacked white</span>';
await settle();
assert.ok(contrastFailures.length > beforeContrastFailures);
assert.equal(
  badSurface.dataset.glassState,
  "fallback",
  "a conflicting text palette falls back only its own surface",
);
assert.equal(badSurface.style.getPropertyValue("--glass-frame"), "");
assert.ok(
  revokedUrls.includes(oldBadUrl),
  "local fallback releases its previous frame URL",
);
assert.equal(goodSurface.dataset.glassState, "ready");
assert.ok(goodSurface.style.getPropertyValue("--glass-frame"));
assert.equal(
  createdUrls.length - beforeFailureUrls,
  1,
  "the failed render allocates no URL while its peer commits one new frame",
);
badSurface.innerHTML = '<p style="color:rgb(70,70,70)">Corrected text</p>';
await settle();
assert.equal(
  badSurface.dataset.glassState,
  "ready",
  "a corrected surface can recover enhancement",
);
assert.ok(badSurface.style.getPropertyValue("--glass-frame"));
assert.equal(goodSurface.dataset.glassState, "ready");
nextRenderFailure = new Error("GPU device failure");
document.dispatchEvent(new window.Event("input", { bubbles: true }));
await settle();
assert.equal(goodSurface.dataset.glassState, "fallback");
assert.equal(
  badSurface.dataset.glassState,
  "fallback",
  "system rendering failures still fall back the whole provider",
);
assert.equal(goodSurface.style.getPropertyValue("--glass-frame"), "");
assert.equal(badSurface.style.getPropertyValue("--glass-frame"), "");
releaseIsolation();
isolatedStage.remove();
assert.ok(
  createdUrls.every((url) => revokedUrls.includes(url)),
  "scheduled frames release every committed URL when the last scopes unmount",
);
svgAvailable = true;
internalDefaults.minimumContrast = 0;
const nativeStage = stage();
place(nativeStage, 0, 150, 800, 450);
nativeStage.dataset.glassCapture = "media";
const nativeVideo = document.createElement("video");
nativeVideo.setAttribute("data-glass-backdrop", "");
nativeStage.append(nativeVideo as unknown as Node);
const nativeSurface = surface(nativeStage, "native-svg", 20, 200);
const nativePortal = surface(
  document.body as unknown as HTMLElement,
  "native-svg",
  300,
  140,
);
nativePortal.style.setProperty(
  "--glass-filter",
  'url("#caller-filter")',
  "important",
);
const nativeRegular = surface(nativeStage, "native-regular", 600, 200);
nativeRegular.style.backgroundColor = "transparent";
paintOrder = [nativePortal, nativeSurface, nativeRegular, nativeStage];
const nativeWorkBefore = {
  captures: captures.length,
  fonts: fontAcquisitions,
  decodes: frameDecodes,
  urls: createdUrls.length,
  devices: rendererCreations,
};
const releaseNative = acquireGlass({
  id: "native-svg",
  mode: "svg",
  captureTarget: nativeStage,
});
const releaseNativeRegular = acquireGlass({
  id: "native-regular",
  mode: "auto",
  material: "regular",
  captureTarget: nativeStage,
});
await settle();
for (const element of [nativeSurface, nativePortal, nativeRegular]) {
  assert.equal(element.dataset.glassState, "ready");
  assert.equal(element.dataset.glassRenderer, "svg");
  assert.match(element.style.getPropertyValue("--glass-filter"), /^url\(/);
  assert.equal(element.style.getPropertyValue("--glass-frame"), "");
}
assert.equal(nativeRegular.style.getPropertyValue("--glass-opacity"), "35%");
assert.deepEqual(
  {
    captures: captures.length,
    fonts: fontAcquisitions,
    decodes: frameDecodes,
    urls: createdUrls.length,
    devices: rendererCreations,
  },
  nativeWorkBefore,
  "SVG and Regular Auto portals install filters without background sampling, fonts, frame decoding, URLs or GPU initialization",
);
const nativeFilter = nativeSurface.style.getPropertyValue("--glass-filter");
const nativeMaterialBefore = materialReads;
nativeVideo.dispatchEvent(new window.Event("timeupdate", { bubbles: false }));
await settle();
assert.equal(captures.length, nativeWorkBefore.captures);
assert.equal(fontAcquisitions, nativeWorkBefore.fonts);
assert.equal(frameDecodes, nativeWorkBefore.decodes);
assert.equal(
  materialReads,
  nativeMaterialBefore,
  "native video playback does not recompute SVG material",
);
assert.equal(
  nativeSurface.style.getPropertyValue("--glass-filter"),
  nativeFilter,
);
updateGlassConfiguration({
  id: "native-svg",
  mode: "svg",
  captureTarget: nativeStage,
  options: { strength: 34 },
});
await settle();
assert.equal(
  [...svgFilters].reverse().find(({ element }) => element === nativeSurface)
    ?.geometry.strength,
  34,
);
assert.equal(
  nativeSurface.style.getPropertyValue("--glass-filter"),
  nativeFilter,
  "geometry updates retain the native filter reference",
);
assert.equal(captures.length, nativeWorkBefore.captures);
assert.equal(frameDecodes, nativeWorkBefore.decodes);
updateGlassConfiguration({
  id: "native-svg",
  mode: "css",
  captureTarget: nativeStage,
});
assert.equal(nativeSurface.style.getPropertyValue("--glass-filter"), "");
assert.equal(nativePortal.style.getPropertyValue("--glass-filter"), "");
assert.ok(svgReleases.includes(nativeSurface));
assert.ok(svgReleases.includes(nativePortal));
releaseNative();
releaseNativeRegular();
assert.equal(
  nativePortal.style.getPropertyValue("--glass-filter"),
  'url("#caller-filter")',
);
assert.equal(
  nativePortal.style.getPropertyPriority("--glass-filter"),
  "important",
);
assert.equal(activeSvgFilters.size, 0);
nativePortal.remove();
nativeStage.remove();

const mixedStage = stage();
mixedStage.dataset.glassCapture = "media";
const mixedVideo = document.createElement("video");
mixedVideo.setAttribute("data-glass-backdrop", "");
mixedStage.append(mixedVideo as unknown as Node);
place(mixedVideo as unknown as HTMLElement, 0, 0, 800, 600);
const mixedLower = surface(mixedStage, "mixed-native-lower", 100, 100, 180, 80);
const mixedUpper = surface(mixedStage, "mixed-auto-upper", 110, 110, 180, 80);
const mixedPeer = surface(mixedStage, "mixed-auto-peer", 500, 300);
mixedLower.style.position = "relative";
mixedLower.style.zIndex = "1";
mixedUpper.style.position = "relative";
mixedUpper.style.zIndex = "2";
mixedLower.dataset.testMixedLower = "";
const mixedPaintStyle = document.createElement("style");
// The fixture does not load Glass CSS. Supply only the lower surface's real
// computed-backdrop transitions; keep runtime modes and renderer logic intact.
mixedPaintStyle.textContent = `
  [data-test-mixed-lower] { backdrop-filter: blur(6px); }
  [data-test-mixed-lower][data-glass-renderer="svg"] { backdrop-filter: blur(4px); }
  [data-test-mixed-lower][data-glass-renderer="vgpu"] { backdrop-filter: none; }
`;
document.head.append(mixedPaintStyle);
paintOrder = [
  mixedUpper,
  mixedLower,
  mixedPeer,
  mixedVideo as unknown as HTMLElement,
  mixedStage,
];
const mixedUrlsBefore = createdUrls.length;
const releaseMixedPeer = acquireGlass(
  configuration("mixed-auto-peer", mixedStage),
);
await settle();
assert.equal(mixedPeer.dataset.glassRenderer, "vgpu");
const mixedPeerFrame = mixedPeer.style.getPropertyValue("--glass-frame");
assert.ok(mixedPeerFrame);
const mixedWork = () => ({
  captures: captures.length,
  fonts: fontAcquisitions,
  decodes: frameDecodes,
  devices: rendererCreations,
});
const beforeMixedNative = mixedWork();
const releaseMixedLower = acquireGlass({
  id: "mixed-native-lower",
  mode: "css",
  captureTarget: mixedStage,
});
const releaseMixedUpper = acquireGlass(
  configuration("mixed-auto-upper", mixedStage),
);
await settle();
assert.equal(mixedLower.dataset.glassState, "css");
assert.equal(getComputedStyle(mixedLower).backdropFilter, "blur(6px)");
assert.equal(
  mixedUpper.dataset.glassRenderer,
  "svg",
  "an Auto surface over a live CSS backdrop uses local native refraction rather than flattening an unblurred media texture",
);
assert.equal(mixedUpper.style.getPropertyValue("--glass-frame"), "");
assert.match(mixedUpper.style.getPropertyValue("--glass-filter"), /^url\(/);
assert.deepEqual(
  mixedWork(),
  beforeMixedNative,
  "the local native fallback acquires no background snapshot, capture fonts, GPU frame decode or new GPU device",
);
assert.equal(
  mixedPeer.dataset.glassRenderer,
  "vgpu",
  "the unsupported retained backdrop does not fail the independent GPU peer",
);
assert.equal(mixedPeer.style.getPropertyValue("--glass-frame"), mixedPeerFrame);
assert.ok(activeSvgFilters.has(mixedUpper));

updateGlassConfiguration({
  id: "mixed-native-lower",
  mode: "svg",
  captureTarget: mixedStage,
});
await settle();
assert.equal(mixedLower.dataset.glassRenderer, "svg");
assert.equal(getComputedStyle(mixedLower).backdropFilter, "blur(4px)");
assert.equal(
  mixedUpper.dataset.glassRenderer,
  "svg",
  "the upper surface also retains a live native SVG backdrop without DOM texture capture",
);
assert.deepEqual(mixedWork(), beforeMixedNative);
assert.equal(mixedPeer.dataset.glassRenderer, "vgpu");
assert.ok(activeSvgFilters.has(mixedLower));
assert.ok(activeSvgFilters.has(mixedUpper));

updateGlassConfiguration(configuration("mixed-native-lower", mixedStage));
await settle();
assert.equal(mixedLower.dataset.glassRenderer, "vgpu");
assert.equal(getComputedStyle(mixedLower).backdropFilter, "none");
assert.equal(
  mixedUpper.dataset.glassRenderer,
  "vgpu",
  "the local Auto surface recovers GPU rendering when its retained lower backdrop becomes a decoded GPU frame",
);
assert.equal(mixedUpper.style.getPropertyValue("--glass-filter"), "");
assert.ok(mixedUpper.style.getPropertyValue("--glass-frame"));
assert.equal(activeSvgFilters.has(mixedLower), false);
assert.equal(
  activeSvgFilters.has(mixedUpper),
  false,
  "GPU recovery releases the temporary native filter",
);
assert.notEqual(
  latestFrame(mixedUpper).source,
  latestFrame(mixedLower).source,
  "the recovered upper GPU surface samples its actual retained lower frame",
);
assert.equal(mixedPeer.dataset.glassRenderer, "vgpu");
assert.equal(
  rendererCreations,
  beforeMixedNative.devices,
  "local fallback and recovery reuse the still-healthy shared GPU device",
);
const recoveredUpperFrame = mixedUpper.style.getPropertyValue("--glass-frame");
const recoveredUpperUrl = createdUrls.find((url) =>
  recoveredUpperFrame.includes(url),
);
assert.ok(recoveredUpperUrl);
const beforeMixedReturnToCss = mixedWork();
updateGlassConfiguration({
  id: "mixed-native-lower",
  mode: "css",
  captureTarget: mixedStage,
});
await settle();
assert.equal(mixedLower.dataset.glassState, "css");
assert.equal(
  mixedUpper.dataset.glassRenderer,
  "svg",
  "returning the lower layer to live CSS blur switches an already-rendered upper GPU frame back to local native refraction",
);
assert.equal(mixedUpper.style.getPropertyValue("--glass-frame"), "");
assert.ok(
  revokedUrls.includes(recoveredUpperUrl),
  "the local native transition revokes the obsolete upper GPU frame URL",
);
assert.ok(activeSvgFilters.has(mixedUpper));
assert.deepEqual(
  mixedWork(),
  beforeMixedReturnToCss,
  "returning to an unsupported retained backdrop creates no new capture, font acquisition, GPU frame decode or device",
);
assert.equal(mixedPeer.dataset.glassRenderer, "vgpu");
releaseMixedUpper();
releaseMixedLower();
releaseMixedPeer();
for (const element of [mixedLower, mixedUpper, mixedPeer]) {
  assert.equal(element.style.getPropertyValue("--glass-frame"), "");
  assert.equal(element.style.getPropertyValue("--glass-filter"), "");
  assert.equal(activeSvgFilters.has(element), false);
}
assert.ok(
  createdUrls.slice(mixedUrlsBefore).every((url) => revokedUrls.includes(url)),
  "mixed native/GPU transitions release every allocated frame URL",
);
assert.equal(fontLeases, 0);
mixedStage.remove();
mixedPaintStyle.remove();

const fallbackStage = stage();
const fallbackOne = surface(fallbackStage, "three-tier", 40, 40);
const fallbackTwo = surface(
  document.body as unknown as HTMLElement,
  "three-tier",
  250,
  40,
);
paintOrder = [fallbackOne, fallbackTwo, fallbackStage];
const releaseFallback = acquireGlass(
  configuration("three-tier", fallbackStage),
);
await settle();
assert.equal(fallbackOne.dataset.glassRenderer, "vgpu");
const beforeSvgCaptures = captures.length;
const beforeSvgFilters = svgFilters.length;
const beforeSvgDecodes = frameDecodes;
const beforeSvgUrls = createdUrls.length;
nextRenderFailure = new Error("GPU lost during rendering");
document.dispatchEvent(new window.Event("input", { bubbles: true }));
await settle();
assert.equal(fallbackOne.dataset.glassRenderer, "svg");
assert.equal(fallbackTwo.dataset.glassRenderer, "svg");
assert.equal(svgFilters.length, beforeSvgFilters + 2);
assert.equal(
  captures.length,
  beforeSvgCaptures + 1,
  "the failing GPU takes one snapshot; SVG installs filters without a second capture",
);
assert.equal(
  frameDecodes,
  beforeSvgDecodes,
  "SVG fallback has no frame image to decode",
);
assert.equal(
  createdUrls.length,
  beforeSvgUrls,
  "SVG fallback allocates no image frame URLs",
);
assert.equal(fallbackOne.style.getPropertyValue("--glass-frame"), "");
assert.match(fallbackOne.style.getPropertyValue("--glass-filter"), /^url\(/);
svgFailure = true;
document.dispatchEvent(new window.Event("input", { bubbles: true }));
await settle();
assert.equal(fallbackOne.dataset.glassState, "fallback");
assert.equal(fallbackTwo.dataset.glassState, "fallback");
assert.equal(fallbackOne.dataset.glassRenderer, undefined);
assert.equal(fallbackOne.style.getPropertyValue("--glass-frame"), "");
assert.equal(fallbackOne.style.getPropertyValue("--glass-filter"), "");
assert.equal(activeSvgFilters.size, 0);
releaseFallback();
fallbackStage.remove();
fallbackTwo.remove();
assert.ok(
  createdUrls.every((url) => revokedUrls.includes(url)),
  "all three-tier frames are released",
);
// A different, independent owner's RO invalidates the shared scene revision.
// No mutation, input, refresh or configuration update schedules the pending owner.
for (const outcome of ["ready", "css", "release"] as const) {
  const waitingStage = stage();
  const resizingStage = stage();
  const waiting = surface(waitingStage, `revision-${outcome}`, 20, 30);
  const resizing = surface(resizingStage, `resize-${outcome}`, 300, 80);
  paintOrder = [waiting, resizing, waitingStage, resizingStage];
  const releaseResizing = acquireGlass({
    ...configuration(`resize-${outcome}`, resizingStage),
    mode: "css",
  });
  await settle();
  assert.equal(resizing.dataset.glassState, "css");
  const observer = resizeObservers.at(-1);
  assert.ok(observer);
  assert.ok(observer.observed.has(resizing));
  const waitingConfig = configuration(`revision-${outcome}`, waitingStage);
  let finishRender = () => {};
  nextRender = new Promise<void>((resolve) => {
    finishRender = resolve;
  });
  const renderCount = renders.length;
  const urlCount = createdUrls.length;
  const releaseWaiting = acquireGlass(waitingConfig);
  try {
    await waitForRender(renderCount + 1);
    const staleSnapshot = latestFrame(waiting).source;
    assert.equal(waiting.style.getPropertyValue("--glass-frame"), "");
    place(resizing, 300, 80, 130, 40);
    observer.callback([{ target: resizing }]);
    if (outcome === "css")
      updateGlassConfiguration({ ...waitingConfig, mode: "css" });
    else if (outcome === "release") {
      releaseWaiting();
      waiting.remove();
    }
    finishRender();
    if (outcome === "ready") {
      await waitForRenderer(waiting, "vgpu");
      assert.equal(waiting.dataset.glassState, "ready");
      assert.notEqual(latestFrame(waiting).source, staleSnapshot);
      assert.equal(
        renders.length,
        renderCount + 2,
        "a revision-stale first frame gets one fresh render without an external kick",
      );
      assert.equal(
        createdUrls.length,
        urlCount + 1,
        "the stale async GPU output is never committed or allocated as a frame URL",
      );
    } else {
      await settle();
      assert.equal(renders.length, renderCount + 1);
      assert.equal(createdUrls.length, urlCount);
      assert.equal(waiting.style.getPropertyValue("--glass-frame"), "");
      if (outcome === "css") assert.equal(waiting.dataset.glassState, "css");
      else assert.equal(waiting.dataset.glassState, undefined);
    }
  } finally {
    finishRender();
    releaseWaiting();
    releaseResizing();
    waitingStage.remove();
    resizingStage.remove();
  }
  const releasedRenderCount = renders.length;
  const releasedCaptureCount: number = captures.length;
  await settle();
  assert.equal(
    renders.length,
    releasedRenderCount,
    "released owners never retry",
  );
  assert.equal(
    captures.length,
    releasedCaptureCount,
    "no post-release capture",
  );
  assert.ok(observer.disconnected);
  assert.equal(observer.observed.size, 0);
  assert.equal(fontLeases, 0);
  assert.equal(waiting.dataset.glassRenderer, undefined);
  assert.equal(waiting.style.getPropertyValue("--glass-frame"), "");
  assert.ok(
    createdUrls.slice(urlCount).every((url) => revokedUrls.includes(url)),
  );
}

// GPU clipping must not skip material updates or persist across a new lease.
svgAvailable = true;
svgFailure = false;
const clippedStage = stage();
const observerStage = stage();
const clippedSurface = surface(clippedStage, "io-clipped", 20, 30);
const observerSurface = surface(observerStage, "io-observer", 300, 80);
paintOrder = [clippedSurface, observerSurface, clippedStage, observerStage];
const releaseObserverSurface = acquireGlass({
  ...configuration("io-observer", observerStage),
  mode: "css",
});
await settle();
const clippedConfig = configuration("io-clipped", clippedStage);
const releaseClipped = acquireGlass(clippedConfig);
const intersection = observers.find(
  (observer) =>
    !resizeObservers.includes(observer) &&
    observer.observed.has(clippedSurface),
);
assert.ok(intersection);
const initialClipCaptures = captures.length;
const initialClipRenders = renders.length;
intersection.callback([{ target: clippedSurface, isIntersecting: false }]);
await settle();
assert.equal(captures.length, initialClipCaptures);
assert.equal(renders.length, initialClipRenders);
assert.equal(clippedSurface.style.getPropertyValue("--glass-frame"), "");
const clearClipOpacity =
  clippedSurface.style.getPropertyValue("--glass-opacity");
updateGlassConfiguration({ ...clippedConfig, material: "regular" });
await waitForRenderer(clippedSurface, "svg");
assert.notEqual(
  clippedSurface.style.getPropertyValue("--glass-opacity"),
  clearClipOpacity,
  "clipping cannot prevent the new material from being applied",
);
updateGlassConfiguration({ ...clippedConfig, mode: "css" });
await settle();
assert.equal(clippedSurface.dataset.glassState, "css");
assert.equal(clippedSurface.dataset.glassRenderer, undefined);
assert.equal(clippedSurface.style.getPropertyValue("--glass-filter"), "");
updateGlassConfiguration(clippedConfig);
await settle();
assert.equal(captures.length, initialClipCaptures);
assert.equal(renders.length, initialClipRenders);
intersection.callback([{ target: clippedSurface, isIntersecting: true }]);
await waitForRenderer(clippedSurface, "vgpu");
const beforeClipFrame = clippedSurface.style.getPropertyValue("--glass-frame");
assert.ok(beforeClipFrame);
let finishClippedRender = () => {};
nextRender = new Promise<void>((resolve) => {
  finishClippedRender = resolve;
});
const clipRenderCount = renders.length;
const clipUrlCount = createdUrls.length;
updateGlassConfiguration(configuration("io-clipped", clippedStage, 23));
await waitForRender(clipRenderCount + 1);
intersection.callback([{ target: clippedSurface, isIntersecting: false }]);
finishClippedRender();
await settle();
assert.equal(createdUrls.length, clipUrlCount);
assert.equal(
  clippedSurface.style.getPropertyValue("--glass-frame"),
  beforeClipFrame,
);
intersection.callback([{ target: clippedSurface, isIntersecting: true }]);
const clipDeadline = performance.now() + 2000;
while (
  clippedSurface.style.getPropertyValue("--glass-frame") === beforeClipFrame &&
  performance.now() < clipDeadline
)
  await new Promise((resolve) => setTimeout(resolve, 10));
assert.notEqual(
  clippedSurface.style.getPropertyValue("--glass-frame"),
  beforeClipFrame,
);
intersection.callback([{ target: clippedSurface, isIntersecting: false }]);
await settle();
releaseClipped();
assert.equal(intersection.observed.has(clippedSurface), false);
assert.equal(clippedSurface.dataset.glassRenderer, undefined);
assert.equal(clippedSurface.style.getPropertyValue("--glass-frame"), "");
// A queued callback for an unobserved element cannot reapply its old clip state.
intersection.callback([{ target: clippedSurface, isIntersecting: false }]);
const releaseReused = acquireGlass(clippedConfig);
await waitForRenderer(clippedSurface, "vgpu");
releaseReused();
releaseObserverSurface();
const afterClipReleaseRenders = renders.length;
const afterClipReleaseCaptures = captures.length;
await settle();
assert.equal(renders.length, afterClipReleaseRenders);
assert.equal(captures.length, afterClipReleaseCaptures);
assert.ok(intersection.disconnected);
assert.equal(intersection.observed.size, 0);
assert.equal(fontLeases, 0);
assert.ok(createdUrls.every((url) => revokedUrls.includes(url)));
clippedStage.remove();
observerStage.remove();

// A retained video that DOM serialization cannot draw uses the local native chain.
svgAvailable = true;
const portalVideoStage = stage();
portalVideoStage.dataset.glassCapture = "media";
const portalVideo = document.createElement("video") as unknown as HTMLElement;
portalVideo.setAttribute("data-glass-backdrop", "");
portalVideo.style.cssText = "position:absolute;z-index:0;object-fit:cover";
portalVideoStage.append(portalVideo);
place(portalVideo, 0, 0, 800, 600);
const videoPeer = surface(portalVideoStage, "video-peer", 350, 100);
videoPeer.style.cssText += ";position:absolute;z-index:1";
const videoPopup = surface(
  document.body as unknown as HTMLElement,
  "video-popup",
  30,
  100,
);
videoPopup.style.cssText += ";position:absolute;z-index:10";
paintOrder = [videoPopup, videoPeer, portalVideo, portalVideoStage];
const beforeVideoCaptures = captures.length;
const beforeVideoDevices = rendererCreations;
const releaseVideoPeer = acquireGlass(
  configuration("video-peer", portalVideoStage),
);
const releaseVideoPopup = acquireGlass(
  configuration("video-popup", portalVideoStage),
);
await waitForRenderer(videoPeer, "vgpu");
await waitForRenderer(videoPopup, "svg");
assert.equal(captures.length, beforeVideoCaptures + 1);
assert.equal(captures.at(-1)?.target, portalVideoStage);
assert.equal(videoPopup.style.getPropertyValue("--glass-frame"), "");
assert.match(videoPopup.style.getPropertyValue("--glass-filter"), /^url\(/);
assert.equal(rendererCreations, beforeVideoDevices + 1);
// Only paint that can contribute to the popup should stop GPU sampling.
portalVideo.setAttribute("data-glass-exclude", "");
refreshGlass("video-popup");
await waitForRenderer(videoPopup, "vgpu");
assert.equal(videoPeer.dataset.glassRenderer, "vgpu");
portalVideo.removeAttribute("data-glass-exclude");
refreshGlass("video-popup");
await waitForRenderer(videoPopup, "svg");
const popupGpuFrame = videoPopup.style.getPropertyValue("--glass-frame");
assert.equal(popupGpuFrame, "");
// A known higher video is excluded by the existing paint mask.
portalVideo.style.zIndex = "20";
portalVideoStage.style.cssText = "position:absolute;z-index:20";
paintOrder = [portalVideo, portalVideoStage, videoPopup, videoPeer];
refreshGlass("video-popup");
await waitForRenderer(videoPopup, "vgpu");
assert.equal(videoPeer.dataset.glassRenderer, "vgpu");
// An off-footprint video does not affect the popup either.
place(portalVideo, 600, 400, 80, 80);
portalVideoStage.style.cssText = "position:absolute;z-index:0";
portalVideo.style.zIndex = "0";
paintOrder = [videoPopup, videoPeer, portalVideo, portalVideoStage];
refreshGlass("video-popup");
await waitForRenderer(videoPopup, "vgpu");
place(portalVideo, 0, 0, 800, 600);
// Returning the video below the popup restores the native chain, not a blank frame.
portalVideoStage.style.cssText = "position:absolute;z-index:0";
portalVideo.style.zIndex = "0";
paintOrder = [videoPopup, videoPeer, portalVideo, portalVideoStage];
refreshGlass("video-popup");
await waitForRenderer(videoPopup, "svg");
// Without a marked capture source, the in-scene peer also needs the live video.
portalVideoStage.removeAttribute("data-glass-capture");
refreshGlass("video-peer");
await waitForRenderer(videoPeer, "svg");
releaseVideoPopup();
releaseVideoPeer();
assert.equal(activeSvgFilters.size, 0);
// Lack of native SVG affects only that surface; the healthy GPU peer survives.
portalVideoStage.dataset.glassCapture = "media";
svgAvailable = false;
const releaseVideoPeerAgain = acquireGlass(
  configuration("video-peer", portalVideoStage),
);
const releaseVideoPopupAgain = acquireGlass(
  configuration("video-popup", portalVideoStage),
);
await waitForRenderer(videoPeer, "vgpu");
const videoFallbackDeadline = performance.now() + 2000;
while (
  videoPopup.dataset.glassState !== "fallback" &&
  performance.now() < videoFallbackDeadline
)
  await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(videoPopup.dataset.glassState, "fallback");
assert.equal(videoPopup.dataset.glassRenderer, undefined);
assert.equal(videoPopup.style.getPropertyValue("--glass-frame"), "");
assert.equal(videoPeer.dataset.glassRenderer, "vgpu");
releaseVideoPopupAgain();
releaseVideoPeerAgain();
videoPopup.remove();
portalVideoStage.remove();
assert.equal(videoPopup.dataset.glassState, undefined);
assert.equal(videoPopup.style.getPropertyValue("--glass-filter"), "");
assert.equal(activeSvgFilters.size, 0);
assert.equal(fontLeases, 0);
svgAvailable = false;

textReads.mockRestore();
await window.happyDOM.close();
console.log(
  "shared snapshots, frame coordinates, scene invalidation and layer isolation passed",
);
