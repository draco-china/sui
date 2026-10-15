import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { Window } from "happy-dom";

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

const activeFilters = new Map<HTMLElement, string>();
const geometry = new Map<HTMLElement, { strength: number }>();
let nextFilter = 0;
let svgDestroy = 0;
mock.module("../../../../packages/ui/src/lib/glass/svg-renderer", () => ({
  SvgGlassRenderer: {
    create: async () => ({
      filter(element: HTMLElement, shape: { strength: number }) {
        geometry.set(element, shape);
        let id = activeFilters.get(element);
        if (!id) {
          id = `url("#native-local-${++nextFilter}")`;
          activeFilters.set(element, id);
        }
        return id;
      },
      release(element: HTMLElement) {
        activeFilters.delete(element);
        geometry.delete(element);
      },
      destroy() {
        svgDestroy++;
        activeFilters.clear();
        geometry.clear();
      },
    }),
  },
}));
const { act, createRef } = await import("react");
const { createRoot } = await import("react-dom/client");
const { GlassSurface } = await import("@workspace/ui/components/glass");
const { Button } = await import("@workspace/ui/components/button");
const { withGlass } = await import(
  "../../../../packages/ui/src/lib/glass/context"
);
const Scope = withGlass(
  (props: React.ComponentProps<"div">) => <div {...props} />,
  "scope",
);
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
const leftRef = createRef<HTMLDivElement>();
const rightRef = createRef<HTMLDivElement>();
async function render({
  left = true,
  right = true,
  strength = 22,
}: {
  left?: boolean;
  right?: boolean;
  strength?: number;
} = {}) {
  await act(async () =>
    root.render(
      <>
        <GlassSurface
          id="left"
          ref={leftRef}
          glass={left}
          glassConfig={{ options: { strength } }}
          style={{ borderRadius: 9, minHeight: 48 }}
        />
        <GlassSurface
          id="right"
          ref={rightRef}
          glass={right}
          glassConfig={{ material: "regular", options: { strength: 17 } }}
        />
        <Scope glass={false}>
          <Button id="disabled-child">Plain</Button>
        </Scope>
      </>,
    ),
  );
  await act(async () => new Promise((r) => setTimeout(r, 250)));
}
await render();
const left = leftRef.current,
  right = rightRef.current;
assert.ok(left);
assert.ok(right);
assert.equal(
  left,
  document.getElementById("left") as unknown as HTMLDivElement,
);
assert.equal(
  right,
  document.getElementById("right") as unknown as HTMLDivElement,
);
const ids = [left.dataset.glassScope, right.dataset.glassScope];
assert.notEqual(ids[0], ids[1]);
for (const e of [left, right]) {
  assert.equal(e.dataset.glassState, "ready");
  assert.equal(e.dataset.glassRenderer, "svg");
  assert.equal(e.hasAttribute("glassConfig"), false);
}
assert.match(left.style.getPropertyValue("--glass-edge"), /^url\("data:/);
assert.equal(left.style.borderRadius, "9px");
assert.equal(
  document.getElementById("disabled-child")?.hasAttribute("data-glass"),
  false,
);
const rightFilter = right.style.getPropertyValue("--glass-filter");
await render({ strength: 31 });
assert.deepEqual([left.dataset.glassScope, right.dataset.glassScope], ids);
assert.equal(geometry.get(left)?.strength, 31);
assert.equal(geometry.get(right)?.strength, 17);
assert.equal(right.style.getPropertyValue("--glass-filter"), rightFilter);
left.style.setProperty(
  "background-color",
  "rgba(10, 20, 30, 0.2)",
  "important",
);
await render({ left: false });
assert.equal(left.hasAttribute("data-glass"), false);
assert.equal(left.style.getPropertyValue("--glass-filter"), "");
assert.equal(left.style.getPropertyValue("--glass-base"), "");
assert.equal(left.style.getPropertyPriority("background-color"), "important");
assert.equal(left.style.borderRadius, "9px");
assert.equal(right.dataset.glassState, "ready");
assert.equal(activeFilters.has(left), false);
assert.equal(activeFilters.has(right), true);
await act(async () => root.unmount());
assert.equal(activeFilters.size, 0);
assert.equal(svgDestroy, 1);
assert.ok(observers.every((o) => o.disconnected));
await window.happyDOM.abort();
console.log(
  "local requests passed: independent settings, native SVG isolation, refs, opt-out and disposal",
);
