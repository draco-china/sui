import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import type { GlassConfiguration } from "../../../../packages/ui/src/lib/glass/defaults";
import { scenario } from "../support/scenario";

const window = new Window({ url: "http://localhost/playground" });
const document = window.document;
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  ShadowRoot: window.ShadowRoot,
  SVGElement: window.SVGElement,
  MutationObserver: window.MutationObserver,
  ResizeObserver: Observer,
  IntersectionObserver: Observer,
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
// The Lab only needs the configurations it hands to the runtime.
const configurations = new Map<string, GlassConfiguration>();
mock.module("../../../../packages/ui/src/lib/glass/runtime", () => ({
  acquireGlass: (configuration: GlassConfiguration) => {
    configurations.set(configuration.id, configuration);
    return () => configurations.delete(configuration.id);
  },
  updateGlassConfiguration: (configuration: GlassConfiguration) =>
    configurations.set(configuration.id, configuration),
  refreshGlass: () => {},
}));
Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: () => Promise.resolve(),
});

const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { GlassLab } = await import("../../src/components/glass-lab");
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
await act(async () => root.render(<GlassLab locale="en-US" />));

const sidebar = () => {
  const element = host.querySelector('[data-slot="sidebar"]');
  assert.ok(element);
  return element;
};
const choice = (label: string) =>
  sidebar().querySelector(`[data-slot="toggle-group"][aria-label="${label}"]`);
const field = (label: string) =>
  [...sidebar().querySelectorAll("label")]
    .find((element) => element.textContent === label)
    ?.closest('[data-slot="field"]');
const toggle = (label: string) => {
  const control = field(label)?.querySelector('[role="switch"]');
  assert.ok(control instanceof window.HTMLElement, `${label} switch`);
  return control;
};
const press = async (element: { click(): void }) =>
  act(async () => element.click());
const pick = async (group: string, option: string) => {
  const item = [...(choice(group)?.querySelectorAll("button") ?? [])].find(
    (button) => button.textContent === option,
  );
  assert.ok(item, `${group}: ${option}`);
  await press(item);
};
const panelGlow = () => {
  const panel = host.querySelector('[data-slot="glass-lab-panel"]');
  assert.ok(panel);
  return panel.getAttribute("data-glass-text-glow");
};
const clearOnly = () => ({
  edge: Boolean(choice("Edge light")),
  probe: Boolean(field("Show refraction lens")),
  strength: Boolean(field("Refraction strength")),
  glow: Boolean(field("Text glow")),
});

scenario("Glass offers its edge light, refraction and an opt-in text glow");
assert.deepEqual(clearOnly(), {
  edge: true,
  probe: true,
  strength: true,
  glow: true,
});
assert.equal(toggle("Text glow").getAttribute("aria-checked"), "false");
assert.equal(panelGlow(), "false");

scenario("Frosted hides Clear's settings and is CSS only");
await pick("Component material", "Frosted");
assert.deepEqual(clearOnly(), {
  edge: false,
  probe: false,
  strength: false,
  glow: false,
});
assert.equal(field("Text glow"), undefined);
assert.ok(field("Transparency"), "frosted tint stays adjustable");
assert.match(
  host.querySelector("style")?.textContent ?? "",
  /--frosted-opacity: 65%;.*--frosted-blur: 24px;/,
  "transparency and blur drive the frosted CSS variables",
);
await press(toggle("Custom tint"));
assert.match(
  host.querySelector("style")?.textContent ?? "",
  /--frosted-base: #FFFFFF/,
  "a custom tint drives the frosted base variable",
);
assert.equal(
  [...sidebar().querySelectorAll("button")].some(
    (button) => button.getAttribute("aria-label") === "Refresh effect",
  ),
  false,
  "frosted glass has no renderer status to show",
);
const frostedPanel = host.querySelector('[data-slot="glass-lab-panel"]');
assert.equal(frostedPanel?.getAttribute("data-frosted"), "true");
assert.equal(frostedPanel?.hasAttribute("data-glass"), false);

scenario("text glow and a custom tint reach the runtime");
await pick("Component material", "Glass");
await press(toggle("Custom tint"));
assert.ok(
  [...configurations.values()].some(({ tint }) => tint === "#FFFFFF"),
  "the runtime receives the custom tint",
);
assert.equal(toggle("Text glow").getAttribute("aria-checked"), "false");
await press(toggle("Text glow"));
assert.equal(panelGlow(), "true");
assert.ok(
  [...configurations.values()].some(({ textGlow }) => textGlow === true),
  "the runtime receives the explicit textGlow",
);

scenario("reset turns text glow off and restores the component's own tint");
const reset = [...sidebar().querySelectorAll("button")].find(
  (button) => button.getAttribute("aria-label") === "Reset defaults",
);
assert.ok(reset);
await press(reset);
assert.equal(toggle("Text glow").getAttribute("aria-checked"), "false");
assert.equal(toggle("Custom tint").getAttribute("aria-checked"), "false");
assert.equal(panelGlow(), "false");

await act(async () => root.unmount());
await window.happyDOM.abort();
