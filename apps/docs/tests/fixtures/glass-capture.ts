import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import { glassEdge } from "../../../../packages/ui/src/lib/glass/edge";

type CaptureOptions = {
  width?: number;
  height?: number;
  pixelRatio?: number;
  fontEmbedCSS?: string;
  style?: Partial<CSSStyleDeclaration>;
  filter?: (node: Node) => boolean;
  onImageErrorHandler?: (event: Event) => void;
};
const window = new Window({ url: "http://localhost:3001" });
const document = window.document;
const fontEvents = new window.EventTarget();
Object.assign(fontEvents, { status: "loaded", ready: Promise.resolve() });
Object.defineProperty(document, "fonts", { value: fontEvents });
function observeFontListeners(events: typeof fontEvents) {
  const active = new Map<string, Set<unknown>>();
  const add = events.addEventListener.bind(events);
  const remove = events.removeEventListener.bind(events);
  events.addEventListener = (type, listener, options) => {
    const listeners = active.get(type) ?? new Set();
    listeners.add(listener);
    active.set(type, listeners);
    add(type, listener, options);
  };
  events.removeEventListener = (type, listener) => {
    active.get(type)?.delete(listener);
    remove(type, listener);
  };
  return () =>
    [...active.values()].reduce(
      (count, listeners) => count + listeners.size,
      0,
    );
}
const fontListenerCount = observeFontListeners(fontEvents);
Object.assign(globalThis, {
  window,
  document,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  DOMParser: window.DOMParser,
  XMLSerializer: window.XMLSerializer,
  innerWidth: 1024,
  innerHeight: 768,
  getComputedStyle: window.getComputedStyle.bind(window),
});
let fontCalls = 0;
let sourceCalls = 0;
let pendingSource: Promise<void> | undefined;
let pendingFont: Promise<void> | undefined;
let activeSources = 0;
let peakSources = 0;
let activeFonts = 0;
let peakFonts = 0;
let failCapture = false;
let tainted = false;
let imageFailure = false;
const embeddedImageSources: string[] = [];
let lastOptions: CaptureOptions | undefined;
let drawnSource = "";
let drawCalls = 0;
let pixelReads = 0;
let lastDrawing: { source: unknown; coordinates: number[] } | undefined;
let lastTranslation: number[] = [];
let lastScale: number[] = [];
let lastClip: number[] = [];
const drawings: { canvas: unknown; source: unknown; coordinates: number[] }[] =
  [];
class CaptureImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(value: string) {
    drawnSource = decodeURIComponent(value.slice(value.indexOf(",") + 1));
    queueMicrotask(() => (imageFailure ? this.onerror?.() : this.onload?.()));
  }
}
Object.assign(globalThis, { Image: CaptureImage });
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value: function (this: typeof window.HTMLCanvasElement.prototype) {
    return {
      save() {},
      restore() {},
      scale: (...coordinates: number[]) => {
        lastScale = coordinates;
      },
      translate: (...coordinates: number[]) => {
        lastTranslation = coordinates;
      },
      beginPath() {},
      rect: (...coordinates: number[]) => {
        lastClip = coordinates;
      },
      clip() {},
      drawImage: (source: unknown, ...coordinates: number[]) => {
        drawCalls++;
        lastDrawing = { source, coordinates };
        drawings.push({ canvas: this, source, coordinates });
      },
      getImageData: () => {
        pixelReads++;
        if (tainted) throw new Error("SecurityError: tainted canvas");
        return { data: new Uint8Array([0, 0, 0, 255]) };
      },
    };
  },
});

type HappyElement = InstanceType<typeof window.Element>;
function cloneFiltered(
  element: HappyElement,
  options: CaptureOptions,
): HappyElement {
  if (element instanceof window.HTMLCanvasElement) element.toDataURL();
  if (element.localName === "svg")
    return element.cloneNode(true) as HappyElement;
  const clone = element.cloneNode(false) as HappyElement;
  if (element instanceof window.HTMLElement) {
    (clone as unknown as HTMLElement).style.cssText = element.style.cssText;
  }
  for (const child of element.childNodes) {
    if (options.filter && !options.filter(child as unknown as Node)) continue;
    clone.append(
      child instanceof window.Element
        ? cloneFiltered(child, options)
        : child.cloneNode(true),
    );
  }
  return clone;
}
mock.module(
  Bun.resolveSync(
    "html-to-image",
    new URL("../../../../packages/ui/src/lib/glass", import.meta.url).pathname,
  ),
  () => ({
    getFontEmbedCSS: async () => {
      fontCalls++;
      activeFonts++;
      peakFonts = Math.max(peakFonts, activeFonts);
      try {
        await pendingFont;
        return "@font-face{font-family:Inter;src:url(data:font/woff2;base64,AAAA)}";
      } finally {
        activeFonts--;
      }
    },
  }),
);
mock.module("html-to-image/es/clone-node", () => ({
  cloneNode: async (target: HappyElement, options: CaptureOptions) => {
    sourceCalls++;
    activeSources++;
    peakSources = Math.max(peakSources, activeSources);
    try {
      await pendingSource;
      lastOptions = options;
      if (failCapture) throw new Error("Resource failed");
      return cloneFiltered(target, options);
    } finally {
      activeSources--;
    }
  },
}));
mock.module("html-to-image/es/embed-images", () => ({
  embedImages: async (clone: HappyElement, options: CaptureOptions) => {
    for (const image of clone.querySelectorAll("img,image")) {
      const source = image.getAttribute("src") ?? image.getAttribute("href");
      if (source) embeddedImageSources.push(source);
    }
    for (const image of clone.querySelectorAll(
      "img[data-test-embed-failure],image[data-test-embed-failure]",
    )) {
      if (!image.getAttribute("src") && !image.getAttribute("href")) continue;
      options.onImageErrorHandler?.({ target: image } as unknown as Event);
      image.setAttribute("src", "");
    }
  },
}));
const {
  acquireGlassCaptureFonts,
  captureGlassBackground,
  glassCaptureOrigin,
  glassCapturePixelRatio,
  releaseGlassFrame,
  GlassResourceError,
} = await import("../../../../packages/ui/src/lib/glass/capture");
const revokedFrames: string[] = [];
const revokeFrame = URL.revokeObjectURL;
URL.revokeObjectURL = (url) => {
  revokedFrames.push(url);
  revokeFrame(url);
};
releaseGlassFrame("idle-frame");
assert.deepEqual(revokedFrames, ["idle-frame"]);
let releaseFontOwner = acquireGlassCaptureFonts(
  document as unknown as Document,
);
const releaseSiblingFonts = acquireGlassCaptureFonts(
  document as unknown as Document,
);
assert.equal(
  fontListenerCount(),
  2,
  "same-document scopes share one font event pair",
);

function bounds(
  element: Element,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => new window.DOMRect(x, y, width, height),
  });
}
const target = document.createElement("main");
target.style.cssText =
  "position:relative;transform:none;width:640px;height:1200px;font-family:Inter";
document.body.append(target);
bounds(target as unknown as Element, 40, -120, 640, 1200);
target.innerHTML =
  '<div id="scroller" style="position:relative;transform:none;width:300px;height:200px;overflow:auto"><p>Scrolling copy</p></div><div id="fixed" style="position:fixed;transform:none">Pinned copy</div><button id="glass">Excluded glass</button><script>ignored script</script><iframe></iframe><video></video><div data-glass-decoration="true">Decoration</div>';
const scroller = target.querySelector("#scroller") as unknown as HTMLElement;
const pinned = target.querySelector("#fixed") as unknown as HTMLElement;
bounds(scroller, 80, 10, 300, 200);
bounds(pinned, 100, 20, 80, 30);
scroller.scrollTop = 50;
scroller.scrollLeft = 12;
Object.defineProperties(scroller, {
  scrollWidth: { value: 600 },
  scrollHeight: { value: 900 },
});
scroller.setAttribute("data-glass-capture-id", "caller-value");
const excluded = target.querySelector("#glass") as unknown as Element;
const blocked = new Set<Element>([excluded]);
const initialChildren = scroller.childNodes.length;
const initialCapture = captureGlassBackground(
  target as unknown as HTMLElement,
  blocked,
);
releaseGlassFrame("active-frame");
assert.equal(
  revokedFrames.includes("active-frame"),
  false,
  "a mode change cannot revoke a frame while DOM embedding may still read it",
);
const canvas = await initialCapture;
assert.equal(revokedFrames.includes("active-frame"), true);
assert.equal(canvas.width, 2048);
assert.equal(canvas.height, 1536);
assert.equal(lastOptions?.width, 640);
assert.equal(lastOptions?.height, 1200);
assert.equal(lastOptions?.pixelRatio, 1);
assert.equal(lastOptions?.style?.width, "640px");
assert.equal(lastOptions?.fontEmbedCSS?.includes("font-face"), true);
const captured = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
assert.equal(captured.documentElement.getAttribute("width"), "1024");
assert.equal(captured.documentElement.getAttribute("height"), "768");
assert.deepEqual(lastDrawing?.coordinates, [0, 0, 2048, 1536]);
assert.equal(captured.documentElement.getAttribute("viewBox"), "0 0 1024 768");
assert.equal(captured.querySelector("foreignObject")?.getAttribute("x"), "40");
assert.equal(
  captured.querySelector("foreignObject")?.getAttribute("y"),
  "-120",
);
assert.equal(
  captured.querySelector("foreignObject")?.getAttribute("width"),
  "640",
);
assert.equal(
  captured.querySelector("script,iframe,video,[data-glass-decoration]"),
  null,
);
assert.equal(captured.querySelector("[data-glass-capture-id]"), null);
assert.equal(
  (captured.querySelector("#glass") as unknown as HTMLElement).style.visibility,
  "hidden",
);
assert.equal(captured.querySelector("#glass")?.childNodes.length, 0);
assert.equal(excluded.hasAttribute("data-glass-capture-id"), false);
assert.match(
  captured.querySelector("#scroller")?.innerHTML ?? "",
  /translate\(-12px,\s*-50px\)/,
);
assert.equal(
  (captured.querySelector("#fixed") as unknown as HTMLElement).style.position,
  "absolute",
);
assert.equal(
  (captured.querySelector("#fixed") as unknown as HTMLElement).style.top,
  "140px",
);
assert.equal(scroller.scrollTop, 50);
assert.equal(scroller.scrollLeft, 12);
assert.equal(scroller.childNodes.length, initialChildren);
assert.equal(scroller.getAttribute("data-glass-capture-id"), "caller-value");
assert.equal(pinned.hasAttribute("data-glass-capture-id"), false);
assert.equal(drawCalls, 1);
assert.equal(pixelReads, 1);

await captureGlassBackground(target as unknown as HTMLElement, blocked);
assert.equal(fontCalls, 1);
target.style.fontFamily = "Example";
await captureGlassBackground(target as unknown as HTMLElement, blocked);
assert.equal(fontCalls, 2);
const css = document.createElement("style");
css.textContent = "main { font-family: Example; }";
document.head.append(css);
await captureGlassBackground(target as unknown as HTMLElement, blocked);
assert.equal(fontCalls, 3);
fontEvents.dispatchEvent(new window.Event("loadingdone"));
await captureGlassBackground(target as unknown as HTMLElement, blocked);
assert.equal(fontCalls, 4);
releaseSiblingFonts();
releaseSiblingFonts();
assert.equal(
  fontListenerCount(),
  2,
  "one scope cannot release another root's font monitoring",
);
fontEvents.dispatchEvent(new window.Event("loadingerror"));
await captureGlassBackground(target as unknown as HTMLElement, blocked);
assert.equal(
  fontCalls,
  5,
  "the remaining scope still invalidates changed font CSS",
);

const otherWindow = new Window({ url: "http://localhost/other-document" });
const otherEvents = new otherWindow.EventTarget();
Object.defineProperty(otherWindow.document, "fonts", { value: otherEvents });
const otherFontListenerCount = observeFontListeners(
  otherEvents as typeof fontEvents,
);
const releaseOtherDocument = acquireGlassCaptureFonts(
  otherWindow.document as unknown as Document,
);
assert.equal(otherFontListenerCount(), 2);

failCapture = true;
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /Resource failed/,
);
assert.equal(scroller.getAttribute("data-glass-capture-id"), "caller-value");
assert.equal(pinned.hasAttribute("data-glass-capture-id"), false);
failCapture = false;

tainted = true;
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /tainted canvas/,
);
tainted = false;
imageFailure = true;
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /rasterization failed/,
);
imageFailure = false;
const unreadable = document.createElement("div");
unreadable.style.backgroundImage = 'url("https://example.test/unreadable.png")';
target.append(unreadable);
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /resource embedding failed/,
);
unreadable.style.backgroundImage = 'url("data:image/png;base64,AAAA")';
await captureGlassBackground(target as unknown as HTMLElement, blocked);
unreadable.remove();
const decodedParent = document.createElement("div");
decodedParent.id = "decoded-glass-parent";
const embeddedEdge = glassEdge(120, 40, ["20px", "20px", "20px", "20px"], 0.3);
assert.ok(embeddedEdge.includes("url(%23topReflection)"));
assert.ok(embeddedEdge.includes("url(%23soft)"));
decodedParent.style.backgroundImage = `${embeddedEdge}, url("data:image/png;base64,AAAA")`;
const quotedEdgeStyle = document.createElement("style");
quotedEdgeStyle.textContent = `#decoded-glass-parent::before { background-image: ${embeddedEdge.replace(/^url\("/, "url('").replace(/"\)$/, "')")}; }`;
decodedParent.append(quotedEdgeStyle);
decodedParent.style.setProperty(
  "--glass-frame",
  'url("blob:http://localhost/decoded-parent")',
);
decodedParent.style.setProperty(
  "--glass-edge",
  'url("blob:http://localhost/redundant-edge")',
);
decodedParent.style.setProperty("--glass-opacity", "60%");
target.append(decodedParent);
const parentStyleBeforeCapture = decodedParent.style.cssText;
await captureGlassBackground(target as unknown as HTMLElement, blocked);
const decodedParentCapture = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
const decodedParentClone = decodedParentCapture.querySelector(
  "#decoded-glass-parent",
) as unknown as HTMLElement;
assert.ok(decodedParentClone);
assert.equal(
  decodedParentClone.style.backgroundImage,
  decodedParent.style.backgroundImage,
  "retained parent glass keeps embedded SVG gradients and filters without treating their nested fragments as external URLs",
);
assert.equal(
  decodedParentClone.querySelector("style")?.textContent,
  quotedEdgeStyle.textContent,
  "single-quoted embedded SVG resources inside generated style rules are retained intact",
);
for (const property of ["--glass-frame", "--glass-edge", "--glass-opacity"])
  assert.equal(
    decodedParentClone.style.getPropertyValue(property),
    "",
    "redundant custom glass properties are removed only from the captured clone",
  );
assert.equal(
  decodedParent.style.cssText,
  parentStyleBeforeCapture,
  "capture cleanup never mutates the live parent glass frame or material",
);
decodedParent.dataset.glass = "true";
const nestedGlass = document.createElement("div");
nestedGlass.dataset.glass = "true";
nestedGlass.id = "requested-glass-child";
nestedGlass.textContent = "Requested child text stays excluded";
decodedParent.append(nestedGlass);
const peerGlass = document.createElement("div");
peerGlass.id = "automatic-peer";
peerGlass.dataset.glass = "true";
peerGlass.style.backgroundImage =
  'url("blob:http://localhost/uncapturable-peer")';
peerGlass.textContent = "Peer glass content";
target.append(peerGlass);
await captureGlassBackground(
  target as unknown as HTMLElement,
  new Set([nestedGlass as unknown as Element, peerGlass as unknown as Element]),
);
const cleanScene = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
const retainedParent = cleanScene.querySelector(
  "#decoded-glass-parent",
) as unknown as HTMLElement;
assert.ok(retainedParent);
assert.notEqual(
  retainedParent.style.visibility,
  "hidden",
  "caller-unblocked lower Glass remains in the background",
);
assert.equal(
  retainedParent.style.backgroundImage,
  decodedParent.style.backgroundImage,
  "the retained parent frame and edge bitmap survive clone repair",
);
assert.equal(
  retainedParent.querySelector("style")?.textContent,
  quotedEdgeStyle.textContent,
  "the lower parent's non-Glass contents stay available to child sampling",
);
for (const id of ["requested-glass-child", "automatic-peer"]) {
  const clone = cleanScene.querySelector(`#${id}`) as unknown as HTMLElement;
  assert.ok(clone, "the shared pipeline retains layout placeholders");
  assert.equal(clone.style.visibility, "hidden");
  assert.equal(clone.style.backgroundImage, "none");
  assert.equal(
    clone.childNodes.length,
    0,
    "only caller-blocked Glass content is removed, preserving its layout placeholder",
  );
}
assert.equal(
  decodedParent.style.cssText,
  parentStyleBeforeCapture,
  "the live glass never flashes or loses its frame during capture",
);
assert.ok(nestedGlass.isConnected);
await assert.rejects(
  captureGlassBackground(
    target as unknown as HTMLElement,
    new Set([nestedGlass as unknown as Element]),
  ),
  /resource embedding failed/,
  "an unblocked Glass peer is retained and must satisfy ordinary resource embedding instead of being silently filtered",
);
await captureGlassBackground(
  target as unknown as HTMLElement,
  new Set([
    decodedParent as unknown as Element,
    peerGlass as unknown as Element,
  ]),
);
const parentExcludedScene = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
const explicitlyExcludedParent = parentExcludedScene.querySelector(
  "#decoded-glass-parent",
) as unknown as HTMLElement;
assert.ok(explicitlyExcludedParent);
assert.equal(
  explicitlyExcludedParent.style.visibility,
  "hidden",
  "caller-blocked parent is excluded when it is actually on the requesting plane",
);
assert.equal(
  explicitlyExcludedParent.childNodes.length,
  0,
  "excluding a parent also excludes its child subtree",
);
assert.equal(
  decodedParent.style.cssText,
  parentStyleBeforeCapture,
  "changing capture masks never changes the live retained parent's frame",
);
peerGlass.remove();
delete decodedParent.dataset.glass;
nestedGlass.remove();
decodedParent.style.backgroundImage =
  'url("blob:http://localhost/unembedded-parent")';
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /resource embedding failed/,
  "an actually unembedded background image still fails validation",
);
decodedParent.remove();
const failedImage = document.createElement("img");
failedImage.src = "data:image/png;base64,invalid";
Object.defineProperties(failedImage, {
  complete: { value: true },
  naturalWidth: { value: 0 },
});
target.append(failedImage);
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /failed image/,
);
failedImage.remove();
const embeddingFailure = document.createElement("img");
embeddingFailure.id = "excluded-image";
embeddingFailure.src = "https://example.test/no-cors.png";
embeddingFailure.dataset.testEmbedFailure = "true";
embeddingFailure.style.cssText = "width:40px;height:30px";
Object.defineProperties(embeddingFailure, {
  complete: { value: true },
  naturalWidth: { value: 40 },
});
target.append(embeddingFailure);
const imageBlockers = new Set([
  ...blocked,
  embeddingFailure as unknown as Element,
]);
await captureGlassBackground(target as unknown as HTMLElement, imageBlockers);
const imageExcludedCapture = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
const hiddenImage = imageExcludedCapture.querySelector(
  "#excluded-image",
) as unknown as HTMLElement;
assert.equal(hiddenImage.localName, "div");
assert.equal(
  embeddedImageSources.includes("https://example.test/no-cors.png"),
  false,
  "excluded image resources never reach the embedding stage",
);
assert.equal(hiddenImage.style.visibility, "hidden");
assert.equal(hiddenImage.style.width, "40px");
assert.equal(hiddenImage.style.height, "30px");
assert.equal(hiddenImage.hasAttribute("src"), false);
assert.equal(
  embeddingFailure.getAttribute("src"),
  "https://example.test/no-cors.png",
);
assert.equal(embeddingFailure.hasAttribute("data-glass-capture-id"), false);
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /image embedding failed/,
);
embeddingFailure.remove();
const canvasLayout = document.createElement("div");
canvasLayout.id = "canvas-layout";
canvasLayout.style.cssText = "display:flex;gap:12px;width:400px";
canvasLayout.setAttribute("data-glass-capture-id", "caller-parent");
canvasLayout.innerHTML =
  '<span id="canvas-prefix">Before</span><canvas id="canvas-a" style="width:80px;height:30px;flex-shrink:0"></canvas><script>excluded</script><span id="canvas-middle">Between</span><canvas id="canvas-b" style="width:50px;height:40px;padding:3px;border:2px solid;box-sizing:content-box"></canvas><span id="canvas-suffix">After</span>';
const canvasA = canvasLayout.querySelector("#canvas-a");
const canvasB = canvasLayout.querySelector("#canvas-b");
assert.ok(canvasA);
assert.ok(canvasB);
canvasA.setAttribute("data-glass-capture-id", "caller-canvas");
let canvasSerializations = 0;
for (const element of [canvasA, canvasB])
  Object.defineProperty(element, "toDataURL", {
    value: () => {
      canvasSerializations++;
      const error = new Error("Tainted excluded canvas");
      error.name = "SecurityError";
      throw error;
    },
  });
target.append(canvasLayout);
const canvasBlockers = new Set([
  ...blocked,
  canvasA as unknown as Element,
  canvasB as unknown as Element,
]);
await captureGlassBackground(target as unknown as HTMLElement, canvasBlockers);
assert.equal(
  canvasSerializations,
  0,
  "excluded canvases never serialize pixels",
);
const canvasExcludedCapture = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
const capturedCanvasLayout =
  canvasExcludedCapture.querySelector("#canvas-layout");
assert.ok(capturedCanvasLayout);
assert.deepEqual(
  [...capturedCanvasLayout.children].map((node) => node.id),
  ["canvas-prefix", "canvas-a", "canvas-middle", "canvas-b", "canvas-suffix"],
  "layout placeholders preserve order beside filtered nodes and multiple canvases",
);
const canvasPlaceholderA = canvasExcludedCapture.querySelector(
  "#canvas-a",
) as unknown as HTMLElement;
const canvasPlaceholderB = canvasExcludedCapture.querySelector(
  "#canvas-b",
) as unknown as HTMLElement;
for (const placeholder of [canvasPlaceholderA, canvasPlaceholderB]) {
  assert.equal(placeholder.localName, "div");
  assert.equal(placeholder.style.visibility, "hidden");
  assert.equal(placeholder.style.boxSizing, "border-box");
}
assert.equal(canvasPlaceholderA.style.width, "80px");
assert.equal(canvasPlaceholderA.style.height, "30px");
assert.equal(canvasPlaceholderB.style.width, "60px");
assert.equal(canvasPlaceholderB.style.height, "50px");
assert.equal(canvasA.parentElement, canvasLayout);
assert.equal(canvasA.getAttribute("data-glass-capture-id"), "caller-canvas");
assert.equal(
  canvasLayout.getAttribute("data-glass-capture-id"),
  "caller-parent",
);
assert.equal(canvasB.hasAttribute("data-glass-capture-id"), false);
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  (error: unknown) =>
    error instanceof GlassResourceError &&
    error.message.includes("canvas is unreadable"),
  "an unreadable retained canvas selects the local native fallback",
);
assert.equal(canvasSerializations, 1);
assert.equal(canvasA.getAttribute("data-glass-capture-id"), "caller-canvas");
assert.equal(
  canvasLayout.getAttribute("data-glass-capture-id"),
  "caller-parent",
);
canvasLayout.remove();
const canvasHost = document.createElement("x-canvas-layout");
canvasHost.attachShadow({ mode: "open" }).innerHTML = "<slot></slot>";
canvasHost.append(canvasA);
target.append(canvasHost);
const beforeSlottedCanvasReads = canvasSerializations;
await assert.rejects(
  captureGlassBackground(
    target as unknown as HTMLElement,
    new Set([...blocked, canvasA as unknown as Element]),
  ),
  (error: unknown) =>
    error instanceof GlassResourceError &&
    error.message.includes("unsupported layout"),
  "flattened shadow slots use native fallback instead of guessing a placeholder parent",
);
assert.equal(canvasSerializations, beforeSlottedCanvasReads);
assert.equal(canvasA.parentElement, canvasHost);
assert.equal(canvasA.getAttribute("data-glass-capture-id"), "caller-canvas");
assert.equal(canvasHost.hasAttribute("data-glass-capture-id"), false);
canvasHost.remove();
const blockedSvg = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "svg",
);
blockedSvg.id = "excluded-svg";
const svgImage = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "image",
);
svgImage.setAttribute("href", "https://example.test/no-cors.png");
svgImage.setAttribute("data-test-embed-failure", "true");
blockedSvg.append(svgImage);
target.append(blockedSvg);
await captureGlassBackground(
  target as unknown as HTMLElement,
  new Set([...blocked, blockedSvg as unknown as Element]),
);
const svgExcludedCapture = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
assert.equal(
  svgExcludedCapture.querySelector("#excluded-svg")?.childNodes.length,
  0,
);
assert.equal(blockedSvg.childNodes.length, 1);
assert.equal(blockedSvg.hasAttribute("data-glass-capture-id"), false);
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /image embedding failed/,
);
blockedSvg.remove();
const native = document.createElement("textarea");
native.scrollTop = 4;
target.append(native);
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /native form content/,
);
assert.equal(native.hasAttribute("data-glass-capture-id"), false);
native.remove();
const scaledAncestor = document.createElement("section");
scaledAncestor.style.transform = "matrix(0.5,0,0,0.5,0,0)";
const scaledTarget = document.createElement("main");
scaledTarget.style.cssText =
  "position:relative;transform:none;width:640px;height:400px;box-sizing:border-box";
scaledAncestor.append(scaledTarget);
document.body.append(scaledAncestor);
bounds(scaledTarget as unknown as Element, 100, 40, 320, 200);
scaledTarget.innerHTML =
  '<p id="scaled-copy" style="width:480px;font-size:16px">Original layout width and font size</p><div id="scaled-scroll" style="position:relative;transform:none;width:300px;height:200px;overflow:auto"><div id="scaled-sticky" style="position:sticky;transform:none;width:100px;height:20px">Sticky</div></div><div id="scaled-fixed" style="position:fixed;transform:none;width:80px;height:30px">Fixed</div>';
const scaledScroll = scaledTarget.querySelector(
  "#scaled-scroll",
) as unknown as HTMLElement;
const scaledSticky = scaledTarget.querySelector(
  "#scaled-sticky",
) as unknown as HTMLElement;
const scaledFixed = scaledTarget.querySelector(
  "#scaled-fixed",
) as unknown as HTMLElement;
bounds(scaledScroll, 120, 50, 150, 100);
bounds(scaledSticky, 130, 60, 50, 10);
bounds(scaledFixed, 130, 60, 40, 15);
scaledScroll.scrollTop = 20;
scaledScroll.scrollLeft = 4;
await captureGlassBackground(scaledTarget as unknown as HTMLElement, new Set());
assert.equal(
  lastOptions?.width,
  640,
  "ancestor scaling must not reflow the cloned layout to 320 CSS pixels",
);
assert.equal(lastOptions?.height, 400);
const scaledCapture = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
assert.equal(
  scaledCapture.querySelector("foreignObject")?.getAttribute("transform"),
  "matrix(0.5 0 0 0.5 100 40)",
);
assert.equal(
  scaledCapture.querySelector("foreignObject")?.getAttribute("width"),
  "640",
);
assert.equal(
  (scaledCapture.querySelector("#scaled-copy") as unknown as HTMLElement).style
    .width,
  "480px",
);
assert.equal(
  (scaledCapture.querySelector("#scaled-copy") as unknown as HTMLElement).style
    .fontSize,
  "16px",
);
const clonedFixed = scaledCapture.querySelector(
  "#scaled-fixed",
) as unknown as HTMLElement;
assert.equal(clonedFixed.style.left, "60px");
assert.equal(clonedFixed.style.top, "40px");
assert.equal(clonedFixed.style.width, "80px");
assert.equal(clonedFixed.style.height, "30px");
const clonedSticky = scaledCapture.querySelector(
  "#scaled-sticky",
) as unknown as HTMLElement;
assert.equal(clonedSticky.style.left, "24px");
assert.equal(clonedSticky.style.top, "40px");
assert.equal(clonedSticky.style.width, "100px");
assert.equal(clonedSticky.style.height, "20px");
assert.match(
  scaledCapture.querySelector("#scaled-scroll")?.innerHTML ?? "",
  /translate\(-4px,\s*-20px\)/,
);
assert.equal(scaledFixed.hasAttribute("data-glass-capture-id"), false);
assert.equal(scaledSticky.hasAttribute("data-glass-capture-id"), false);
assert.equal(scaledScroll.scrollTop, 20);

// The same visual geometry may come from the target itself, including different
// horizontal and vertical scales; the serialized root must not apply it twice.
scaledAncestor.style.transform = "none";
scaledTarget.style.transform = "matrix(0.5,0,0,0.25,10,20)";
bounds(scaledTarget as unknown as Element, 100, 40, 320, 100);
bounds(scaledScroll, 120, 45, 150, 50);
bounds(scaledSticky, 130, 50, 50, 5);
bounds(scaledFixed, 130, 50, 40, 7.5);
await captureGlassBackground(scaledTarget as unknown as HTMLElement, new Set());
const selfScaled = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
assert.equal(
  (selfScaled.querySelector("main") as unknown as HTMLElement).style.transform,
  "none",
);
assert.equal(
  selfScaled.querySelector("foreignObject")?.getAttribute("transform"),
  "matrix(0.5 0 0 0.25 100 40)",
);
scaledFixed.style.transform = "matrix(0.5,0,0,0.5,10,20)";
scaledFixed.style.fontSize = "16px";
bounds(scaledFixed, 130, 50, 20, 3.75);
scaledSticky.style.transform = "matrix(2,0,0,2,0,0)";
bounds(scaledSticky, 130, 50, 100, 10);
await captureGlassBackground(scaledTarget as unknown as HTMLElement, new Set());
const scaledPinned = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
const smallerFixed = scaledPinned.querySelector(
  "#scaled-fixed",
) as unknown as HTMLElement;
assert.equal(
  smallerFixed.style.width,
  "80px",
  "independently scaled fixed text keeps its original layout width",
);
assert.equal(smallerFixed.style.fontSize, "16px");
assert.equal(smallerFixed.style.transform, "scale(0.5,0.5)");
assert.equal(smallerFixed.style.transformOrigin, "0 0");
const largerSticky = scaledPinned.querySelector(
  "#scaled-sticky",
) as unknown as HTMLElement;
assert.equal(largerSticky.style.width, "100px");
assert.equal(largerSticky.style.transform, "scale(2,2)");
assert.equal(
  (largerSticky.previousElementSibling as unknown as HTMLElement).style.width,
  "100px",
  "sticky scaling must not enlarge its original flow placeholder",
);
scaledAncestor.style.transform = "matrix(1,0.2,0,1,0,0)";
await assert.rejects(
  captureGlassBackground(scaledTarget as unknown as HTMLElement, new Set()),
  /unsupported geometry/,
);
scaledAncestor.remove();

target.style.transform = "rotate(15deg)";
const previousCalls = sourceCalls;
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /unsupported geometry/,
);
assert.equal(sourceCalls, previousCalls);
target.style.transform = "none";
await assert.rejects(
  captureGlassBackground(
    target as unknown as HTMLElement,
    new Set([target as unknown as Element]),
  ),
  /target unavailable/,
);
// Trigger the production deadline without spending six seconds waiting for
// a library promise whose completion is independently controlled by this test.
const originalTimeout = globalThis.setTimeout;
let deadline = 0;
globalThis.setTimeout = ((callback: () => void, milliseconds?: number) => {
  const timer = originalTimeout(callback, milliseconds);
  if (deadline && milliseconds === deadline) queueMicrotask(callback);
  return timer;
}) as typeof setTimeout;
try {
  let finishSource = () => {};
  pendingSource = new Promise<void>((resolve) => {
    finishSource = resolve;
  });
  deadline = 6000;
  peakSources = 0;
  await assert.rejects(
    captureGlassBackground(target as unknown as HTMLElement, blocked),
    /capture timed out/,
  );
  pendingSource = undefined;
  releaseFontOwner();
  assert.equal(
    fontListenerCount(),
    0,
    "the final sampling scope releases font listeners",
  );
  assert.equal(
    otherFontListenerCount(),
    2,
    "another document retains its own font lease",
  );
  assert.equal(
    activeSources,
    1,
    "a timed-out capture still owns its library task",
  );
  releaseGlassFrame("timed-out-dom-frame");
  assert.equal(
    revokedFrames.includes("timed-out-dom-frame"),
    false,
    "the fallback deadline does not end the actual DOM reader's frame lease",
  );
  assert.equal(scroller.getAttribute("data-glass-capture-id"), "caller-value");
  assert.equal(pinned.hasAttribute("data-glass-capture-id"), false);
  const retry = await captureGlassBackground(
    target as unknown as HTMLElement,
    blocked,
  ).then(
    () => null,
    (error: unknown) => error,
  );
  assert.equal(
    peakSources,
    1,
    "a retry cannot overlap the timed-out DOM sampling task",
  );
  assert.ok(retry instanceof Error);
  assert.match(retry.message, /capture still active/);
  finishSource();
  await new Promise<void>((resolve) => originalTimeout(resolve, 0));
  deadline = 0;
  const fontsBeforeResume = fontCalls;
  fontEvents.dispatchEvent(new window.Event("loadingdone"));
  releaseFontOwner = acquireGlassCaptureFonts(document as unknown as Document);
  assert.equal(fontListenerCount(), 2);
  await captureGlassBackground(target as unknown as HTMLElement, blocked);
  assert.equal(
    fontCalls,
    fontsBeforeResume + 1,
    "resuming after an unobserved font change discards old CSS",
  );
  fontEvents.dispatchEvent(new window.Event("loadingdone"));
  await captureGlassBackground(target as unknown as HTMLElement, blocked);
  assert.equal(
    fontCalls,
    fontsBeforeResume + 2,
    "re-enabled scopes resume version monitoring",
  );
  assert.equal(activeSources, 0);
  assert.equal(peakSources, 1);
  assert.equal(revokedFrames.includes("timed-out-dom-frame"), true);

  let finishFont = () => {};
  pendingFont = new Promise<void>((resolve) => {
    finishFont = resolve;
  });
  fontEvents.dispatchEvent(new window.Event("loadingdone"));
  deadline = 4000;
  peakFonts = 0;
  await assert.rejects(
    captureGlassBackground(target as unknown as HTMLElement, blocked),
    /capture timed out/,
  );
  pendingFont = undefined;
  releaseFontOwner();
  assert.equal(fontListenerCount(), 0);
  assert.equal(activeFonts, 1);
  releaseGlassFrame("timed-out-font-frame");
  assert.equal(revokedFrames.includes("timed-out-font-frame"), false);
  const fontRetry = await captureGlassBackground(
    target as unknown as HTMLElement,
    blocked,
  ).then(
    () => null,
    (error: unknown) => error,
  );
  assert.equal(
    peakFonts,
    1,
    "font embedding cannot overlap after its deadline either",
  );
  assert.ok(fontRetry instanceof Error);
  assert.match(fontRetry.message, /capture still active/);
  finishFont();
  await Promise.resolve();
  await Promise.resolve();
  deadline = 0;
  releaseFontOwner = acquireGlassCaptureFonts(document as unknown as Document);
  await captureGlassBackground(target as unknown as HTMLElement, blocked);
  assert.equal(activeFonts, 0);
  assert.equal(peakFonts, 1);
  assert.equal(revokedFrames.includes("timed-out-font-frame"), true);
} finally {
  globalThis.setTimeout = originalTimeout;
  releaseFontOwner();
  releaseOtherDocument();
}
assert.equal(fontListenerCount(), 0);
assert.equal(otherFontListenerCount(), 0);
await otherWindow.happyDOM.abort();
const mediaTarget = document.createElement("section");
mediaTarget.dataset.glassCapture = "media";
const mediaImage = document.createElement("img");
mediaImage.setAttribute("data-glass-backdrop", "");
mediaImage.style.objectFit = "cover";
Object.defineProperties(mediaImage, {
  naturalWidth: { value: 1920 },
  naturalHeight: { value: 1080 },
});
mediaTarget.append(mediaImage);
document.body.append(mediaTarget);
bounds(mediaTarget as unknown as Element, 0, 0, 800, 600);
bounds(mediaImage as unknown as Element, 0, 0, 800, 600);
const mediaRegion = { left: 260, top: 180, right: 420, bottom: 300 };
const croppedMedia = await captureGlassBackground(
  mediaTarget as unknown as HTMLElement,
  new Set(),
  true,
  mediaRegion,
);
assert.equal(
  croppedMedia.width,
  320,
  "media raster matches its requested region",
);
assert.equal(croppedMedia.height, 240);
assert.deepEqual(glassCaptureOrigin(croppedMedia), [260, 180]);
assert.equal(glassCapturePixelRatio(croppedMedia), 2);
assert.deepEqual(lastTranslation, [-260, -180]);
Object.assign(globalThis, { innerWidth: 3840, innerHeight: 2400 });
try {
  const cappedDom = await captureGlassBackground(
    target as unknown as HTMLElement,
    blocked,
    false,
    mediaRegion,
  );
  assert.deepEqual(
    glassCaptureOrigin(cappedDom),
    [0, 0],
    "DOM composition keeps viewport coordinates",
  );
  const beforeMediaSourceCalls = sourceCalls;
  const cappedMedia = await captureGlassBackground(
    mediaTarget as unknown as HTMLElement,
    new Set(),
  );
  assert.equal(
    sourceCalls,
    beforeMediaSourceCalls,
    "media bypasses DOM serialization",
  );
  assert.equal(
    lastDrawing?.source,
    mediaImage,
    "normal images draw their own decoded bitmap",
  );
  assert.deepEqual(lastClip, [0, 0, 800, 600]);
  assert.equal(lastScale.length, 2);
  assert.equal(lastScale[0], lastScale[1]);
  assert.ok(lastScale[0] > 0 && lastScale[0] <= 2);
  assert.equal(cappedMedia.width, Math.floor(3840 * lastScale[0]));
  assert.equal(cappedMedia.height, Math.floor(2400 * lastScale[1]));
  mediaImage.setAttribute("data-glass-exclude", "");
  const beforeExcludedMedia = sourceCalls;
  await captureGlassBackground(
    mediaTarget as unknown as HTMLElement,
    new Set(),
  );
  assert.equal(
    sourceCalls,
    beforeExcludedMedia + 1,
    "excluded media keeps DOM capture fallback",
  );
  mediaImage.remove();
  const beforeMissingMedia = sourceCalls;
  await captureGlassBackground(
    mediaTarget as unknown as HTMLElement,
    new Set(),
  );
  assert.equal(
    sourceCalls,
    beforeMissingMedia + 1,
    "missing media keeps DOM capture fallback",
  );
  const video = Object.assign(document.createElement("video"), {
    poster: "/posters/coast.png",
  });
  video.setAttribute("data-glass-backdrop", "");
  video.crossOrigin = "anonymous";
  video.style.objectFit = "cover";
  const playback = { paused: true, currentTime: 0, played: 0, readyState: 4 };
  Object.defineProperties(video, {
    paused: { get: () => playback.paused },
    currentTime: { get: () => playback.currentTime },
    played: { get: () => ({ length: playback.played }) },
    readyState: { get: () => playback.readyState },
    videoWidth: { value: 1920 },
    videoHeight: { value: 1080 },
  });
  mediaTarget.append(video);
  bounds(mediaTarget as unknown as Element, 10, 20, 700, 500);
  bounds(video as unknown as Element, 30, 40, 800, 600);
  const originalDecode = Object.getOwnPropertyDescriptor(
    window.HTMLImageElement.prototype,
    "decode",
  );
  let decodeCalls = 0;
  let finishPoster = () => {};
  let beginPoster = () => {};
  const posterStarted = new Promise<void>((resolve) => {
    beginPoster = resolve;
  });
  let pendingPoster: Promise<void> | undefined = new Promise<void>(
    (resolve) => {
      finishPoster = resolve;
    },
  );
  let failPoster = false;
  Object.defineProperty(window.HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: async function (this: typeof window.HTMLImageElement.prototype) {
      decodeCalls++;
      beginPoster();
      await pendingPoster;
      if (failPoster) throw new Error("Poster decode failed");
      Object.defineProperties(this, {
        naturalWidth: { value: 1200 },
        naturalHeight: { value: 600 },
      });
    },
  });
  const captureMedia = () =>
    captureGlassBackground(mediaTarget as unknown as HTMLElement, new Set());
  try {
    const beforePosterDraws = drawCalls;
    const beforePosterSources = sourceCalls;
    const pendingCanvas = captureMedia();
    await posterStarted;
    assert.equal(
      drawCalls,
      beforePosterDraws,
      "capture waits for the poster bitmap to decode",
    );
    finishPoster();
    const posterCanvas = await pendingCanvas;
    pendingPoster = undefined;
    const poster = lastDrawing?.source;
    assert.ok(
      poster instanceof window.HTMLImageElement,
      "unplayed paused video captures its visible poster instead of the empty video frame",
    );
    assert.notEqual(poster, video);
    assert.equal(poster.src, new URL(video.poster, document.URL).href);
    assert.equal(poster.crossOrigin, "anonymous");
    assert.deepEqual(
      lastDrawing?.coordinates,
      [-170, 40, 1200, 600],
      "cover uses poster dimensions with the original video bounds",
    );
    assert.deepEqual(
      lastClip,
      [10, 20, 700, 500],
      "poster drawing keeps the capture target clipping rectangle",
    );
    assert.equal(
      sourceCalls,
      beforePosterSources,
      "poster capture stays on the media-only path",
    );
    assert.equal(posterCanvas.width, Math.floor(3840 * lastScale[0]));
    assert.equal(posterCanvas.height, Math.floor(2400 * lastScale[1]));
    assert.ok(posterCanvas.width * posterCanvas.height <= 8_388_608);

    const toolbar = document.createElement("div");
    toolbar.id = "ordinary-media-toolbar";
    toolbar.style.backgroundColor = "rgb(34, 51, 68)";
    toolbar.textContent = "Ordinary toolbar background";
    mediaTarget.append(toolbar);
    const beforeCompositeSources = sourceCalls;
    const beforeCompositeDraws = drawings.length;
    const composited = await captureGlassBackground(
      mediaTarget as unknown as HTMLElement,
      new Set(),
      false,
    );
    const compositeDraws = drawings.slice(beforeCompositeDraws);
    assert.equal(
      sourceCalls,
      beforeCompositeSources + 1,
      "a DOM-backed media capture serializes the ordinary toolbar",
    );
    assert.equal(
      compositeDraws.length,
      3,
      "capture first paints its decoded media, then media and DOM into the output canvas",
    );
    assert.ok(compositeDraws[0]?.source instanceof window.HTMLImageElement);
    assert.equal(
      compositeDraws[1]?.source,
      compositeDraws[0]?.canvas,
      "the decoded poster canvas is the output's base layer",
    );
    assert.ok(
      compositeDraws[2]?.source instanceof CaptureImage,
      "the rasterized DOM paints after the media base",
    );
    assert.equal(compositeDraws[1]?.canvas, composited);
    assert.equal(compositeDraws[2]?.canvas, composited);
    assert.deepEqual(compositeDraws[1]?.coordinates, [0, 0]);
    assert.deepEqual(
      compositeDraws[2]?.coordinates,
      [0, 0, composited.width, composited.height],
      "logical DOM coordinates scale to the media layer's viewport pixels",
    );
    const mediaCanvas = compositeDraws[0]?.canvas;
    assert.ok(mediaCanvas instanceof window.HTMLCanvasElement);
    assert.equal(mediaCanvas.width, composited.width);
    assert.equal(mediaCanvas.height, composited.height);
    const compositeXml = new window.DOMParser().parseFromString(
      drawnSource,
      "image/svg+xml",
    );
    const compositeForeign = compositeXml.querySelector("foreignObject");
    assert.equal(
      compositeXml.documentElement.getAttribute("viewBox"),
      "0 0 3840 2400",
    );
    assert.equal(compositeForeign?.getAttribute("x"), "10");
    assert.equal(compositeForeign?.getAttribute("y"), "20");
    assert.ok(compositeXml.querySelector("#ordinary-media-toolbar"));
    assert.equal(
      compositeXml.querySelector("video"),
      null,
      "DOM overlay excludes the video already painted in its base layer",
    );
    const beforeMediaOnlySources = sourceCalls;
    await captureMedia();
    assert.equal(
      sourceCalls,
      beforeMediaOnlySources,
      "default media-only capture still bypasses DOM serialization",
    );
    toolbar.remove();

    video.style.objectFit = "contain";
    await captureMedia();
    assert.ok(lastDrawing?.source instanceof window.HTMLImageElement);
    assert.deepEqual(
      lastDrawing?.coordinates,
      [30, 140, 800, 400],
      "contain centers the poster without stretching it to the video aspect ratio",
    );
    video.style.objectFit = "cover";
    playback.readyState = 0;
    await captureMedia();
    assert.ok(
      lastDrawing?.source instanceof window.HTMLImageElement,
      "the visible poster remains capturable before video frame readiness",
    );
    playback.readyState = 4;

    for (const state of [
      { paused: false, currentTime: 0, played: 0 },
      { paused: true, currentTime: 0, played: 1 },
      { paused: true, currentTime: 2, played: 0 },
    ]) {
      Object.assign(playback, state);
      const beforeDecode = decodeCalls;
      await captureMedia();
      assert.equal(
        lastDrawing?.source,
        video,
        `video frame stays authoritative for ${JSON.stringify(state)}`,
      );
      assert.equal(
        decodeCalls,
        beforeDecode,
        "playback and seek states do not decode a poster",
      );
    }
    Object.assign(playback, { paused: true, currentTime: 0, played: 0 });
    video.poster = "";
    await captureMedia();
    assert.equal(
      lastDrawing?.source,
      video,
      "a ready video without poster keeps its existing frame path",
    );
    playback.readyState = 0;
    await assert.rejects(captureMedia(), /video is not ready/);
    playback.readyState = 4;
    video.poster = "/posters/coast.png";
    failPoster = true;
    await assert.rejects(
      captureMedia(),
      /Poster decode failed/,
      "failed poster decoding must not silently draw a transparent video frame",
    );
    failPoster = false;
    await captureMedia();
    assert.ok(
      lastDrawing?.source instanceof window.HTMLImageElement,
      "a later poster capture recovers after decoding fails",
    );
    tainted = true;
    await assert.rejects(
      captureMedia(),
      /tainted canvas/,
      "poster captures retain the canvas pixel-read safety check",
    );
    tainted = false;

    video.setAttribute("data-glass-exclude", "");
    const beforeExcludedVideo = sourceCalls;
    const beforeExcludedDecode = decodeCalls;
    await captureMedia();
    assert.equal(
      sourceCalls,
      beforeExcludedVideo + 1,
      "excluded video keeps DOM fallback",
    );
    assert.equal(
      decodeCalls,
      beforeExcludedDecode,
      "excluded video never decodes a poster",
    );
  } finally {
    tainted = false;
    if (originalDecode)
      Object.defineProperty(
        window.HTMLImageElement.prototype,
        "decode",
        originalDecode,
      );
    else Reflect.deleteProperty(window.HTMLImageElement.prototype, "decode");
    video.remove();
  }
  for (const captured of [cappedDom, cappedMedia])
    assert.ok(
      captured.width * captured.height <= 8_388_608,
      `capture respects its pixel cap after rounding: ${captured.width}x${captured.height}`,
    );
} finally {
  Object.assign(globalThis, { innerWidth: 1024, innerHeight: 768 });
  mediaTarget.remove();
}
target.remove();
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /target unavailable/,
);
await window.happyDOM.abort();
URL.revokeObjectURL = revokeFrame;
console.log(
  "viewport, exclusions, scroll, font cache, taint and restoration passed",
);
