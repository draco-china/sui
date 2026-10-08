import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import {
  type Element as HappyElement,
  type HTMLElement as HappyHTMLElement,
  Window,
} from "happy-dom";

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
mock.module("../../../../packages/ui/src/lib/glass/runtime", () => ({
  acquireGlass: () => () => {},
  updateGlassConfiguration: () => {},
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
let hit: HappyElement | null = null;
Object.defineProperty(document, "elementFromPoint", { value: () => hit });
const { act, createRef, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { TabBar } = await import("@workspace/ui/components/tab-bar");
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
const pointer = async (target: HappyElement, type: string, x = 36) => {
  await act(async () => {
    target.dispatchEvent(
      new window.PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: 30,
      }),
    );
  });
};
hit = button("Home");
await pointer(hit, "pointerdown");
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 280));
});
assert.equal(lens().getAttribute("data-pressed"), "true");
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
assert.equal((lens() as HappyHTMLElement).style.height, "74px");
assert.deepEqual(changes, [], "holding never commits navigation");
hit = button("Search");
await pointer(track(), "pointermove", 104);
assert.equal(button("Home").getAttribute("aria-current"), "page");
assert.equal(button("Search").getAttribute("data-held"), "true");
assert.equal(
  button("Home").getAttribute("data-active"),
  "true",
  "dragging leaves visual selection unchanged",
);
assert.equal(button("Search").getAttribute("data-active"), "false");
await pointer(track(), "pointerup", 104);
assert.deepEqual(changes, ["search"]);
assert.equal(activations, 1);
assert.equal(lens().hasAttribute("data-glass"), false);
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
assert.equal(lens().hasAttribute("data-glass"), false);
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
await act(async () => {
  root.unmount();
  await new Promise((resolve) => setTimeout(resolve, 280));
});
console.log(
  "Tab Bar native ref, blur-only selection, floating press, release, cancellation, keyboard and cleanup passed",
);
window.happyDOM.abort();
