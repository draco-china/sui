import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new Window({ url: "http://localhost" });
const motion = Object.assign(new window.EventTarget(), {
  matches: false,
  media: "",
});
Object.defineProperty(window, "matchMedia", { value: () => motion });
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  SVGElement: window.SVGElement,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  matchMedia: window.matchMedia,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
// The encoder runs in the browser; here it yields a fixed SVG.
mock.module("qr-code-styling", () => ({
  default: class {
    applyExtension() {}
    async getRawData() {
      return new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], {
        type: "image/svg+xml",
      });
    }
  },
}));
URL.createObjectURL = () => "blob:qr-code";
URL.revokeObjectURL = () => {};
const { act } = await import("react");
const { render, cleanup } = await import("@testing-library/react");
const { QRCode } = await import("@workspace/ui/components/qr-code");

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

scenario("without a background, a logo's modules are cut out of the code");
{
  const view = render(
    <QRCode value="https://example.com/" background={false} logo="S" />,
  );
  await settle();
  const root = view.container.querySelector('[data-slot="qr-code"]');
  assert.ok(!root?.className.includes("bg-card"), "the root has no card");
  const hole = view.container.querySelector('mask rect[fill="#000000"]');
  assert.ok(hole, "the code mask cuts out the logo's square");
  assert.equal(hole?.getAttribute("width"), String(512 * 0.16));
  cleanup();
}

scenario("without a logo, the code is not cut");
{
  const view = render(<QRCode value="https://example.com/" />);
  await settle();
  assert.ok(view.container.querySelector("mask image"), "the code is drawn");
  assert.equal(view.container.querySelector('mask rect[fill="#000000"]'), null);
  cleanup();
}
await window.happyDOM.close();
