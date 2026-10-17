import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new Window({ url: "http://localhost" });
const document = window.document;
const observers: { disconnected: boolean }[] = [];
class Observer {
  disconnected = false;
  constructor(_callback: unknown) {
    observers.push(this);
  }
  observe(_element: unknown) {}
  unobserve(_element: unknown) {}
  disconnect() {
    this.disconnected = true;
  }
}
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
  ResizeObserver: Observer,
  IntersectionObserver: Observer,
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
// Reduced transparency keeps the CSS material, so no SVG renderer is needed.
const matchMedia = window.matchMedia.bind(window);
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) =>
    query.includes("prefers-reduced-transparency")
      ? { ...matchMedia(query), matches: true }
      : matchMedia(query),
});
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value: (type: string) => {
    if (type !== "2d") return null;
    return {
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
    };
  },
});
Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  value() {
    return new window.DOMRect(20, 20, 120, 40);
  },
});
const { acquireGlass, updateGlassConfiguration } = await import(
  "@workspace/ui/lib/glass/runtime"
);
const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const materialRules = document.createElement("style");
materialRules.textContent = `
  .theme-material { --input: rgb(70, 70, 74); background-color: rgba(70, 70, 74, 0.5); }
`;
document.head.append(materialRules);
const themed = document.createElement("input");
themed.className = "theme-material";
themed.dataset.glass = "true";
themed.dataset.glassScope = "theme-material";
document.body.append(themed);
const originalThemeStyle = themed.getAttribute("style");
const themeConfiguration = { id: "theme-material" };
scenario(
  "a surface takes its tint from its theme paint at the default opacity",
);
const releaseThemed = acquireGlass(themeConfiguration);
await pause();
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "12%");
assert.equal(themed.style.getPropertyValue("--glass-base"), "rgb(70, 70, 74)");
scenario("a denser tintOpacity raises the tint");
updateGlassConfiguration({ ...themeConfiguration, tintOpacity: 0.65 });
await pause();
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "65%");
scenario("a theme change repaints the tint");
updateGlassConfiguration(themeConfiguration);
materialRules.textContent = `
  .theme-material { --input: rgb(199, 199, 204); background-color: rgba(199, 199, 204, 0.5); }
`;
await pause();
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "12%");
assert.equal(
  themed.style.getPropertyValue("--glass-base"),
  "rgb(199, 199, 204)",
);
scenario("caller paint adds to the tint, even in the theme's own color");
// A caller's background shorthand participates as paint, even with the same RGB.
themed.style.background = "rgba(199, 199, 204, 0.2)";
await pause();
assert.ok(
  Math.abs(
    // 20% paint plus the 12% Clear tint over the remaining 80%.
    Number.parseFloat(themed.style.getPropertyValue("--glass-opacity")) - 29.6,
  ) < 0.01,
);
scenario("tintOpacity 0 leaves only the caller's paint");
updateGlassConfiguration({
  ...themeConfiguration,
  tintOpacity: 0,
});
await pause();
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "20%");
themed.style.removeProperty("background");
await pause();
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "0%");
scenario(
  "opaque caller paint keeps CSS, and release restores the caller's styles",
);
updateGlassConfiguration(themeConfiguration);
await pause();
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "12%");
themed.style.setProperty("background-color", "rgb(120, 120, 120)", "important");
await pause();
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "100%");
assert.equal(themed.dataset.glassState, "css");
releaseThemed();
assert.equal(
  themed.style.getPropertyValue("background-color"),
  "rgb(120, 120, 120)",
);
assert.equal(themed.style.getPropertyPriority("background-color"), "important");
assert.equal(themed.style.getPropertyValue("--glass-base"), "");
assert.equal(themed.style.getPropertyValue("--glass-opacity"), "");
assert.equal(themed.dataset.glassState, undefined);
themed.style.removeProperty("background-color");
assert.equal(themed.getAttribute("style") || null, originalThemeStyle);
themed.remove();
materialRules.remove();

scenario("releasing the last lease disconnects every observer");
assert.ok(observers.every((observer) => observer.disconnected));
await window.happyDOM.close();
