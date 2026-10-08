import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Window as HappyWindow } from "happy-dom";
import { cssForHappyDOM } from "./css-color";

const window = new HappyWindow({
  url: "http://localhost",
}) as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
const document = window.document;
const themeCSS = readFileSync(
  new URL("../../../../packages/ui/src/styles/globals.css", import.meta.url),
  "utf8",
);
const style = document.createElement("style");
const themeRules = [
  themeCSS.match(/:root\s*\{[^}]+\}/)?.[0],
  themeCSS.match(/\.dark\s*\{[^}]+\}/)?.[0],
];
for (const rule of themeRules) {
  assert.ok(rule, "both theme mode definitions must exist");
  for (const name of ["card", "foreground"]) {
    const color = rule.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];
    assert.match(
      color ?? "",
      /^oklch\([.\d]+ [.\d]+ [.\d]+\)$/,
      "production scan colors retain native OKLCH tokens",
    );
  }
}
style.textContent = cssForHappyDOM(
  [
    ...themeRules,
    ".bg-card{background-color:var(--card)}",
    ".bg-transparent{background-color:transparent}",
    ".text-foreground{color:var(--foreground)}",
    ".border-card{border-color:var(--card)}",
    ".bg-primary{background-color:var(--primary)}",
    ".text-primary{color:var(--primary)}",
  ].join("\n"),
);
document.head.append(style);
let hidden = false;
Object.defineProperty(document, "hidden", {
  configurable: true,
  get: () => hidden,
});
Object.assign(globalThis, {
  window,
  document,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  innerWidth: 1024,
  innerHeight: 768,
  Node: window.Node,
  getComputedStyle: window.getComputedStyle.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
const mediaListeners = new Set<() => void>();
type Query = {
  matches: boolean;
  listeners: Set<() => void>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};
const queries = new Map<string, Query>();
function mediaQuery(query: string) {
  let entry = queries.get(query);
  if (!entry) {
    const listeners = new Set<() => void>();
    entry = {
      matches: false,
      listeners,
      addEventListener: (_type, listener) => {
        listeners.add(listener);
        mediaListeners.add(listener);
      },
      removeEventListener: (_type, listener) => {
        listeners.delete(listener);
        mediaListeners.delete(listener);
      },
    };
    queries.set(query, entry);
  }
  return entry;
}
const motionQuery = mediaQuery("(prefers-reduced-motion: reduce)");
window.matchMedia = (query) => mediaQuery(query) as unknown as MediaQueryList;
Object.assign(globalThis, { matchMedia: window.matchMedia });
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
const requestAnimationFrame = (callback: FrameRequestCallback) => {
  const id = ++nextFrame;
  frames.set(id, callback);
  return id;
};
const cancelAnimationFrame = (id: number) => frames.delete(id);
Object.assign(globalThis, { requestAnimationFrame, cancelAnimationFrame });
window.requestAnimationFrame = requestAnimationFrame;
window.cancelAnimationFrame = cancelAnimationFrame;
const liveObservers = new Set<Observer>();
const liveMutationObservers = new Set<MutationObserver>();
class TrackedMutationObserver extends window.MutationObserver {
  constructor(callback: MutationCallback) {
    super(callback);
    liveMutationObservers.add(this);
  }
  disconnect() {
    super.disconnect();
    liveMutationObservers.delete(this);
  }
}
Object.assign(globalThis, { MutationObserver: TrackedMutationObserver });
Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  value(this: HTMLElement) {
    const owner = this.closest<HTMLElement>('[data-slot="qr-code"]');
    const pixels =
      Number.parseFloat(owner?.style.width ?? this.style.width) || 256;
    return new window.DOMRect(0, 0, pixels, pixels);
  },
});
class Observer {
  observe() {
    liveObservers.add(this);
  }
  unobserve() {}
  disconnect() {
    liveObservers.delete(this);
  }
}
Object.assign(globalThis, {
  ResizeObserver: Observer,
  IntersectionObserver: Observer,
});
type DotSample = { x: number; y: number; radius: number };
const canvasDraws = new WeakMap<HTMLCanvasElement, DotSample[]>();
const canvasColors = new WeakMap<HTMLCanvasElement, string>();
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value(this: HTMLCanvasElement) {
    const canvas = this;
    let dots = canvasDraws.get(this);
    if (!dots) {
      dots = [];
      canvasDraws.set(this, dots);
    }
    const samples = dots;
    return {
      setTransform() {},
      clearRect() {
        samples.length = 0;
      },
      beginPath() {},
      arc(x: number, y: number, radius: number) {
        samples.push({ x, y, radius });
      },
      fill() {},
      fillRect() {},
      getImageData() {
        return { data: new Uint8Array([255, 255, 255, 255]) };
      },
      get fillStyle() {
        return canvasColors.get(canvas) ?? "#000";
      },
      set fillStyle(color: string) {
        canvasColors.set(canvas, color);
      },
      globalAlpha: 1,
    };
  },
});
const visibilityListeners = new Set<EventListenerOrEventListenerObject>();
const resizeListeners = new Set<EventListenerOrEventListenerObject>();
const addDocumentListener = document.addEventListener.bind(document);
const removeDocumentListener = document.removeEventListener.bind(document);
document.addEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) => {
  if (type === "visibilitychange") visibilityListeners.add(listener);
  addDocumentListener(type, listener, options);
}) as typeof document.addEventListener;
document.removeEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions,
) => {
  if (type === "visibilitychange") visibilityListeners.delete(listener);
  removeDocumentListener(type, listener, options);
}) as typeof document.removeEventListener;
const addWindowListener = window.addEventListener.bind(window);
const removeWindowListener = window.removeEventListener.bind(window);
window.addEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) => {
  if (type === "resize") resizeListeners.add(listener);
  addWindowListener(type, listener, options);
}) as typeof window.addEventListener;
window.removeEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions,
) => {
  if (type === "resize") resizeListeners.delete(listener);
  removeWindowListener(type, listener, options);
}) as typeof window.removeEventListener;
let nextUrl = 0;
const liveUrls = new Set<string>();
const createdUrls: string[] = [];
const revokedUrls: string[] = [];
URL.createObjectURL = () => {
  const url = `blob:qr-runtime/${++nextUrl}`;
  liveUrls.add(url);
  createdUrls.push(url);
  return url;
};
URL.revokeObjectURL = (url: string) => {
  assert.ok(liveUrls.delete(url), "owned URLs must be revoked exactly once");
  revokedUrls.push(url);
};
type EncoderOptions = {
  data: string;
  margin: number;
  width: number;
  height: number;
  qrOptions?: { mode?: string };
  dotsOptions: { type: string; color: string };
  cornersSquareOptions: { type: string; color: string };
  cornersDotOptions: { type: string; color: string };
  backgroundOptions: { color: string };
};
type Generation = {
  value: string;
  mode?: string;
  options: EncoderOptions;
  extension?: (svg: SVGElement) => void;
  resolve: (value: Blob | undefined) => void;
  reject: (error: Error) => void;
};
const pending: Generation[] = [];
mock.module(
  Bun.resolveSync(
    "qr-code-styling",
    new URL("../../../../packages/ui/src", import.meta.url).pathname,
  ),
  () => ({
    default: class QRCodeStyling {
      private extension?: (svg: SVGElement) => void;
      constructor(private options: EncoderOptions) {}
      applyExtension(extension: (svg: SVGElement) => void) {
        this.extension = extension;
      }
      getRawData() {
        return new Promise<Blob | undefined>((resolve, reject) => {
          pending.push({
            value: this.options.data,
            mode: this.options.qrOptions?.mode,
            options: this.options,
            extension: this.extension,
            resolve: (blob) => {
              if (blob instanceof Blob) {
                const svg = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "svg",
                );
                svg.innerHTML =
                  '<defs><clipPath id="mock-corners-dot-color"><rect width="24" height="24" /></clipPath></defs>';
                this.extension?.(svg);
              }
              resolve(blob);
            },
            reject,
          });
        });
      }
    },
  }),
);
const { act, createRef } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QRCode } = await import("@workspace/ui/components/qr-code");
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
async function render(node: Parameters<typeof root.render>[0]) {
  await act(async () => {
    root.render(node);
    await Promise.resolve();
  });
}
async function resolve(value: string) {
  const generation = pending.find((item) => item.value === value);
  assert.ok(generation, `generation for ${value} must have started`);
  await act(async () =>
    generation.resolve(new Blob(["<svg></svg>"], { type: "image/svg+xml" })),
  );
}
async function frame(time: number) {
  const queued = [...frames.values()];
  frames.clear();
  await act(async () => {
    for (const callback of queued) callback(time);
  });
}
function qr(id: string) {
  const element = document.getElementById(id);
  assert.ok(element, `${id} must be rendered`);
  return element;
}
async function imageEvent(id: string, type: "load" | "error") {
  const image = qr(id).querySelector("image");
  assert.ok(image, "the generated image must exist before it can decode");
  await act(async () => image.dispatchEvent(new window.Event(type)));
}
function themeColors(id: string) {
  const content = qr(id).querySelector<HTMLElement>(
    '[data-slot="qr-code-content"]',
  );
  assert.ok(content);
  const tokens = getComputedStyle(document.documentElement);
  const colors = getComputedStyle(content);
  assert.equal(
    colors.backgroundColor,
    qr(id).dataset.glass === "true"
      ? "transparent"
      : tokens.getPropertyValue("--card"),
  );
  assert.equal(colors.color, tokens.getPropertyValue("--foreground"));
  const logo = qr(id).querySelector<HTMLElement>('[data-slot="qr-code-logo"]');
  if (logo) {
    assert.equal(
      getComputedStyle(logo).backgroundColor,
      tokens.getPropertyValue("--card"),
    );
    assert.equal(getComputedStyle(logo).color, colors.color);
  }
  return { background: colors.backgroundColor, foreground: colors.color };
}

await render(<QRCode id="main" value="first" logo={<span>Brand</span>} />);
assert.equal(qr("main").dataset.state, "loading");
assert.equal(qr("main").getAttribute("aria-busy"), "true");
assert.ok(qr("main").querySelector('[role="status"]'));
assert.equal(
  qr("main").querySelector('[role="status"]')?.textContent,
  "",
  "loading uses no visible or hidden text message",
);
assert.ok(qr("main").querySelector('[data-slot="qr-code-loading"] canvas'));
assert.ok(qr("main").querySelector('[data-slot="qr-code-loading"] pattern'));
assert.equal(
  qr("main").querySelector('[data-slot="loader"],[data-slot="skeleton"]'),
  null,
);
assert.equal(qr("main").querySelector("image"), null);
const initialCanvas = qr("main").querySelector("canvas") as HTMLCanvasElement;
const lightLoading = themeColors("main");
assert.ok(lightLoading.foreground && lightLoading.background);
assert.equal(canvasColors.get(initialCanvas), lightLoading.foreground);
const encodersBeforeLoadingThemeChange = pending.length;
await act(async () => document.documentElement.classList.add("dark"));
await frame(100);
const darkLoading = themeColors("main");
assert.notDeepEqual(darkLoading, lightLoading);
assert.equal(canvasColors.get(initialCanvas), darkLoading.foreground);
assert.equal(
  pending.length,
  encodersBeforeLoadingThemeChange,
  "theme changes recolor the loading dots without re-encoding",
);
await act(async () => document.documentElement.classList.remove("dark"));
await frame(200);
await render(<QRCode id="main" value="second" logo={<span>Brand</span>} />);
await resolve("first");
assert.equal(
  createdUrls.length,
  0,
  "a stale generation cannot allocate or display a URL",
);
assert.equal(qr("main").querySelector("image"), null);
await resolve("second");
assert.equal(createdUrls.length, 1);
const initialDots = canvasDraws.get(
  qr("main").querySelector("canvas") as HTMLCanvasElement,
);
assert.ok(initialDots && initialDots.length > 1);
assert.equal(
  initialDots[0].radius * 2,
  4,
  "one loading dot spans a finder module at half output scale",
);
assert.equal(
  initialDots[1].x - initialDots[0].x,
  8,
  "the reference loading grid leaves one module of space between dots",
);
assert.equal(
  (initialDots[1].x - initialDots[0].x) / (initialDots[0].radius * 2),
  2,
);

assert.equal(
  qr("main").dataset.state,
  "loading",
  "generation is distinct from image readiness",
);
assert.equal(qr("main").querySelector('[data-slot="qr-code-logo"]'), null);
await imageEvent("main", "load");
assert.equal(
  qr("main").dataset.state,
  "ready",
  "the default QR becomes ready immediately after image load",
);
assert.equal(qr("main").querySelectorAll("mask").length, 1);
assert.equal(
  qr("main").querySelector("line"),
  null,
  "the default QR uses its code mask without an animated reveal mask",
);
assert.equal(qr("main").dataset.state, "ready");
assert.equal(qr("main").getAttribute("aria-busy"), "false");
assert.equal(
  qr("main").querySelector('[data-slot="qr-code-logo"]')?.textContent,
  "Brand",
);
assert.equal(qr("main").querySelector("image")?.hasAttribute("mask"), false);
const coloredCode = qr("main").querySelector("g > rect");
assert.ok(coloredCode);
assert.equal(coloredCode.getAttribute("fill"), "currentColor");
assert.ok(coloredCode.getAttribute("mask")?.startsWith("url(#"));
assert.equal(qr("main").querySelector("image")?.parentElement?.tagName, "mask");
const secondGeneration = pending.find((item) => item.value === "second");
assert.ok(secondGeneration);
assert.equal(secondGeneration.options.dotsOptions.color, "#FFFFFF");
assert.equal(secondGeneration.options.cornersSquareOptions.color, "#FFFFFF");
assert.equal(secondGeneration.options.cornersDotOptions.color, "#FFFFFF");
assert.equal(
  secondGeneration.options.backgroundOptions.color,
  "#FFFFFF00",
  "the encoder produces a transparent geometry mask rather than an opaque themed bitmap",
);
const readyUrl = qr("main").querySelector("image")?.getAttribute("href");
const encodersBeforeReadyThemeChange = pending.length;
const lightReady = themeColors("main");
await act(async () => document.documentElement.classList.add("dark"));
const darkReady = themeColors("main");
assert.notDeepEqual(darkReady, lightReady);
assert.equal(getComputedStyle(coloredCode).color, darkReady.foreground);
assert.equal(qr("main").dataset.state, "ready");
assert.equal(qr("main").querySelector("image")?.getAttribute("href"), readyUrl);
assert.equal(pending.length, encodersBeforeReadyThemeChange);
await act(async () => document.documentElement.classList.remove("dark"));
assert.deepEqual(themeColors("main"), lightReady);
await act(async () => {
  document.documentElement.dataset.color = "custom";
  document.documentElement.style.setProperty("--primary", "#ff00ff");
});
assert.deepEqual(
  themeColors("main"),
  lightReady,
  "accent color changes cannot tint the scan foreground or its solid background",
);
assert.equal(getComputedStyle(coloredCode).color, lightReady.foreground);
assert.equal(pending.length, encodersBeforeReadyThemeChange);
assert.equal(frames.size, 0, "a ready QR releases the loading dot matrix");

await render(
  <QRCode id="main" value="second" loading logo={<span>Brand</span>} />,
);
assert.equal(qr("main").dataset.state, "loading");
assert.equal(qr("main").querySelector('[data-slot="qr-code-logo"]'), null);
assert.ok(qr("main").querySelector('[data-slot="qr-code-loading"]'));
assert.equal(
  qr("main")
    .querySelector('[data-slot="qr-code-image"]')
    ?.getAttribute("aria-hidden"),
  "true",
);
assert.equal(
  pending.filter((item) => item.value === "second").length,
  1,
  "loading changes cannot regenerate the content",
);
await render(<QRCode id="main" value="second" logo={<span>Brand</span>} />);
await frame(1000);
await frame(1750);
assert.equal(qr("main").dataset.state, "ready");
await render(
  <QRCode
    id="main"
    value="animated-reveal"
    animated
    logo={<span>Reveal brand</span>}
  />,
);
await resolve("animated-reveal");
await imageEvent("main", "load");
assert.equal(
  qr("main").dataset.state,
  "loading",
  "animated explicitly delays readiness until the reveal finishes",
);
assert.ok(qr("main").querySelector("g")?.hasAttribute("mask"));
assert.equal(qr("main").querySelector('[data-slot="qr-code-logo"]'), null);
await frame(100);
assert.equal(qr("main").dataset.state, "loading");
await frame(1100);
assert.equal(qr("main").dataset.state, "ready");
assert.equal(qr("main").querySelector("g")?.hasAttribute("mask"), false);
assert.equal(
  qr("main").querySelector('[data-slot="qr-code-logo"]')?.textContent,
  "Reveal brand",
);
const oldUrl = qr("main").querySelector("image")?.getAttribute("href");
await render(<QRCode id="main" value="broken" />);
assert.ok(
  oldUrl && revokedUrls.includes(oldUrl),
  "value replacement releases the preceding URL",
);
const broken = pending.find((item) => item.value === "broken");
assert.ok(broken);
await act(async () => broken.reject(new Error("Encoder failed")));
assert.equal(qr("main").dataset.state, "error");
assert.equal(qr("main").getAttribute("aria-busy"), "false");
assert.equal(
  qr("main").querySelector('[role="alert"]')?.textContent,
  "Unable to generate QR code",
);
assert.equal(qr("main").querySelector('[data-slot="qr-code-loading"]'), null);
const errorLightColors = themeColors("main");
const encodersBeforeErrorThemeChange = pending.length;
await act(async () => document.documentElement.classList.add("dark"));
const errorDarkColors = themeColors("main");
assert.notDeepEqual(errorDarkColors, errorLightColors);
assert.equal(qr("main").dataset.state, "error");
assert.equal(
  pending.length,
  encodersBeforeErrorThemeChange,
  "theme changes preserve the failure state without retrying generation",
);
assert.equal(
  getComputedStyle(qr("main").querySelector('[role="alert"]') as HTMLElement)
    .color,
  errorDarkColors.foreground,
);
await act(async () => document.documentElement.classList.remove("dark"));

await render(<QRCode id="main" value="image-error" />);
await resolve("image-error");
await imageEvent("main", "error");
assert.equal(qr("main").dataset.state, "error");
assert.equal(
  qr("main").querySelector('[role="alert"]')?.textContent,
  "Unable to generate QR code",
);
assert.equal(qr("main").querySelector('[data-slot="qr-code-logo"]'), null);
await render(<QRCode id="main" value="文😀" />);
const unicodeGeneration = pending[pending.length - 1];
assert.deepEqual(
  Array.from(unicodeGeneration.value, (byte) => byte.charCodeAt(0)),
  [230, 150, 135, 240, 159, 152, 128],
  "the encoder receives UTF-8 byte characters rather than truncated UTF-16",
);
assert.equal(
  unicodeGeneration.mode,
  "Byte",
  "non-ASCII content must select byte mode explicitly",
);
await act(async () => unicodeGeneration.resolve(new Blob(["<svg></svg>"])));
await imageEvent("main", "load");
await frame(2200);
await frame(2950);
assert.equal(qr("main").dataset.state, "ready");
await render(<QRCode id="main" value="obsolete-error" />);
await render(<QRCode id="main" value="latest-valid" />);
await resolve("latest-valid");
await imageEvent("main", "load");
await frame(3000);
await frame(3750);
const latestUrl = qr("main").querySelector("image")?.getAttribute("href");
const obsoleteError = pending.find((item) => item.value === "obsolete-error");
assert.ok(obsoleteError);
await act(async () =>
  obsoleteError.reject(new Error("Obsolete generation failed")),
);
assert.equal(qr("main").dataset.state, "ready");
assert.equal(
  qr("main").querySelector("image")?.getAttribute("href"),
  latestUrl,
);
await render(<QRCode id="main" value="" label="Waiting for content" />);
assert.equal(qr("main").dataset.state, "loading");
assert.equal(
  qr("main").querySelector('[role="status"]')?.getAttribute("aria-label"),
  "Waiting for content",
);
assert.equal(
  pending.some((item) => item.value === ""),
  false,
  "empty content cannot call the encoder",
);
assert.equal(liveUrls.size, 0);

await render(
  <>
    <QRCode id="one" value="instance-one" animated logo={<span>One</span>} />
    <QRCode id="two" value="instance-two" animated logo={<span>Two</span>} />
  </>,
);
await resolve("instance-one");
await resolve("instance-two");
const one = qr("one").querySelector("image");
const two = qr("two").querySelector("image");
assert.ok(one && two);
assert.notEqual(one.getAttribute("href"), two.getAttribute("href"));
assert.notEqual(
  qr("one").querySelector("mask")?.id,
  qr("two").querySelector("mask")?.id,
);
await imageEvent("one", "load");
await frame(2000);
await frame(2750);
assert.equal(qr("one").dataset.state, "ready");
assert.equal(
  qr("two").dataset.state,
  "loading",
  "one image cannot mark a second QR ready",
);
await imageEvent("two", "error");
assert.equal(qr("two").dataset.state, "error");
assert.equal(
  qr("one").dataset.state,
  "ready",
  "one image failure cannot disturb its peer",
);

const margins = [
  { size: undefined, margin: undefined, pixels: 256, encoded: 32 },
  { size: 192, margin: undefined, pixels: 192, encoded: 512 / 12 },
  { size: 256, margin: 0, pixels: 256, encoded: 0 },
  { size: 320, margin: 24, pixels: 320, encoded: 38.4 },
  { size: 256, margin: -5, pixels: 256, encoded: 0 },
  { size: 128, margin: 999, pixels: 128, encoded: 240 },
  { size: 256, margin: Number.NaN, pixels: 256, encoded: 32 },
  { size: 256, margin: Number.POSITIVE_INFINITY, pixels: 256, encoded: 32 },
  { size: Number.NaN, margin: 16, pixels: 256, encoded: 32 },
  { size: 0, margin: 16, pixels: 64, encoded: 128 },
  { size: 10000, margin: 16, pixels: 1024, encoded: 8 },
];
for (const [index, entry] of margins.entries()) {
  await render(
    <QRCode
      id="main"
      value={`margin-${index}`}
      size={entry.size}
      margin={entry.margin}
    />,
  );
  const generation = pending[pending.length - 1];
  assert.ok(
    Math.abs(generation.options.margin - entry.encoded) < 1e-10,
    "margin maps CSS pixels to the fixed-resolution QR output",
  );
  assert.equal(qr("main").style.width, `${entry.pixels}px`);
  assert.equal(generation.options.width, 512);
  assert.equal(generation.options.height, 512);
}
await render(<QRCode id="main" value="double-scale" size={512} />);
await resolve("double-scale");
const scaledDots = canvasDraws.get(
  qr("main").querySelector("canvas") as HTMLCanvasElement,
);
assert.ok(scaledDots && scaledDots.length > 1);
assert.equal(
  scaledDots[0].radius * 2,
  8,
  "dot diameter follows the display-to-output scale",
);
assert.equal(scaledDots[1].x - scaledDots[0].x, 16);
assert.equal(
  (scaledDots[1].x - scaledDots[0].x) / (scaledDots[0].radius * 2),
  2,
);
await render(<QRCode id="main" value="config-race" size={256} margin={16} />);
const initialConfiguration = pending[pending.length - 1];
await render(<QRCode id="main" value="config-race" size={192} margin={16} />);
const sizeConfiguration = pending[pending.length - 1];
await render(<QRCode id="main" value="config-race" size={192} margin={8} />);
const currentConfiguration = pending[pending.length - 1];
assert.notEqual(initialConfiguration, sizeConfiguration);
assert.notEqual(sizeConfiguration, currentConfiguration);
const urlsBeforeStaleConfigurations = createdUrls.length;
await act(async () => {
  initialConfiguration.resolve(new Blob(["old size"]));
  sizeConfiguration.resolve(new Blob(["old margin"]));
});
assert.equal(
  createdUrls.length,
  urlsBeforeStaleConfigurations,
  "replaced size and margin requests cannot expose stale images",
);
await act(async () =>
  currentConfiguration.resolve(new Blob(["current settings"])),
);
await imageEvent("main", "load");
assert.equal(qr("main").dataset.state, "ready");
assert.equal(qr("main").style.width, "192px");
assert.equal(currentConfiguration.options.margin, (8 / 192) * 512);
const nativeRef = createRef<HTMLDivElement>();
const beforeGlassChange = pending.length;
const plainLightColors = themeColors("main");
await render(
  <QRCode
    id="main"
    ref={nativeRef}
    value="config-race"
    size={192}
    margin={8}
    glass
    logo={<span>Glass brand</span>}
  />,
);
assert.equal(
  nativeRef.current,
  qr("main"),
  "optional glass preserves the native div ref",
);
assert.equal(qr("main").dataset.glass, "true");
assert.equal(
  qr("main")
    .querySelector('[data-slot="qr-code-content"]')
    ?.classList.contains("inset-2"),
  false,
  "glass fills the code surface without a separate 8px rim",
);
assert.ok(
  qr("main")
    .querySelector('[data-slot="qr-code-content"]')
    ?.classList.contains("bg-transparent"),
);
const glassLightColors = themeColors("main");
assert.equal(glassLightColors.foreground, plainLightColors.foreground);
assert.equal(
  qr("main")
    .querySelector('[data-slot="qr-code-content"]')
    ?.hasAttribute("data-glass"),
  false,
  "sharp code content remains real DOM over the single shared glass background",
);
await act(async () => document.documentElement.classList.add("dark"));
const glassDarkColors = themeColors("main");
assert.notDeepEqual(glassDarkColors, glassLightColors);
assert.equal(qr("main").dataset.glass, "true");
assert.equal(qr("main").dataset.state, "ready");
assert.equal(pending.length, beforeGlassChange);
await act(async () => document.documentElement.classList.remove("dark"));
await render(
  <QRCode
    id="main"
    ref={nativeRef}
    value="config-race"
    size={192}
    margin={8}
    glass
    loading
    logo={<span>Glass brand</span>}
  />,
);
assert.equal(qr("main").dataset.state, "loading");
assert.deepEqual(themeColors("main"), glassLightColors);
assert.equal(qr("main").querySelector('[data-slot="qr-code-logo"]'), null);
const glassLoadingCanvas = qr("main").querySelector(
  "canvas",
) as HTMLCanvasElement;
assert.equal(canvasColors.get(glassLoadingCanvas), glassLightColors.foreground);
assert.equal(
  pending.length,
  beforeGlassChange,
  "material changes cannot regenerate or replace QR data",
);
await render(
  <QRCode
    id="main"
    ref={nativeRef}
    value="config-race"
    size={192}
    margin={8}
    glass={false}
  />,
);
assert.equal(qr("main").hasAttribute("data-glass"), false);
assert.equal(
  qr("main")
    .querySelector('[data-slot="qr-code-content"]')
    ?.classList.contains("inset-2"),
  false,
);
assert.equal(pending.length, beforeGlassChange);
assert.deepEqual(
  themeColors("main"),
  plainLightColors,
  "turning off glass restores the solid neutral scan surface",
);
const finder = document.createElementNS("http://www.w3.org/2000/svg", "svg");
finder.innerHTML =
  '<defs><clipPath id="clip-corners-dot-color-0-0"><rect id="finder-24" width="24" height="24" rx="0" ry="0" /></clipPath><clipPath id="clip-corners-dot-color-0-1"><rect id="finder-36" width="36" height="36" /></clipPath><clipPath id="clip-corners-square-color-0-0"><rect id="outer-ring" width="72" height="72" rx="0" ry="0" /></clipPath><clipPath id="ordinary-dot"><rect id="ordinary" width="6" height="6" rx="0" ry="0" /></clipPath></defs>';
assert.ok(
  currentConfiguration.extension,
  "the finder adjustment is registered with the encoder",
);
currentConfiguration.extension(finder);
assert.equal(
  currentConfiguration.options.cornersSquareOptions.type,
  "extra-rounded",
);
assert.equal(currentConfiguration.options.cornersDotOptions.type, "square");
assert.equal(finder.querySelector("#finder-24")?.getAttribute("rx"), "4");
assert.equal(finder.querySelector("#finder-24")?.getAttribute("ry"), "4");
assert.equal(finder.querySelector("#finder-36")?.getAttribute("rx"), "6");
assert.equal(finder.querySelector("#finder-36")?.getAttribute("ry"), "6");
assert.equal(
  finder.querySelector("#outer-ring")?.getAttribute("rx"),
  "0",
  "the inner finder extension leaves the outer ring to the encoder",
);
assert.equal(
  finder.querySelector("#ordinary")?.getAttribute("rx"),
  "0",
  "finder geometry cannot alter data modules",
);

await act(async () => {
  motionQuery.matches = true;
  for (const listener of [...motionQuery.listeners]) listener();
});
await render(
  <QRCode
    id="main"
    value="reduced-motion"
    animated
    logo={<span>Static brand</span>}
  />,
);
await resolve("reduced-motion");
await imageEvent("main", "load");
assert.equal(
  qr("main").dataset.state,
  "ready",
  "reduced motion bypasses the timed reveal",
);
assert.equal(
  qr("main").querySelector('[data-slot="qr-code-logo"]')?.textContent,
  "Static brand",
);
assert.equal(frames.size, 0, "reduced motion leaves no animation callbacks");
await act(async () => {
  motionQuery.matches = false;
  for (const listener of [...motionQuery.listeners]) listener();
});
await render(<QRCode id="main" value="pending-at-unmount" />);
const loadingCanvas = qr("main").querySelector("canvas");
assert.ok(loadingCanvas);
const priorResolution = queries.get("(resolution: 1dppx)");
assert.ok(priorResolution?.listeners.size);
Object.defineProperty(window, "devicePixelRatio", {
  configurable: true,
  value: 2,
});
await act(async () => {
  for (const listener of [...priorResolution.listeners]) listener();
});
await frame(6000);
assert.equal(
  loadingCanvas.width,
  512,
  "DPR updates retain the same CSS-size loading canvas at a sharper backing resolution",
);
assert.equal(loadingCanvas.height, 512);
assert.equal(
  priorResolution.listeners.size,
  0,
  "DPR updates detach the obsolete resolution query",
);
assert.ok(queries.get("(resolution: 2dppx)")?.listeners.size);
await act(async () => {
  hidden = true;
  document.dispatchEvent(new window.Event("visibilitychange"));
});
assert.equal(frames.size, 0, "hidden documents stop the animated placeholder");
await act(async () => {
  hidden = false;
  document.dispatchEvent(new window.Event("visibilitychange"));
});
assert.ok(frames.size > 0 && liveObservers.size > 0);
await act(async () => root.unmount());
const createdAtUnmount = createdUrls.length;
const stillPending = pending.find(
  (item) => item.value === "pending-at-unmount",
);
assert.ok(stillPending);
await act(async () => stillPending.resolve(new Blob(["<svg></svg>"])));
assert.equal(
  createdUrls.length,
  createdAtUnmount,
  "a late result after unmount cannot allocate resources",
);
assert.equal(frames.size, 0, "unmount cancels all animation frames");
assert.equal(
  liveObservers.size,
  0,
  "unmount disconnects every canvas observer",
);
assert.equal(liveUrls.size, 0, "unmount releases each allocated URL");
assert.equal(nativeRef.current, null);
assert.equal(
  liveMutationObservers.size,
  0,
  "unmount disconnects theme observers",
);
assert.equal(mediaListeners.size, 0);
assert.ok(
  [...queries.values()].every((query) => query.listeners.size === 0),
  "every motion, color-scheme and DPR subscription is released",
);
assert.equal(visibilityListeners.size, 0);
assert.equal(resizeListeners.size, 0);
await window.happyDOM.abort();
console.log(
  "QR async state, stale values, image feedback, logo readiness, instance isolation and cleanup passed",
);
