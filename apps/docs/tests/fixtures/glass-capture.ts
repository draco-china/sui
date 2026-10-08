import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";

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
let lastOptions: CaptureOptions | undefined;
let drawnSource = "";
let drawCalls = 0;
let pixelReads = 0;
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
  value: () => ({
    drawImage: () => drawCalls++,
    getImageData: () => {
      pixelReads++;
      if (tainted) throw new Error("SecurityError: tainted canvas");
      return { data: new Uint8Array([0, 0, 0, 255]) };
    },
  }),
});

type HappyElement = InstanceType<typeof window.Element>;
function cloneFiltered(
  element: HappyElement,
  options: CaptureOptions,
): HappyElement {
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
    toSvg: async (target: HappyElement, options: CaptureOptions) => {
      sourceCalls++;
      activeSources++;
      peakSources = Math.max(peakSources, activeSources);
      try {
        await pendingSource;
        lastOptions = options;
        if (failCapture) throw new Error("Resource failed");
        const clone = cloneFiltered(target, options);
        Object.assign((clone as unknown as HTMLElement).style, options.style);
        for (const image of clone.querySelectorAll(
          "img[data-test-embed-failure],image[data-test-embed-failure]",
        )) {
          options.onImageErrorHandler?.({ target: image } as unknown as Event);
          image.setAttribute("src", "");
        }
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}"><foreignObject x="0" y="0" width="100%" height="100%">${new window.XMLSerializer().serializeToString(clone)}</foreignObject></svg>`)}`;
      } finally {
        activeSources--;
      }
    },
  }),
);
const { acquireGlassCaptureFonts, captureGlassBackground } = await import(
  "../../../../packages/ui/src/lib/glass/capture"
);
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
const canvas = await captureGlassBackground(
  target as unknown as HTMLElement,
  blocked,
);
assert.equal(canvas.width, 1024);
assert.equal(canvas.height, 768);
assert.equal(lastOptions?.width, 640);
assert.equal(lastOptions?.height, 1200);
assert.equal(lastOptions?.pixelRatio, 1);
assert.equal(lastOptions?.style?.width, "640px");
assert.equal(lastOptions?.fontEmbedCSS?.includes("font-face"), true);
const captured = new window.DOMParser().parseFromString(
  drawnSource,
  "image/svg+xml",
);
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
  await Promise.resolve();
  await Promise.resolve();
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
} finally {
  globalThis.setTimeout = originalTimeout;
  releaseFontOwner();
  releaseOtherDocument();
}
assert.equal(fontListenerCount(), 0);
assert.equal(otherFontListenerCount(), 0);
await otherWindow.happyDOM.abort();
target.remove();
await assert.rejects(
  captureGlassBackground(target as unknown as HTMLElement, blocked),
  /target unavailable/,
);
await window.happyDOM.abort();
console.log(
  "viewport, exclusions, scroll, font cache, taint and restoration passed",
);
