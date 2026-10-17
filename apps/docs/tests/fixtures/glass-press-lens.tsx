import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import type { GlassConfiguration } from "../../../../packages/ui/src/lib/glass/defaults";
import { scenario } from "../support/scenario";

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
  PointerEvent: window.PointerEvent,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
const leases = new Map<string, number>();
mock.module("../../../../packages/ui/src/lib/glass/runtime", () => ({
  acquireGlass: ({ id }: GlassConfiguration) => {
    leases.set(id, (leases.get(id) ?? 0) + 1);
    return () => leases.set(id, (leases.get(id) ?? 0) - 1);
  },
  updateGlassConfiguration: () => {},
  refreshGlass: () => {},
}));
const active = () =>
  [...leases.values()].reduce((sum, count) => sum + count, 0);

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { Switch } = await import("@workspace/ui/components/switch");
const { Slider } = await import("@workspace/ui/components/slider");
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);

function render(glass: boolean) {
  return act(async () =>
    root.render(
      <>
        <Switch glass={glass} aria-label="Airplane mode" />
        <Slider glass={glass} defaultValue={[20, 80]} aria-label="Range" />
      </>,
    ),
  );
}
const query = (selector: string) => document.querySelector(selector);
const press = () =>
  act(async () => {
    query('[data-slot="switch"]')?.dispatchEvent(
      new window.PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
  });
const release = (type = "pointerup") =>
  act(async () => {
    window.dispatchEvent(new window.PointerEvent(type, { bubbles: true }));
  });

scenario("resting Switch and Slider stay ordinary and request no glass");
await render(true);
for (const slot of ["switch", "switch-thumb", "slider-track", "slider-thumb"])
  assert.equal(
    query(`[data-slot="${slot}"]`)?.hasAttribute("data-glass"),
    false,
    `${slot} stays ordinary at rest`,
  );
assert.equal(active(), 0, "resting controls request no glass");

scenario("pressing lifts a Clear lens from the thumb alone");
await press();
const thumb = query('[data-slot="switch-thumb"]');
assert.equal(
  thumb?.getAttribute("data-glass"),
  "true",
  "pressing lifts a lens",
);
assert.ok(thumb?.hasAttribute("data-glass-lens"), "the lens may sit on glass");
assert.equal(
  query('[data-slot="switch"]')?.hasAttribute("data-glass"),
  false,
  "the track stays ordinary",
);
assert.equal(active(), 1);
scenario("release and cancellation free the lens");
await release();
assert.equal(
  query('[data-slot="switch-thumb"]')?.hasAttribute("data-glass"),
  false,
  "release returns the thumb",
);
assert.equal(active(), 0, "release frees the lens request");
await press();
await release("pointercancel");
assert.equal(active(), 0, "cancellation also frees the lens");

scenario("without glass the pressed thumb stays ordinary");
await render(false);
await press();
assert.equal(
  query('[data-slot="switch-thumb"]')?.hasAttribute("data-glass"),
  false,
  "a Switch without glass keeps its pressed thumb ordinary",
);
await release();

scenario("unmounting leaves no glass requested");
await act(async () => root.unmount());
assert.equal(active(), 0);
window.happyDOM.abort();
