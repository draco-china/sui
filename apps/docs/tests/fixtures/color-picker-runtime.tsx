import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";

const window = new HappyWindow({
  url: "http://localhost",
}) as unknown as Window &
  typeof globalThis & { happyDOM: { close: () => Promise<void> } };
const document = window.document;
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
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, {
  ResizeObserver: Observer,
  IntersectionObserver: Observer,
});

window.matchMedia = () =>
  ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }) as unknown as MediaQueryList;
Object.defineProperty(window, "isSecureContext", {
  value: true,
  configurable: true,
});
let dropperCalls = 0;
let resolveDropper: (value: { sRGBHex: string }) => void = () => {};
let rejectDropper: (error: Error) => void = () => {};
let lastDropperSignal: AbortSignal | undefined;
Object.assign(window, {
  EyeDropper: class {
    open({ signal }: { signal: AbortSignal }) {
      dropperCalls++;
      lastDropperSignal = signal;
      return new Promise<{ sRGBHex: string }>((resolve, reject) => {
        resolveDropper = resolve;
        rejectDropper = reject;
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Cancelled", "AbortError")),
          { once: true },
        );
      });
    }
  },
});
const { act, useState, createRef } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ColorPicker } = await import("@workspace/ui/components/color-picker");
const wait = () => new Promise((resolve) => setTimeout(resolve, 40));
async function interaction(callback: () => void) {
  await act(async () => {
    callback();
    await wait();
  });
}
const container = document.createElement("div");
document.body.append(container);
const root = createRoot(container);
const requests: string[] = [];
const ref = createRef<HTMLButtonElement>();
let changeExternal: (value: string) => void = () => {};
let submissions = 0;
function App() {
  const [value, setValue] = useState("#007AFF");
  changeExternal = setValue;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submissions++;
      }}
    >
      <ColorPicker
        ref={ref}
        id="trigger"
        value={value}
        onValueChange={(value) => {
          requests.push(value);
          setValue(value);
        }}
        swatches={["#ff0000", "#f00", "invalid", "#00FF00"]}
      />
      <output>{value}</output>
      <div id="local">
        <ColorPicker inline alpha defaultValue="#abc8" eyeDropper={false} />
      </div>
      <div id="disabled">
        <ColorPicker inline disabled defaultValue="#007AFF" />
      </div>
      <div id="rejected">
        <ColorPicker
          inline
          value="#0000FF"
          onValueChange={(value) => requests.push(value)}
        />
      </div>
    </form>
  );
}
await interaction(() => root.render(<App />));
assert.equal(ref.current, document.querySelector("#trigger"));
assert.equal(ref.current?.tagName, "BUTTON");
assert.equal(ref.current?.getAttribute("type"), "button");
const local = document.querySelector("#local");
assert.ok(local);
const localInput = local.querySelector(
  'input[data-slot="input"]',
) as HTMLInputElement;
assert.equal(localInput.value, "#AABBCC88");
function edit(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  assert.ok(setter);
  setter.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}
await interaction(() => edit(localInput, "invalid"));
assert.equal(localInput.getAttribute("aria-invalid"), "true");
assert.equal(localInput.value, "invalid");
await interaction(() => edit(localInput, "#f008"));
assert.equal(localInput.value, "#f008");
assert.equal(localInput.getAttribute("aria-invalid"), null);
for (const value of ["#", "#1", "#12", "#123", "#1234", "#12345", "#123456"]) {
  await interaction(() => edit(localInput, value));
  assert.equal(localInput.value, value);
}
await interaction(() =>
  localInput.dispatchEvent(
    new window.FocusEvent("focusout", { bubbles: true }),
  ),
);
assert.equal(localInput.value, "#123456FF");
await interaction(() => edit(localInput, "#f008"));
const area = local.querySelector(
  '[data-slot="color-picker-saturation"]',
) as HTMLElement;
await interaction(() =>
  area.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "ArrowDown",
      shiftKey: true,
      bubbles: true,
    }),
  ),
);
assert.equal(localInput.value, "#E6000088");
await interaction(() =>
  area.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Home", bubbles: true }),
  ),
);
assert.equal(localInput.value, "#E6E6E688");
// Hue survives achromatic colors, so restoring saturation preserves red.
await interaction(() =>
  area.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "End", bubbles: true }),
  ),
);
assert.equal(localInput.value, "#E6000088");
area.getBoundingClientRect = () => ({
  left: 10,
  top: 10,
  width: 200,
  height: 100,
  right: 210,
  bottom: 110,
  x: 10,
  y: 10,
  toJSON() {},
});
const captures = new Set<number>();
area.setPointerCapture = (id) => {
  captures.add(id);
};
area.hasPointerCapture = (id) => captures.has(id);
area.releasePointerCapture = (id) => {
  captures.delete(id);
};
function pointer(type: string, x: number, y: number, pointerId = 1) {
  return new window.PointerEvent(type, {
    bubbles: true,
    button: 0,
    pointerId,
    clientX: x,
    clientY: y,
  });
}
await interaction(() => area.dispatchEvent(pointer("pointerdown", 110, 60)));
assert.equal(localInput.value, "#80404088");
assert.equal(captures.size, 1);
await interaction(() => area.dispatchEvent(pointer("pointermove", 210, 10)));
assert.equal(localInput.value, "#FF000088");
await interaction(() => area.dispatchEvent(pointer("pointercancel", 210, 10)));
assert.equal(captures.size, 0);
await interaction(() => area.dispatchEvent(pointer("pointermove", 10, 110)));
assert.equal(localInput.value, "#FF000088");
const localFormatTrigger = local.querySelector(
  '[data-slot="select-trigger"]',
) as HTMLButtonElement;
await interaction(() => localFormatTrigger.click());
const alphaOklchOption = [
  ...document.querySelectorAll(
    '[data-slot="select-content"][data-open] [role="option"]',
  ),
].find((element) => element.textContent === "OKLCH") as HTMLElement;
await interaction(() => alphaOklchOption.click());
await interaction(() => edit(localInput, "oklch(.5 0 0 / 0)"));
assert.equal(localInput.getAttribute("aria-invalid"), null);
await interaction(() =>
  localInput.dispatchEvent(
    new window.FocusEvent("focusout", { bubbles: true }),
  ),
);
assert.match(localInput.value, /^oklch\(.+ \/ 0\)$/);
const localOpacity = local.querySelectorAll(
  'input[type="range"]',
)[1] as HTMLInputElement;
assert.equal(localOpacity?.value, "0");
const disabledArea = document.querySelector(
  '#disabled [data-slot="color-picker-saturation"]',
) as HTMLElement;
assert.equal(disabledArea.tabIndex, -1);
await interaction(() =>
  disabledArea.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "ArrowDown",
      shiftKey: true,
      bubbles: true,
    }),
  ),
);
assert.equal(
  (
    document.querySelector(
      '#disabled input[data-slot="input"]',
    ) as HTMLInputElement
  ).value,
  "#007AFF",
);
const rejectedInput = document.querySelector(
  '#rejected input[data-slot="input"]',
) as HTMLInputElement;
await interaction(() => edit(rejectedInput, "#FF0000"));
assert.equal(rejectedInput.value, "#0000FF");
assert.equal(requests.at(-1), "#FF0000");
await interaction(() => ref.current?.click());
const popup = document.querySelector('[data-slot="popover-content"]');
assert.ok(popup);
const swatches = popup.querySelectorAll("fieldset button");
assert.equal(swatches.length, 2);
await interaction(() => (swatches[0] as HTMLButtonElement).click());
assert.equal(document.querySelector("output")?.textContent, "#FF0000");
assert.equal(
  (popup.querySelector('input[data-slot="input"]') as HTMLInputElement).value,
  "#FF0000",
);
await interaction(() => changeExternal("#00FF00"));
assert.equal(
  (popup.querySelector('input[data-slot="input"]') as HTMLInputElement).value,
  "#00FF00",
);
assert.equal(swatches[1]?.getAttribute("aria-pressed"), "true");
const formatTrigger = popup.querySelector(
  '[data-slot="select-trigger"]',
) as HTMLButtonElement;
await interaction(() => formatTrigger.click());
const rgbOption = [
  ...document.querySelectorAll(
    '[data-slot="select-content"][data-open] [role="option"]',
  ),
].find((element) => element.textContent === "RGB") as HTMLElement;
assert.ok(rgbOption);
await interaction(() => rgbOption.click());
const rgbInput = popup.querySelector(
  'input[data-slot="input"]',
) as HTMLInputElement;
assert.equal(rgbInput.value, "rgb(0 255 0)");
await interaction(() => edit(rgbInput, "rgb(0 0 255)"));
assert.equal(document.querySelector("output")?.textContent, "#0000FF");
assert.equal(rgbInput.value, "rgb(0 0 255)");
await interaction(() => formatTrigger.click());
const oklchOption = [
  ...document.querySelectorAll(
    '[data-slot="select-content"][data-open] [role="option"]',
  ),
].find((element) => element.textContent === "OKLCH") as HTMLElement;
assert.ok(oklchOption);
await interaction(() => oklchOption.click());
assert.match(rgbInput.value, /^oklch\(/);
await interaction(() =>
  edit(rgbInput, "oklch(62.795536% .25768331 29.233885)"),
);
assert.equal(document.querySelector("output")?.textContent, "#FF0000");
assert.equal(rgbInput.value, "oklch(62.795536% .25768331 29.233885)");
await interaction(() => edit(rgbInput, "oklch(50% -1 0)"));
assert.equal(rgbInput.getAttribute("aria-invalid"), "true");
assert.equal(document.querySelector("output")?.textContent, "#FF0000");
await interaction(() => changeExternal("#00FF00"));
assert.equal(rgbInput.getAttribute("aria-invalid"), null);
assert.match(rgbInput.value, /^oklch\(86.643/);
const dropperButton = popup.querySelector(
  'button[aria-label="Pick a screen color"]',
) as HTMLButtonElement;
assert.ok(dropperButton);
await interaction(() => dropperButton.click());
assert.equal(dropperCalls, 1);
assert.equal(dropperButton.disabled, true);
await interaction(() => dropperButton.click());
assert.equal(dropperCalls, 1);
await interaction(() => resolveDropper({ sRGBHex: "#123456" }));
assert.equal(document.querySelector("output")?.textContent, "#123456");
assert.equal(dropperButton.disabled, false);
await interaction(() => dropperButton.click());
await interaction(() =>
  rejectDropper(new DOMException("Cancelled", "AbortError")),
);
assert.equal(document.querySelector("output")?.textContent, "#123456");
assert.equal(popup.querySelector('[role="status"]'), null);
await interaction(() => dropperButton.click());
await interaction(() => rejectDropper(new Error("Permission unavailable")));
assert.equal(
  popup.querySelector('[role="status"]')?.textContent,
  "Could not pick a screen color",
);
assert.equal(document.querySelector("output")?.textContent, "#123456");
assert.equal(submissions, 0);
await interaction(() =>
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  ),
);
await interaction(() => {});
assert.equal(ref.current?.getAttribute("aria-expanded"), "false");
assert.equal(document.activeElement, ref.current);
await interaction(() => ref.current?.click());
const reopenedDropper = document.querySelector(
  '[data-slot="popover-content"] button[aria-label="Pick a screen color"]',
) as HTMLButtonElement;
await interaction(() => reopenedDropper.click());
assert.equal(lastDropperSignal?.aborted, false);
await interaction(() => root.unmount());
assert.equal(lastDropperSignal?.aborted, true);

await window.happyDOM.close();
console.log("ColorPicker DOM passed");
