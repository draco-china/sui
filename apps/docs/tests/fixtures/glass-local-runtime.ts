import { spyOn } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new Window({ url: "http://localhost" });
const document = window.document;
const observers: {
  disconnected: boolean;
  observed: Set<unknown>;
  callback: (entries: ObserverEntry[]) => void;
}[] = [];
type ObserverEntry = { target: unknown; isIntersecting?: boolean };
class Observer {
  disconnected = false;
  observed = new Set<unknown>();
  constructor(readonly callback: (entries: ObserverEntry[]) => void) {
    observers.push(this);
  }
  observe(element: unknown) {
    this.observed.add(element);
  }
  unobserve(element: unknown) {
    this.observed.delete(element);
  }
  disconnect() {
    this.disconnected = true;
    this.observed.clear();
  }
}
const mutations: { disconnected: boolean }[] = [];
class SharedMutation extends window.MutationObserver {
  disconnected = false;
  constructor(
    callback: ConstructorParameters<typeof window.MutationObserver>[0],
  ) {
    super(callback);
    mutations.push(this);
  }
  override disconnect() {
    this.disconnected = true;
    super.disconnect();
  }
}
const windowAdds = spyOn(window, "addEventListener");
const windowRemoves = spyOn(window, "removeEventListener");
const documentAdds = spyOn(document, "addEventListener");
const documentRemoves = spyOn(document, "removeEventListener");
const appearance = new window.EventTarget();
const appearanceAdds = spyOn(appearance, "addEventListener");
const appearanceRemoves = spyOn(appearance, "removeEventListener");
// Reduced transparency keeps these surfaces on the CSS material.
Object.defineProperty(window, "matchMedia", {
  value: (query: string) =>
    query.includes("reduced-transparency") ? { matches: true } : appearance,
});
const discovery = spyOn(document, "querySelectorAll");
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
  MutationObserver: SharedMutation,
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
const { acquireGlass, refreshGlass, updateGlassConfiguration } = await import(
  "@workspace/ui/lib/glass/runtime"
);
const pause = () => new Promise((resolve) => setTimeout(resolve, 250));
const makeSurface = (id: string) => {
  const element = document.createElement("div");
  element.dataset.glass = "true";
  element.dataset.glassScope = id;
  element.style.setProperty("--glass-base", "caller-base", "important");
  document.body.append(element);
  return element;
};
const first = makeSurface("local-first");
const second = makeSurface("local-second");
const targetA = document.createElement("section");
const targetB = document.createElement("section");
document.body.append(targetA, targetB);
targetA.append(first);
const input = document.createElement("input");
input.type = "radio";
targetA.append(input);
targetB.append(second);
const settingsA = { id: "local-first", tintOpacity: 0.15 };
const settingsB = { id: "local-second", tintOpacity: 0.45 };
scenario(
  "distinct ids keep their own tint and share observers, listeners and discovery",
);
const releaseFirst = acquireGlass(settingsA);
const releaseSecond = acquireGlass(settingsB);
assert.equal(first.style.getPropertyValue("--glass-opacity"), "15%");
assert.equal(second.style.getPropertyValue("--glass-opacity"), "45%");
assert.equal(mutations.length, 1, "distinct ids share one mutation observer");
assert.equal(
  observers.length,
  2,
  "distinct ids share one resize and one intersection observer",
);
for (const observer of observers)
  assert.deepEqual([...observer.observed], [first, second]);
assert.equal(
  windowAdds.mock.calls.filter(([type]) => type === "resize").length,
  1,
);
const documentEvents = [
  "visibilitychange",
  "pointerover",
  "pointerout",
  "focusin",
  "focusout",
  "transitionend",
  "transitioncancel",
];
assert.deepEqual(
  [...new Set(documentAdds.mock.calls.map(([name]) => name))].sort(),
  [...documentEvents].sort(),
  "the runtime listens only for paint-affecting events",
);
for (const type of documentEvents)
  assert.equal(
    documentAdds.mock.calls.filter(([name]) => name === type).length,
    1,
    type,
  );
assert.equal(appearanceAdds.mock.calls.length, 1);
assert.equal(
  discovery.mock.calls.filter(
    ([selector]) => selector === '[data-glass="true"]',
  ).length,
  1,
  "distinct ids use one initial discovery pass",
);
scenario("only paint-affecting mutations reread a material");
await pause();
const discoveryCount = () =>
  discovery.mock.calls.filter(
    ([selector]) => selector === '[data-glass="true"]',
  ).length;
const scans = discoveryCount();
const firstClones = spyOn(first, "cloneNode");
const secondClones = spyOn(second, "cloneNode");
const beforeUnchangedType = firstClones.mock.calls.length;
for (let index = 0; index < 3; index++) input.setAttribute("type", "radio");
await pause();
assert.equal(
  firstClones.mock.calls.length,
  beforeUnchangedType,
  "same input type assignments do not invalidate the material",
);
input.type = "checkbox";
await pause();
assert.equal(
  firstClones.mock.calls.length,
  beforeUnchangedType,
  "sibling content cannot change a surface's inherited paint",
);
targetA.setAttribute("class", "inverted");
await pause();
assert.ok(
  firstClones.mock.calls.length > beforeUnchangedType,
  "an ancestor class change invalidates the material",
);
assert.equal(secondClones.mock.calls.length, 0);

scenario("a settings change updates only its own id without rediscovery");
updateGlassConfiguration({ ...settingsA, tintOpacity: 0.25 });
await pause();
assert.equal(first.style.getPropertyValue("--glass-opacity"), "25%");
assert.equal(second.style.getPropertyValue("--glass-opacity"), "45%");
assert.equal(
  discoveryCount(),
  scans,
  "settings changes do not rediscover the whole document",
);
assert.equal(
  secondClones.mock.calls.length,
  0,
  "updating one id does not recompute another material",
);
scenario(
  "Clear lights a surface from its corners by default and relights it per edge",
);
const lit = (element: typeof first) =>
  decodeURIComponent(element.style.getPropertyValue("--glass-edge"));
// The 120×40 square-cornered surface is lit from its corners by default.
assert.ok(lit(first).includes("translate(0 0)"), "diagonal is the default");
updateGlassConfiguration({
  ...settingsA,
  edge: "vertical",
  tintOpacity: 0.25,
});
await pause();
assert.ok(
  lit(first).includes("feSpecularLighting"),
  "switching the edge relights it as the top and bottom bevel",
);
assert.ok(lit(second).includes("translate(0 0)"));
updateGlassConfiguration({ ...settingsA, tintOpacity: 0.25 });
await pause();
assert.ok(lit(first).includes("translate(0 0)"));
scenario("a background change or resize entry updates only its own surface");
// A targeted background change only updates its own group's material.
second.style.backgroundColor = "rgba(120, 140, 160, 0.2)";
await pause();
assert.equal(first.style.getPropertyValue("--glass-opacity"), "25%");
assert.equal(
  second.style.getPropertyValue("--glass-opacity"),
  "56.00000000000001%",
);
const secondMaterialReads = secondClones.mock.calls.length;
for (const observer of observers) observer.callback([{ target: first }]);
await pause();
assert.equal(
  second.style.getPropertyValue("--glass-opacity"),
  "56.00000000000001%",
);
assert.equal(
  secondClones.mock.calls.length,
  secondMaterialReads,
  "resize entries are routed to their exact owner",
);
scenario("refreshGlass rereads only the surfaces inside its target");
const firstRefreshReads = firstClones.mock.calls.length;
const secondRefreshReads = secondClones.mock.calls.length;
refreshGlass(targetA as unknown as HTMLElement);
await pause();
assert.ok(firstClones.mock.calls.length > firstRefreshReads);
assert.equal(
  secondClones.mock.calls.length,
  secondRefreshReads,
  "refreshing one target preserves another independent request",
);
const afterTargetRefresh = firstClones.mock.calls.length;
refreshGlass({ current: null });
await pause();
assert.equal(firstClones.mock.calls.length, afterTargetRefresh);
assert.equal(secondClones.mock.calls.length, secondRefreshReads);
scenario(
  "releasing one id twice restores its caller styles and keeps the shared observers",
);
releaseFirst();
releaseFirst();
assert.equal(first.style.getPropertyValue("--glass-base"), "caller-base");
assert.equal(first.style.getPropertyPriority("--glass-base"), "important");
assert.equal(first.dataset.glassState, undefined);
assert.equal(
  windowRemoves.mock.calls.filter(([type]) => type === "resize").length,
  0,
);
assert.ok(observers.every((observer) => !observer.disconnected));
for (const observer of observers)
  assert.deepEqual([...observer.observed], [second]);
updateGlassConfiguration({ ...settingsB, tintOpacity: 0.3 });
await pause();
assert.equal(second.style.getPropertyValue("--glass-opacity"), "44%");
scenario(
  "a surface moved to another id keeps its state when the old id releases",
);
// Move an existing surface between active ids before mutation delivery.
const replacement = makeSurface("local-replacement");
const releaseReplacement = acquireGlass({
  id: "local-replacement",
  tintOpacity: 0.6,
});
second.dataset.glassScope = "local-replacement";
updateGlassConfiguration({
  id: "local-replacement",
  tintOpacity: 0.5,
});
await pause();
assert.ok(
  Math.abs(
    Number.parseFloat(second.style.getPropertyValue("--glass-opacity")) - 60,
  ) < 1e-8,
);
releaseSecond();
assert.equal(
  second.dataset.glassState,
  "css",
  "releasing previous owner cannot clear transferred state",
);
assert.ok(observers.every((observer) => !observer.disconnected));
scenario("the last lease restores caller styles and removes every listener");
releaseReplacement();
assert.equal(second.style.getPropertyValue("--glass-base"), "caller-base");
assert.equal(second.style.getPropertyPriority("--glass-base"), "important");
assert.equal(replacement.dataset.glassState, undefined);
assert.ok(mutations.every((observer) => observer.disconnected));
assert.ok(observers.every((observer) => observer.disconnected));
assert.equal(
  windowRemoves.mock.calls.filter(([type]) => type === "resize").length,
  1,
);
assert.equal(appearanceRemoves.mock.calls.length, 1);
for (const type of documentEvents)
  assert.equal(
    documentRemoves.mock.calls.filter(([name]) => name === type).length,
    1,
    type,
  );
scenario("a fresh lease after cleanup starts a new document owner");
const fresh = makeSurface("local-fresh");
const releaseFresh = acquireGlass({ id: "local-fresh" });
await pause();
assert.equal(
  mutations.length,
  2,
  "a fresh lease starts one new document owner",
);
assert.equal(observers.length, 4);
assert.ok(fresh.dataset.glassState);
releaseFresh();
assert.ok(mutations.every((observer) => observer.disconnected));
assert.ok(observers.every((observer) => observer.disconnected));

scenario("a surface out of view takes a settings change once it scrolls in");
const inView = makeSurface("local-switch");
const outOfView = makeSurface("local-switch");
let scrolledIn = false;
Object.defineProperty(outOfView, "getBoundingClientRect", {
  value: () => new window.DOMRect(scrolledIn ? 20 : 2000, 20, 120, 40),
});
const releaseSwitch = acquireGlass({ id: "local-switch" });
await pause();
for (const surface of [inView, outOfView])
  assert.match(lit(surface), /^url\("data:/, "glass paints every edge");
updateGlassConfiguration({ id: "local-switch", tintOpacity: 0.65 });
await pause();
assert.equal(inView.style.getPropertyValue("--glass-opacity"), "65%");
assert.notEqual(
  outOfView.style.getPropertyValue("--glass-opacity"),
  "65%",
  "a surface out of view waits",
);
scrolledIn = true;
// The intersection observer is the last one the fresh document owner made.
observers.at(-1)?.callback([{ target: outOfView, isIntersecting: true }]);
await pause();
assert.equal(outOfView.style.getPropertyValue("--glass-opacity"), "65%");
releaseSwitch();
await window.happyDOM.close();
