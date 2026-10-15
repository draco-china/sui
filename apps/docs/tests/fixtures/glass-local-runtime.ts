import { spyOn } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });
const document = window.document;
const observers: {
  disconnected: boolean;
  observed: Set<unknown>;
  callback: (entries: { target: unknown }[]) => void;
}[] = [];
class Observer {
  disconnected = false;
  observed = new Set<unknown>();
  constructor(readonly callback: (entries: { target: unknown }[]) => void) {
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
const settingsA = {
  id: "local-first",
  options: { tintOpacity: 0.15 },
};
const settingsB = {
  id: "local-second",
  options: { tintOpacity: 0.45 },
};
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

updateGlassConfiguration({ ...settingsA, options: { tintOpacity: 0.25 } });
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
const lit = (element: typeof first) =>
  decodeURIComponent(element.style.getPropertyValue("--glass-edge"));
// The 120×40 square-cornered surface is lit from its corners by default.
assert.ok(lit(first).includes("translate(0 0)"), "diagonal is the default");
updateGlassConfiguration({
  ...settingsA,
  edge: "vertical",
  options: { tintOpacity: 0.25 },
});
await pause();
assert.ok(
  lit(first).includes("feSpecularLighting"),
  "switching the edge relights it as the top and bottom bevel",
);
assert.ok(lit(second).includes("translate(0 0)"));
updateGlassConfiguration({ ...settingsA, options: { tintOpacity: 0.25 } });
await pause();
assert.ok(lit(first).includes("translate(0 0)"));
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
updateGlassConfiguration({ ...settingsB, options: { tintOpacity: 0.3 } });
await pause();
assert.equal(second.style.getPropertyValue("--glass-opacity"), "44%");
// Move an existing surface between active ids before mutation delivery.
const replacement = makeSurface("local-replacement");
const releaseReplacement = acquireGlass({
  id: "local-replacement",
  options: { tintOpacity: 0.6 },
});
second.dataset.glassScope = "local-replacement";
updateGlassConfiguration({
  id: "local-replacement",
  options: { tintOpacity: 0.5 },
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
const regular = makeSurface("local-regular");
const releaseRegular = acquireGlass({
  id: "local-regular",
  material: "regular",
});
await pause();
assert.equal(
  mutations.length,
  2,
  "a fresh lease starts one new document owner",
);
assert.equal(observers.length, 4);
assert.ok(regular.dataset.glassState);
releaseRegular();
assert.ok(mutations.every((observer) => observer.disconnected));
assert.ok(observers.every((observer) => observer.disconnected));
await window.happyDOM.close();
console.log(
  "independent settings, shared DOM observation, ownership transfer and last-lease cleanup passed",
);
