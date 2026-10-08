import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import {
  type Element as HappyElement,
  type HTMLElement as HappyHTMLElement,
  Window,
} from "happy-dom";
import type { GlassConfiguration } from "../../../../packages/ui/src/lib/glass/context";

const window = new Window({ url: "http://localhost" });
const document = window.document;
class Observer {
  observe() {}
  disconnect() {}
}
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  ShadowRoot: window.ShadowRoot,
  MutationObserver: window.MutationObserver,
  ResizeObserver: Observer,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
const configurations = new Map<string, GlassConfiguration>();
const leases = new Map<string, number>();
mock.module("../../../../packages/ui/src/lib/glass/runtime", () => ({
  acquireGlass: ({ id }: { id: string }) => {
    leases.set(id, (leases.get(id) ?? 0) + 1);
    return () => leases.set(id, (leases.get(id) ?? 0) - 1);
  },
  updateGlassConfiguration: (configuration: GlassConfiguration) => {
    configurations.set(configuration.id, configuration);
  },
  refreshGlass: () => {},
}));
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
      return 64;
    },
  },
  offsetHeight: {
    get() {
      return 56;
    },
  },
  scrollWidth: {
    get() {
      return 280;
    },
  },
  scrollHeight: {
    get() {
      return 64;
    },
  },
  getBoundingClientRect: {
    value() {
      return new window.DOMRect(0, 0, 280, 64);
    },
  },
});
const motionPreference = Object.assign(new window.EventTarget(), {
  matches: false,
  media: "(prefers-reduced-motion: reduce)",
});
Object.defineProperty(window, "matchMedia", { value: () => motionPreference });
let hit: HappyElement | null = null;
Object.defineProperty(document, "elementFromPoint", { value: () => hit });
const { act, createRef, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { TabBar } = await import("@workspace/ui/components/tab-bar");
const { GlassProvider } = await import("@workspace/ui/components/glass");
const { gsap } = await import("gsap");
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
const ref = createRef<HTMLElement>();
const changes: string[] = [];
let activations = 0;
let submitted = 0;
function Demo() {
  const [value, setValue] = useState("home");
  return (
    <GlassProvider options={{ highlight: 0.45 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted++;
        }}
      >
        <TabBar
          ref={ref}
          glass
          aria-label="Destinations"
          value={value}
          onItemActivate={() => activations++}
          onValueChange={(next) => {
            changes.push(next);
            setValue(next);
          }}
          items={[
            { value: "home", label: "Home" },
            { value: "search", label: "Search" },
            { value: "disabled", label: "Disabled", disabled: true },
            { value: "activity", label: "Activity" },
          ]}
        />
      </form>
    </GlassProvider>
  );
}
await act(async () => {
  root.render(<Demo />);
});
function button(name: string) {
  const element = [...host.querySelectorAll("button")].find(
    (element) => element.textContent === name,
  );
  assert.ok(element);
  return element;
}
function lens() {
  const element = host.querySelector('[data-slot="tab-bar-indicator"]');
  assert.ok(element);
  return element;
}
function track() {
  const element = host.querySelector('[data-slot="tab-bar-list"]');
  assert.ok(element);
  return element;
}
assert.equal(ref.current, host.querySelector("nav") as unknown as HTMLElement);
assert.equal(track().getAttribute("data-glass"), "true");
const outerScope = track().getAttribute("data-glass-scope");
assert.ok(outerScope);
assert.equal(configurations.get(outerScope)?.mode, "auto");
assert.equal(
  leases.get(outerScope),
  2,
  "outer scope and track are the only resting leases",
);
assert.equal(leases.size, 1, "inactive lens does not initialize a manager");
assert.equal(
  lens().hasAttribute("data-glass"),
  false,
  "resting selection has no glass runtime",
);
assert.ok(
  host
    .querySelector('[data-slot="tab-bar-selection"]')
    ?.className.includes("backdrop-blur-[7px]"),
);
const pointer = async (
  target: HappyElement,
  type: string,
  x = 36,
  trusted = true,
) => {
  const event = new window.PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: 30,
  });
  Object.defineProperty(event, "isTrusted", { value: trusted });
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event;
};
hit = button("Home");
assert.equal((await pointer(hit, "pointerdown")).defaultPrevented, true);
assert.equal(document.activeElement, hit, "pointer activation preserves focus");
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 280));
});
assert.equal(lens().getAttribute("data-pressed"), "true");
assert.equal(track().getAttribute("data-glass-frozen"), "true");
const lensScope = lens().getAttribute("data-glass-scope");
assert.ok(lensScope);
assert.notEqual(
  lensScope,
  outerScope,
  "held lens has an independent CSS-only scope",
);
assert.equal(
  configurations.get(lensScope)?.mode,
  "css",
  "held lens never requests liquid refraction",
);
assert.equal(
  configurations.get(lensScope)?.options?.highlight,
  0.45,
  "lens keeps inherited highlight configuration",
);
assert.equal(
  configurations.get(outerScope)?.mode,
  "auto",
  "outer glass retains GPU enhancement",
);
assert.equal(leases.get(lensScope), 1);
const nativeDrag = new window.Event("dragstart", {
  bubbles: true,
  cancelable: true,
});
hit.dispatchEvent(nativeDrag);
assert.equal(nativeDrag.defaultPrevented, true);
await pointer(hit, "lostpointercapture");
assert.equal(
  lens().getAttribute("data-pressed"),
  "true",
  "transferring implicit capture from a child button preserves the held lens",
);
assert.equal(
  (host.querySelector('[data-slot="tab-bar-selection"]') as HappyHTMLElement)
    .style.visibility,
  "hidden",
  "holding hides the resting selection background",
);
assert.equal(
  lens().getAttribute("data-glass"),
  "true",
  "only held selection gets floating glass",
);
assert.equal(lens().getAttribute("data-glass-motion"), "true");
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 220));
});
assert.equal((lens() as HappyHTMLElement).style.height, "74px");
assert.equal(lens().getAttribute("data-glass-motion"), "false");
assert.deepEqual(changes, [], "holding never commits navigation");
hit = button("Search");
await pointer(track(), "pointermove", 104);
assert.equal(lens().getAttribute("data-glass-motion"), "true");
assert.equal(button("Home").getAttribute("aria-current"), "page");
assert.equal(button("Search").getAttribute("data-held"), "true");
assert.equal(
  button("Home").getAttribute("data-active"),
  "false",
  "dragging clears the previous destination's theme color",
);
assert.equal(
  button("Search").getAttribute("data-active"),
  "true",
  "dragging previews the held destination's theme color without committing navigation",
);
await pointer(track(), "pointerup", 104);
assert.deepEqual(changes, ["search"]);
assert.equal(activations, 1);
assert.equal(lens().hasAttribute("data-glass"), false);
assert.equal(track().getAttribute("data-glass-frozen"), "false");
assert.equal(leases.get(lensScope), 0, "release stops the lens CSS lease");
assert.equal(
  leases.get(outerScope),
  2,
  "release retains the outer scope and track leases",
);
await act(async () => {
  button("Search").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, detail: 1 }),
  );
});
assert.equal(activations, 1, "pointer release does not activate twice");
hit = button("Home");
await pointer(hit, "pointerdown");
await pointer(track(), "pointermove", 50);
assert.equal(
  lens().getAttribute("data-pressed"),
  "true",
  "drag beyond threshold starts floating state",
);
await pointer(track(), "pointercancel");
assert.equal(button("Search").getAttribute("aria-current"), "page");
assert.equal(button("Search").getAttribute("data-active"), "true");
assert.equal(button("Home").getAttribute("data-active"), "false");
assert.equal(lens().hasAttribute("data-glass"), false);
assert.equal(
  lens().getAttribute("data-glass-motion"),
  "false",
  "cancel interrupts GPU motion tracking",
);
await act(async () => {
  button("Search").focus();
  button("Search").dispatchEvent(
    new window.KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
  );
});
assert.equal(
  document.activeElement,
  button("Activity"),
  "keyboard skips disabled items",
);
assert.deepEqual(changes, ["search"], "moving focus does not commit");
await act(async () => {
  button("Activity").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, detail: 0 }),
  );
});
assert.deepEqual(changes, ["search", "activity"]);
assert.equal(submitted, 0);
hit = button("Home");
await pointer(hit, "pointerdown");
await pointer(track(), "pointerup");
await act(async () => {
  button("Home").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, detail: 1 }),
  );
});
assert.deepEqual(
  changes,
  ["search", "activity", "home"],
  "short pointer release commits once after a long press",
);
assert.equal(activations, 3);
hit = button("Home");
await pointer(hit, "pointerdown");
await pointer(track(), "pointermove", 50);
const heldContent = button("Home").querySelector("[data-tab-bar-content]");
assert.ok(heldContent);
assert.ok(
  gsap.getTweensOf(heldContent).length,
  "press animation runs through GSAP",
);
await act(async () => {
  motionPreference.matches = true;
  motionPreference.dispatchEvent(new window.Event("change"));
});
assert.equal(lens().getAttribute("data-glass-motion"), "false");
assert.equal(
  (lens() as HappyHTMLElement).style.height,
  "74px",
  "reduced motion completes geometry immediately",
);
assert.equal(
  gsap.getProperty(heldContent, "scaleX"),
  1,
  "reduced motion removes icon enlargement",
);
hit = button("Search");
await pointer(track(), "pointermove", 104);
assert.equal(
  lens().getAttribute("data-glass-motion"),
  "false",
  "reduced motion drag does not start a tween",
);
assert.equal(button("Search").getAttribute("data-active"), "true");
await pointer(track(), "pointercancel");
await act(async () => {
  motionPreference.matches = false;
  motionPreference.dispatchEvent(new window.Event("change"));
});
hit = button("Home");
await pointer(hit, "pointerdown");
await pointer(track(), "pointermove", 50);
const detachedLens = lens();
assert.equal(detachedLens.getAttribute("data-glass-motion"), "true");
await act(async () => {
  root.unmount();
  await new Promise((resolve) => setTimeout(resolve, 280));
});
assert.equal(
  gsap.getTweensOf(heldContent).length,
  0,
  "unmount releases GSAP content tweens",
);
assert.equal(
  detachedLens.getAttribute("data-glass-motion"),
  "false",
  "unmount stops glass motion tracking",
);
assert.ok(
  [...leases.values()].every((count) => count === 0),
  "unmount releases all glass scopes",
);
console.log(
  "Tab Bar native ref, blur-only selection, floating press, release, cancellation, keyboard and cleanup passed",
);
window.happyDOM.abort();
