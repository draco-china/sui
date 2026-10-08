import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });
const document = window.document;
let intersection:
  | ((
      entries: { isIntersecting: boolean; intersectionRatio: number }[],
    ) => void)
  | undefined;
let disconnected = false;
class ResizeObserver {
  observe() {}
  disconnect() {}
}
class IntersectionObserver {
  constructor(callback: typeof intersection) {
    intersection = callback;
  }
  observe() {}
  disconnect() {
    disconnected = true;
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
  PointerEvent: window.PointerEvent,
  MutationObserver: window.MutationObserver,
  ResizeObserver,
  IntersectionObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
mock.module("../../../../packages/ui/src/lib/glass/runtime", () => ({
  acquireGlass: () => () => {},
  updateGlassConfiguration: () => {},
  refreshGlass: () => {},
}));
let captures = 0;
Object.defineProperties(window.HTMLElement.prototype, {
  offsetLeft: {
    get() {
      return 4 + Number(this.dataset.tabBarItem ?? 0) * 68;
    },
  },
  offsetTop: {
    get() {
      return 4;
    },
  },
  offsetWidth: {
    get() {
      return this.matches("button") ? 64 : 212;
    },
  },
  offsetHeight: {
    get() {
      return this.matches("button") ? 56 : 64;
    },
  },
  scrollWidth: {
    get() {
      return 212;
    },
  },
  scrollHeight: {
    get() {
      return 64;
    },
  },
  getBoundingClientRect: {
    value() {
      if (this.matches("button"))
        return new window.DOMRect(
          4 + Number(this.dataset.tabBarItem ?? 0) * 68,
          4,
          64,
          56,
        );
      return new window.DOMRect(0, 0, 212, 64);
    },
  },
  setPointerCapture: {
    value() {
      captures++;
    },
  },
});
Object.defineProperty(document, "elementFromPoint", {
  value: (x: number) => {
    return (
      [...document.querySelectorAll("button[data-tab-bar-item]")].find(
        (button) => {
          const rect = button.getBoundingClientRect();
          return x >= rect.left && x <= rect.right;
        },
      ) ?? null
    );
  },
});
const preference = Object.assign(new window.EventTarget(), { matches: false });
Object.defineProperty(window, "matchMedia", { value: () => preference });
let hidden = false;
Object.defineProperty(document, "hidden", { get: () => hidden });
const { act, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HomeTabBarPreview } = await import(
  "../../src/components/home-tab-bar-preview"
);
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
const changes: string[] = [];
function Demo() {
  const [value, setValue] = useState("home");
  return (
    <HomeTabBarPreview
      glass
      value={value}
      onValueChange={(next) => {
        changes.push(next);
        setValue(next);
      }}
      items={[
        { value: "home", label: "Home" },
        { value: "search", label: "Search" },
        { value: "activity", label: "Activity" },
      ]}
    />
  );
}
await act(async () => {
  root.render(<Demo />);
});
const nav = host.querySelector("nav");
const track = host.querySelector('[data-slot="tab-bar-list"]');
assert.ok(nav && track);
const pause = (delay: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });
await pause(1900);
assert.equal(nav.dataset.homeTabBarDemo, "sliding");
assert.equal(
  track.getAttribute("data-pressed"),
  "true",
  "demo uses the actual long-press state",
);
assert.deepEqual(changes, [], "slide preview has not committed navigation yet");
const lens = track.querySelector(
  '[data-slot="tab-bar-indicator"]',
) as unknown as HTMLElement | null;
const cursor = host.querySelector(
  "[data-home-demo-cursor]",
) as unknown as SVGElement | null;
assert.ok(lens && cursor);
assert.equal(
  cursor.style.opacity,
  "1",
  "gesture pointer makes the hold visible",
);
const startX = Number.parseFloat(lens.style.translate);
await pause(1100);
assert.ok(
  Number.parseFloat(lens.style.translate) > startX + 30,
  "the actual lens moves with the simulated pointer instead of restarting its tween",
);
assert.equal(
  document.activeElement,
  document.body,
  "synthetic gesture never steals focus",
);
assert.equal(
  captures,
  0,
  "synthetic gesture never requests native pointer capture",
);
await pause(1800);
assert.deepEqual(
  changes,
  ["activity"],
  "release commits the destination through production TabBar",
);
assert.equal(track.getAttribute("data-pressed"), "false");
assert.equal(cursor.style.opacity, "0", "gesture pointer hides on release");
assert.equal(nav.dataset.homeTabBarDemo, "idle");
await act(async () => {
  nav.dispatchEvent(new window.PointerEvent("pointerenter"));
});
assert.equal(
  nav.dataset.homeTabBarDemo,
  "idle",
  "hover allows watching the automatic demonstration",
);
await act(async () => {
  nav.dispatchEvent(new window.PointerEvent("pointerleave"));
});
assert.equal(nav.dataset.homeTabBarDemo, "idle");
await act(async () => {
  const down = new window.PointerEvent("pointerdown");
  Object.defineProperty(down, "isTrusted", { value: true });
  window.dispatchEvent(down);
});
assert.equal(
  nav.dataset.homeTabBarDemo,
  "paused",
  "real input anywhere pauses the demo",
);
const menu = document.createElement("div");
menu.setAttribute("role", "menu");
document.body.append(menu);
await act(async () => {
  const up = new window.PointerEvent("pointerup");
  Object.defineProperty(up, "isTrusted", { value: true });
  window.dispatchEvent(up);
});
await pause(350);
assert.equal(
  nav.dataset.homeTabBarDemo,
  "paused",
  "an open header menu suppresses playback",
);
menu.remove();
await act(async () => {
  intersection?.([{ isIntersecting: true, intersectionRatio: 1 }]);
});
assert.equal(nav.dataset.homeTabBarDemo, "idle");
await act(async () => {
  intersection?.([{ isIntersecting: false, intersectionRatio: 0 }]);
});
assert.equal(nav.dataset.homeTabBarDemo, "paused", "offscreen demo stops");
await act(async () => {
  intersection?.([{ isIntersecting: true, intersectionRatio: 1 }]);
});
assert.equal(nav.dataset.homeTabBarDemo, "idle");
await act(async () => {
  preference.matches = true;
  preference.dispatchEvent(new window.Event("change"));
});
assert.equal(
  nav.dataset.homeTabBarDemo,
  "paused",
  "reduced motion suppresses automatic playback",
);
await act(async () => {
  preference.matches = false;
  preference.dispatchEvent(new window.Event("change"));
});
assert.equal(nav.dataset.homeTabBarDemo, "idle");
const button = host.querySelector("button");
assert.ok(button);
await act(async () => {
  button.focus();
});
assert.equal(
  nav.dataset.homeTabBarDemo,
  "paused",
  "keyboard focus pauses automation",
);
await act(async () => {
  button.blur();
});
assert.equal(nav.dataset.homeTabBarDemo, "idle");
await act(async () => {
  hidden = true;
  document.dispatchEvent(new window.Event("visibilitychange"));
});
assert.equal(
  nav.dataset.homeTabBarDemo,
  "paused",
  "hidden document stops the demo",
);
await act(async () => {
  hidden = false;
  document.dispatchEvent(new window.Event("visibilitychange"));
});
assert.equal(nav.dataset.homeTabBarDemo, "idle");
await act(async () => {
  root.unmount();
});
assert.equal(disconnected, true);
assert.equal(nav.dataset.homeTabBarDemo, undefined);
nav.dispatchEvent(new window.PointerEvent("pointerenter"));
preference.dispatchEvent(new window.Event("change"));
assert.equal(
  nav.dataset.homeTabBarDemo,
  undefined,
  "unmount removes pause listeners",
);
assert.equal(captures, 0);
console.log("Home TabBar cycle and suspension passed");
window.happyDOM.abort();
