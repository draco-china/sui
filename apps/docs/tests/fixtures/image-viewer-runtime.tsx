import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";

const window = new HappyWindow({
  url: "http://localhost",
}) as unknown as Window &
  typeof globalThis & { happyDOM: { close: () => Promise<void> } };
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  ShadowRoot: window.ShadowRoot,
  SVGElement: window.SVGElement,
  HTMLIFrameElement: window.HTMLIFrameElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  innerWidth: 1024,
  innerHeight: 768,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, {
  ResizeObserver: Observer,
  IntersectionObserver: Observer,
});
const mediaListeners = new Set<EventListenerOrEventListenerObject>();
window.matchMedia = () =>
  ({
    matches: false,
    addEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) => mediaListeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) => mediaListeners.delete(listener),
  }) as unknown as MediaQueryList;
Object.defineProperty(window.HTMLImageElement.prototype, "complete", {
  configurable: true,
  get: () => false,
});
const wheelTargets = new Set<EventTarget>();
const nativeAdd = window.HTMLElement.prototype.addEventListener;
const nativeRemove = window.HTMLElement.prototype.removeEventListener;
window.HTMLElement.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  if (type === "wheel" && this.getAttribute("role") === "none")
    wheelTargets.add(this);
  return nativeAdd.call(this, type, listener, options);
};
window.HTMLElement.prototype.removeEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions,
) {
  if (type === "wheel") wheelTargets.delete(this);
  return nativeRemove.call(this, type, listener, options);
};
const { act, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ImageViewer } = await import("@workspace/ui/components/image-viewer");
const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
async function interaction(callback: () => void) {
  await act(async () => {
    callback();
    await wait();
  });
}
function popup(name: string) {
  const matching = [
    ...document.querySelectorAll<HTMLElement>('[data-slot="image-viewer"]'),
  ].find(
    (candidate) =>
      candidate.querySelector('[data-slot="dialog-title"]')?.textContent ===
      name,
  );
  assert.ok(
    matching,
    `viewer ${name} must be distinguishable from other instances`,
  );
  return matching;
}
function button(panel: HTMLElement, label: string) {
  const element = [...panel.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) =>
      candidate.getAttribute("aria-label") === label ||
      candidate.textContent === label,
  );
  assert.ok(element, `missing ${label} button`);
  return element;
}
function mainImage(panel: HTMLElement) {
  const image = panel.querySelector<HTMLImageElement>('img[draggable="false"]');
  assert.ok(image);
  return image;
}
function stage(panel: HTMLElement) {
  const element = panel.querySelector<HTMLElement>('[role="none"]');
  assert.ok(element);
  return element;
}
async function loadImage(panel: HTMLElement) {
  await interaction(() =>
    mainImage(panel).dispatchEvent(new window.Event("load")),
  );
  assert.equal(panel.textContent?.includes("Loading image…"), false);
  assert.equal(panel.querySelector('[role="alert"]'), null);
}
async function click(panel: HTMLElement, label: string) {
  await interaction(() => button(panel, label).click());
}
async function key(panel: HTMLElement, value: string) {
  await interaction(() =>
    panel.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
}
async function pointer(
  surface: HTMLElement,
  type: string,
  id: number,
  x: number,
  y: number,
  button = 0,
) {
  await interaction(() =>
    surface.dispatchEvent(
      new window.PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: id,
        clientX: x,
        clientY: y,
        button,
      }),
    ),
  );
}
function clean(panel: HTMLElement) {
  assert.equal(
    mainImage(panel).style.transform,
    "translate(0px, 0px) scale(1) rotate(0deg)",
  );
  assert.equal(button(panel, "Reset image").disabled, true);
}

const gallery = ["/one.png", "/two.png", "/three.png"];
const changes: number[] = [];
let commitIndex = true;
let setControlledIndex: (index: number) => void = () => {};
let setControlledOpen: (open: boolean) => void = () => {};
let setGallery: (images: string[]) => void = () => {};
let closeCount = 0;
function ControlledGallery() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState(gallery);
  setControlledIndex = setIndex;
  setControlledOpen = setOpen;
  setGallery = setImages;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(2);
          setOpen(true);
        }}
      >
        Open third photo
      </button>
      <ImageViewer
        images={images}
        open={open}
        index={index}
        alt="Gallery"
        labels={{ viewer: "Controlled gallery" }}
        onIndexChange={(next) => {
          changes.push(next);
          if (commitIndex) setIndex(next);
        }}
        onClose={() => {
          closeCount++;
          setOpen(false);
        }}
      />
    </>
  );
}
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
await interaction(() => root.render(<ControlledGallery />));
assert.equal(
  document.querySelector('[data-slot="image-viewer"]'),
  null,
  "closed viewer should have no popup",
);
const opener = host.querySelector<HTMLButtonElement>("button");
assert.ok(opener);
await interaction(() => {
  opener.focus();
  opener.click();
});
let panel = popup("Controlled gallery");
assert.equal(
  mainImage(panel).getAttribute("src"),
  gallery[2],
  "a clicked gallery preview controls the initial photo",
);
assert.ok(panel.textContent?.includes("Loading image…"));
assert.ok(
  panel.contains(document.activeElement),
  "opening moves focus into the modal",
);
assert.equal(
  [...panel.querySelectorAll("button")].some((element) =>
    /fullscreen/i.test(element.getAttribute("aria-label") ?? ""),
  ),
  false,
  "image viewer has no redundant browser fullscreen control",
);
clean(panel);
let captureBeforeLoad = false;
const loadingSurface = stage(panel);
loadingSurface.setPointerCapture = () => {
  captureBeforeLoad = true;
};
await pointer(loadingSurface, "pointerdown", 99, 10, 10);
await pointer(loadingSurface, "pointermove", 99, 50, 50);
assert.equal(captureBeforeLoad, false, "pending image cannot start a drag");
clean(panel);
await loadImage(panel);
await click(panel, "Zoom in");
assert.equal(button(panel, "Reset image").disabled, false);
assert.ok(mainImage(panel).style.transform.includes("scale(1.25)"));
await click(panel, "Rotate clockwise");
assert.ok(mainImage(panel).style.transform.includes("rotate(90deg)"));
await click(panel, "Reset image");
clean(panel);
await click(panel, "Rotate counterclockwise");
assert.ok(mainImage(panel).style.transform.includes("rotate(-90deg)"));
await click(panel, "Next image");
assert.equal(changes.at(-1), 0, "next wraps to the first gallery item");
assert.equal(mainImage(panel).getAttribute("src"), gallery[0]);
assert.ok(panel.textContent?.includes("Loading image…"));
clean(panel);
await loadImage(panel);

commitIndex = false;
await click(panel, "Next image");
assert.equal(changes.at(-1), 1);
assert.equal(
  mainImage(panel).getAttribute("src"),
  gallery[0],
  "controlled selection requests cannot override an unchanged prop",
);
await interaction(() => setControlledIndex(1));
assert.equal(mainImage(panel).getAttribute("src"), gallery[1]);
commitIndex = true;
const failedImage = mainImage(panel);
await interaction(() => failedImage.dispatchEvent(new window.Event("error")));
assert.equal(
  panel.querySelector('[role="alert"]')?.textContent,
  "Unable to load image",
);
await click(panel, "Retry");
assert.notEqual(
  mainImage(panel),
  failedImage,
  "retry creates a fresh image request for the same URL",
);
assert.equal(mainImage(panel).getAttribute("src"), gallery[1]);
assert.equal(panel.querySelector('[role="alert"]'), null);
assert.ok(panel.textContent?.includes("Loading image…"));
await interaction(() => failedImage.dispatchEvent(new window.Event("load")));
assert.ok(
  panel.textContent?.includes("Loading image…"),
  "a detached stale request cannot mark the retry ready",
);
await loadImage(panel);
await interaction(() =>
  setGallery(["/changed.png", "/replacement.png", gallery[2]]),
);
assert.equal(mainImage(panel).getAttribute("src"), "/replacement.png");
assert.ok(
  panel.textContent?.includes("Loading image…"),
  "same index with a new URL must return to loading",
);
await loadImage(panel);

const surface = stage(panel);
const captures: number[] = [];
surface.setPointerCapture = (id) => captures.push(id);
await pointer(surface, "pointerdown", 1, 10, 20);
await pointer(surface, "pointermove", 1, 45, 55);
assert.deepEqual(captures, [1]);
assert.ok(
  mainImage(panel).style.transform.startsWith("translate(35px, 35px)"),
  "drag pans in image space",
);
assert.equal(button(panel, "Reset image").disabled, false);
await pointer(surface, "pointercancel", 1, 45, 55);
const afterCancel = mainImage(panel).style.transform;
await pointer(surface, "pointermove", 1, 200, 200);
assert.equal(
  mainImage(panel).style.transform,
  afterCancel,
  "cancelled pointers no longer pan",
);
assert.equal(
  mainImage(panel).style.transition,
  "transform 150ms ease",
  "cancel exits active dragging",
);
await click(panel, "Reset image");
await pointer(surface, "pointerdown", 2, 0, 0);
await pointer(surface, "pointerdown", 3, 100, 0);
await pointer(surface, "pointermove", 3, 200, 0);
assert.ok(
  mainImage(panel).style.transform.includes("scale(2)"),
  "two fingers scale relative to their initial separation",
);
assert.ok(
  mainImage(panel).style.transform.startsWith("translate(50px, 0px)"),
  "pinch tracks its center while scaling",
);
await pointer(surface, "pointerup", 3, 200, 0);
await pointer(surface, "pointermove", 2, 20, 0);
assert.ok(
  mainImage(panel).style.transform.startsWith("translate(70px, 0px)"),
  "remaining finger continues smoothly after pinch",
);
await pointer(surface, "lostpointercapture", 2, 20, 0);
const afterRelease = mainImage(panel).style.transform;
await pointer(surface, "pointermove", 2, 100, 100);
assert.equal(
  mainImage(panel).style.transform,
  afterRelease,
  "lost capture clears the remaining gesture",
);
await click(panel, "Reset image");
clean(panel);
await pointer(button(panel, "Next image"), "pointerdown", 4, 0, 0);
assert.deepEqual(
  captures,
  [1, 2, 3],
  "navigation controls cannot initiate stage panning",
);
await pointer(surface, "pointerdown", 5, 0, 0, 2);
assert.deepEqual(
  captures,
  [1, 2, 3],
  "secondary pointer buttons cannot initiate panning",
);
let prevented = false;
await interaction(() => {
  const event = new window.WheelEvent("wheel", {
    deltaY: -10,
    cancelable: true,
    bubbles: true,
  });
  surface.dispatchEvent(event);
  prevented = event.defaultPrevented;
});
assert.equal(
  prevented,
  true,
  "wheel zoom does not scroll the surrounding page",
);
assert.ok(mainImage(panel).style.transform.includes("scale(1.25)"));
await key(panel, "+");
assert.ok(mainImage(panel).style.transform.includes("scale(1.5)"));
await key(panel, "-");
assert.ok(mainImage(panel).style.transform.includes("scale(1.25)"));
await key(panel, "0");
clean(panel);
await key(panel, "ArrowRight");
assert.equal(mainImage(panel).getAttribute("src"), gallery[2]);
clean(panel);
await loadImage(panel);
await click(panel, "Open Gallery 1");
assert.equal(
  mainImage(panel).getAttribute("src"),
  "/changed.png",
  "thumbnail buttons select their distinct gallery item",
);
await key(panel, "Escape");
assert.equal(closeCount, 1, "Escape requests close once");
assert.equal(document.querySelector('[data-slot="image-viewer"]'), null);
assert.equal(
  document.activeElement,
  opener,
  "closing restores focus to the opener",
);
assert.equal(
  wheelTargets.has(surface),
  false,
  "closed stage releases its native wheel listener",
);
await interaction(() => setControlledOpen(true));
panel = popup("Controlled gallery");
clean(panel);
await click(panel, "Close image viewer");
assert.equal(closeCount, 2);
await interaction(() => root.unmount());
host.remove();

let localClose = 0;
const localChanges: number[] = [];
const localHost = document.createElement("div");
const otherHost = document.createElement("div");
document.body.append(localHost, otherHost);
const localRoot = createRoot(localHost);
const otherRoot = createRoot(otherHost);
await interaction(() =>
  localRoot.render(
    <ImageViewer
      images={gallery}
      open
      initialIndex={1}
      labels={{ viewer: "Local gallery" }}
      onIndexChange={(next) => localChanges.push(next)}
      onClose={() => localClose++}
    />,
  ),
);
const localPanel = popup("Local gallery");
assert.equal(mainImage(localPanel).getAttribute("src"), gallery[1]);
await loadImage(localPanel);
await interaction(() =>
  otherRoot.render(
    <ImageViewer
      images="/solo.png"
      open
      labels={{ viewer: "Other gallery" }}
      onClose={() => {}}
    />,
  ),
);
const otherPanel = popup("Other gallery");
await loadImage(otherPanel);
assert.equal(
  otherPanel.querySelector('[data-slot="image-viewer-thumbnails"]'),
  null,
  "single image does not expose a redundant gallery strip",
);
assert.equal(otherPanel.querySelector('[aria-label="Next image"]'), null);
await click(localPanel, "Zoom in");
assert.ok(mainImage(localPanel).style.transform.includes("scale(1.25)"));
clean(otherPanel);
await click(localPanel, "Previous image");
assert.equal(mainImage(localPanel).getAttribute("src"), gallery[0]);
assert.equal(
  localChanges.at(-1),
  0,
  "uncontrolled index changes update locally and report the selection",
);
assert.equal(
  mainImage(otherPanel).getAttribute("src"),
  "/solo.png",
  "separate viewers retain independent selection",
);
clean(localPanel);
await loadImage(localPanel);
const localSurface = stage(localPanel);
localSurface.setPointerCapture = () => {};
await pointer(localSurface, "pointerdown", 6, 20, 30);
await pointer(localSurface, "pointermove", 6, 30, 40);
const detachedImage = mainImage(localPanel);
const detachedTransform = detachedImage.style.transform;
await interaction(() => localRoot.unmount());
assert.equal(wheelTargets.has(localSurface), false);
await interaction(() => {
  localSurface.dispatchEvent(new window.WheelEvent("wheel", { deltaY: -10 }));
  localSurface.dispatchEvent(
    new window.PointerEvent("pointermove", {
      pointerId: 6,
      clientX: 100,
      clientY: 100,
      bubbles: true,
    }),
  );
});
assert.equal(
  detachedImage.style.transform,
  detachedTransform,
  "detached gesture events cannot mutate an unmounted viewer",
);
await interaction(() => otherRoot.unmount());
assert.equal(
  mediaListeners.size,
  0,
  "all reduced-motion subscriptions release after the final viewer",
);
assert.equal(
  wheelTargets.size,
  0,
  "all image stages release their native wheel listeners",
);
assert.equal(localClose, 0, "unmount does not synthesize a user close action");
localHost.remove();
otherHost.remove();
const emptyHost = document.createElement("div");
document.body.append(emptyHost);
const emptyRoot = createRoot(emptyHost);
await interaction(() =>
  emptyRoot.render(
    <ImageViewer
      images={[]}
      open
      onClose={() => {
        throw new Error("empty close");
      }}
    />,
  ),
);
assert.equal(
  document.querySelector('[data-slot="image-viewer"]'),
  null,
  "empty galleries do not mount a modal or actions",
);
await interaction(() => emptyRoot.unmount());
emptyHost.remove();
await window.happyDOM.close();
console.log(
  "ImageViewer controlled state, loading, retry, gestures, keyboard and cleanup passed",
);
