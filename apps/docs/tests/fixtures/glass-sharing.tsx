import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import type { GlassConfiguration } from "../../../../packages/ui/src/lib/glass/context";
import {
  GlassContrastError,
  resolveGlassContrastTint,
} from "../../../../packages/ui/src/lib/glass/contrast";
import type { GlassFrame } from "../../../../packages/ui/src/lib/glass/renderer";

const window = new Window({ url: "http://localhost" });
const document = window.document;
const fontEvents = new window.EventTarget();
Object.defineProperty(document, "fonts", { value: fontEvents });
function loadedFont(family: string) {
  const event = new window.Event("loadingdone");
  Object.defineProperty(event, "fontfaces", { value: [{ family }] });
  fontEvents.dispatchEvent(event);
}
let nextDecode: Promise<void> | undefined;
Object.defineProperty(window, "Image", {
  value: class {
    src = "";
    async decode() {
      const pending = nextDecode;
      nextDecode = undefined;
      await pending;
    }
  },
});
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  MutationObserver: window.MutationObserver,
  ResizeObserver: Observer,
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
      return { data: new Uint8Array([255, 255, 255, 255]) };
    },
  }),
});
const captures: {
  target: HTMLElement;
  blocked: Set<Element>;
  snapshot: HTMLCanvasElement;
  started: number;
}[] = [];
const renders: { source: HTMLCanvasElement; frame: GlassFrame }[] = [];
let svgAvailable = false;
let svgRenders = 0;
let svgFailure = false;
let rendererCreations = 0;
let rendererDestructions = 0;
let captureDelay = 0;
let activeCaptures = 0;
let peakCaptures = 0;
let fontLeases = 0;
const contrastFailures: GlassFrame[] = [];
let nextRenderFailure: Error | undefined;
let nextCaptureFailure: Error | undefined;
const { glassLayoutSize } = await import(
  "../../../../packages/ui/src/lib/glass/capture"
);
mock.module("../../../../packages/ui/src/lib/glass/capture", () => ({
  glassLayoutSize,
  acquireGlassCaptureFonts: () => {
    fontLeases++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      fontLeases--;
    };
  },
  captureGlassBackground: async (
    target: HTMLElement,
    blocked: Set<Element>,
  ) => {
    activeCaptures++;
    peakCaptures = Math.max(peakCaptures, activeCaptures);
    const snapshot = document.createElement(
      "canvas",
    ) as unknown as HTMLCanvasElement;
    snapshot.width = 800;
    snapshot.height = 600;
    captures.push({
      target,
      blocked: new Set(blocked),
      snapshot,
      started: performance.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, captureDelay));
    activeCaptures--;
    if (nextCaptureFailure) {
      const error = nextCaptureFailure;
      nextCaptureFailure = undefined;
      throw error;
    }
    return snapshot;
  },
}));
mock.module("../../../../packages/ui/src/lib/glass/renderer", () => ({
  GlassRenderer: {
    create: async () => {
      rendererCreations++;
      return {
        render: async (source: HTMLCanvasElement, frame: GlassFrame) => {
          renders.push({ source, frame });
          if (nextRenderFailure) {
            const error = nextRenderFailure;
            nextRenderFailure = undefined;
            throw error;
          }
          if (
            frame.textColors &&
            !resolveGlassContrastTint(frame.tint, frame.textColors, 4.55)
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
        render: async () => {
          svgRenders++;
          if (svgFailure) throw new Error("SVG rendering failed");
          return new Blob(["SVG frame"]);
        },
        destroy: () => {},
      };
    },
  },
}));
const { acquireGlass, updateGlassConfiguration } = await import(
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
  element.style.backgroundColor = "#ffffff";
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
async function waitForRender(count: number) {
  const limit = performance.now() + 2000;
  while (renders.length < count && performance.now() < limit)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(renders.length >= count, "a frame must reach the pending decode");
}
function latestFrame(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const match = [...renders]
    .reverse()
    .find(
      ({ frame }) =>
        frame.origin?.[0] === rect.left && frame.origin?.[1] === rect.top,
    );
  assert.ok(
    match,
    "each surface must produce a frame with its viewport origin",
  );
  return match;
}

const target = stage();
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
await settle();
assert.equal(
  captures.length,
  beforeFonts,
  "fonts outside the capture or used only inside excluded glass do not resample",
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
  () => window.dispatchEvent(new window.Event("scroll")),
  "scroll",
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
  "all overlapping glass modules share the clean underlying snapshot",
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
  "the lower glass module is excluded as well",
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
const releaseTrack = acquireGlass(configuration("track", tabs));
const releaseIndicator = acquireGlass(configuration("indicator", tabs));
await settle();
assert.equal(
  captures.length,
  beforeTabs + 1,
  "nested surfaces share a background with all glass excluded",
);
assert.equal(latestFrame(track).source, latestFrame(indicator).source);
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
  true,
  "nested glass excludes the parent and all its content",
);
assert.deepEqual(latestFrame(indicator).frame.origin, [120, 108]);
releaseTrack();
releaseIndicator();
tabs.remove();

const zeroStage = stage();
const zero = surface(zeroStage, "zero", 20, 30);
paintOrder = [zero, zeroStage];
const releaseZero = acquireGlass({
  ...configuration("zero", zeroStage),
  options: { blur: 0, tintOpacity: 0 },
});
await settle();
assert.equal(latestFrame(zero).frame.blur, 0, "zero configured blur is valid");
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
assert.equal(captures.length, beforeNested + 1);
const oldChildSnapshot = latestFrame(child).source;
const parentFrame = parent.style.getPropertyValue("--glass-frame");
updateGlassConfiguration(configuration("parent", nestedStage, 40));
await settle();
assert.notEqual(parent.style.getPropertyValue("--glass-frame"), parentFrame);
assert.equal(latestFrame(child).source, oldChildSnapshot);
assert.equal(
  captures.length,
  beforeNested + 1,
  "a glass-only material change does not recapture the shared background",
);
releaseParent();
releaseChild();
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
await settle();
for (const attribute of ["aria-pressed", "data-checked"]) {
  const beforeSemanticCapture = captures.length;
  const previousSemanticUrl = createdUrls.at(-1);
  assert.ok(previousSemanticUrl);
  let finishSemanticDecode = () => {};
  nextDecode = new Promise<void>((resolve) => {
    finishSemanticDecode = resolve;
  });
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
  finishSemanticDecode();
  await settle();
  assert.ok(captures.length > beforeSemanticCapture);
  assert.equal(semantic.dataset.glassState, "ready");
  assert.deepEqual(latestFrame(semantic).frame.tint, [0, 88 / 255, 204 / 255]);
  semantic.removeAttribute(attribute);
  await settle();
  assert.equal(semantic.style.getPropertyValue("--glass-base"), "#ffffff");
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
themed.style.backgroundColor = "#161617";
await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(
  themed.dataset.glassState,
  "css",
  "theme changes immediately restore the matching CSS material during async work",
);
assert.equal(themed.style.getPropertyValue("--glass-frame"), "");
assert.ok(revokedUrls.includes(previousThemeUrl));
await waitForRender(beforeThemeRender + 1);
themed.style.backgroundColor = "#ffffff";
await new Promise((resolve) => setTimeout(resolve, 10));
const staleThemeUrl = createdUrls.at(-1);
assert.ok(staleThemeUrl);
finishThemeDecode();
await new Promise((resolve) => setTimeout(resolve, 10));
assert.ok(revokedUrls.includes(staleThemeUrl));
assert.equal(themed.style.getPropertyValue("--glass-frame"), "");
await settle();
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
const fallbackStage = stage();
const fallbackOne = surface(fallbackStage, "three-tier", 40, 40);
const fallbackTwo = surface(fallbackStage, "three-tier", 250, 40);
paintOrder = [fallbackOne, fallbackTwo, fallbackStage];
const releaseFallback = acquireGlass(
  configuration("three-tier", fallbackStage),
);
await settle();
assert.equal(fallbackOne.dataset.glassRenderer, "vgpu");
const beforeSvgCaptures = captures.length;
nextRenderFailure = new Error("GPU lost during rendering");
document.dispatchEvent(new window.Event("input", { bubbles: true }));
await settle();
assert.equal(fallbackOne.dataset.glassRenderer, "svg");
assert.equal(fallbackTwo.dataset.glassRenderer, "svg");
assert.equal(svgRenders, 2);
assert.equal(
  captures.length,
  beforeSvgCaptures + 1,
  "GPU fallback reuses the same shared snapshot for SVG",
);
svgFailure = true;
document.dispatchEvent(new window.Event("input", { bubbles: true }));
await settle();
assert.equal(fallbackOne.dataset.glassState, "fallback");
assert.equal(fallbackTwo.dataset.glassState, "fallback");
assert.equal(fallbackOne.dataset.glassRenderer, undefined);
assert.equal(fallbackOne.style.getPropertyValue("--glass-frame"), "");
releaseFallback();
fallbackStage.remove();
assert.ok(
  createdUrls.every((url) => revokedUrls.includes(url)),
  "all three-tier frames are released",
);
await window.happyDOM.close();
console.log(
  "shared snapshots, frame coordinates, scene invalidation and layer isolation passed",
);
