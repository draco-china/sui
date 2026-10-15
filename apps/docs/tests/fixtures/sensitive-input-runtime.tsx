import { strict as assert } from "node:assert";
import { type HTMLButtonElement as HappyButton, Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Element: window.Element,
  Node: window.Node,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", { value: window.navigator });
let finishWrite: () => void = () => {};
const writes: string[] = [];
Object.defineProperty(window.navigator, "clipboard", {
  value: {
    writeText(value: string) {
      writes.push(value);
      return new Promise<void>((resolve) => {
        finishWrite = resolve;
      });
    },
  },
});
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { SensitiveInput } = await import(
  "@workspace/ui/components/sensitive-input"
);
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host as unknown as HTMLElement);
const copied: string[] = [];
let cancelReset = false;
await act(async () => {
  root.render(
    <form onReset={(event) => cancelReset && event.preventDefault()}>
      <SensitiveInput
        defaultValue="default secret"
        defaultVisible
        onCopySuccess={(value) => copied.push(value)}
      />
    </form>,
  );
});
const form = host.querySelector("form");
const input = host.querySelector("input");
const copy = host.querySelector<HappyButton>(
  '[data-slot="sensitive-input-copy"]',
);
const status = () =>
  host
    .querySelector('[data-slot="sensitive-input"]')
    ?.getAttribute("data-copy-status");
assert(form && input && copy);

// Copy immediately after the native reset, while its DOM synchronization is pending.
await act(async () => {
  input.value = "edited secret";
  form.reset();
  assert.equal(input.value, "default secret");
  copy.click();
});
assert.equal(status(), "pending");
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  finishWrite();
});
assert.equal(status(), "copied");
assert.deepEqual(writes, ["default secret"]);
assert.deepEqual(copied, ["default secret"]);

// React cancellation must preserve both the native value and previous feedback.
cancelReset = true;
await act(async () => {
  input.value = "kept secret";
  // Happy DOM restores inputs before dispatching reset, unlike browsers.
  const event = new window.Event("reset", { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  await new Promise((resolve) => setTimeout(resolve, 10));
});
assert.equal(input.value, "kept secret");
assert.equal(status(), "copied");
cancelReset = false;
await act(async () => {
  form.reset();
});
assert.equal(status(), "idle");
await act(async () => {
  copy.click();
  root.unmount();
  finishWrite();
});
assert.deepEqual(copied, ["default secret"]);
await window.happyDOM.cancelAsync();
console.log("sensitive input reset lifecycle passed");
