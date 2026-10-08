import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";

const window = new HappyWindow({
  url: "http://localhost",
}) as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  DocumentFragment: window.DocumentFragment,
  ShadowRoot: window.ShadowRoot,
  SVGElement: window.SVGElement,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: window.navigator,
});
const writes: string[] = [];
let finishCopy: (() => void) | undefined;
let failCopy = false;
Object.defineProperty(window.navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: async (text: string) => {
      writes.push(text);
      if (failCopy) throw new Error("Permission denied");
      await new Promise<void>((resolve) => {
        finishCopy = resolve;
      });
    },
  },
});
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { fireEvent } = await import("@testing-library/react");
const { DeleteResource } = await import("@workspace/ui/blocks/delete-resource");
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
const openChanges: boolean[] = [];
let deletes = 0;
let finishDelete: (() => void) | undefined;
const props = {
  open: true,
  onOpenChange: (value: boolean) => openChanges.push(value),
  resourceType: "worker",
  resourceName: "api-gateway",
  onDelete: async () => {
    deletes++;
    await new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
  },
};
async function render(
  extra: Partial<Parameters<typeof DeleteResource>[0]> = {},
) {
  await act(async () => {
    root.render(<DeleteResource {...props} {...extra} />);
  });
}
function copyButton() {
  const button = document.querySelector<HTMLButtonElement>(
    '[data-slot="inline-copy-text"]',
  );
  assert.ok(button);
  return button;
}
function confirmation() {
  const input = document.querySelector<HTMLInputElement>("input");
  assert.ok(input);
  return input;
}
function deleteButton() {
  const button = document.querySelector<HTMLButtonElement>(
    '[data-slot="alert-dialog-action"]',
  );
  assert.ok(button);
  return button;
}
async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
}
await render();
assert.equal(copyButton().type, "button");
assert.equal(copyButton().textContent?.trim(), "api-gateway");
assert.equal(confirmation().value, "");
assert.equal(deleteButton().disabled, true);
await click(copyButton());
assert.deepEqual(writes, ["api-gateway"]);
assert.equal(copyButton().dataset.copyStatus, "pending");
assert.equal(copyButton().disabled, true);
await click(copyButton());
assert.equal(writes.length, 1);
assert.equal(deletes, 0, "copying cannot submit the destructive form");
assert.equal(
  confirmation().value,
  "",
  "copying does not auto-confirm deletion",
);
await act(async () => finishCopy?.());
assert.equal(copyButton().dataset.copyStatus, "copied");
assert.match(copyButton().textContent ?? "", /Copied/);
assert.equal(deleteButton().disabled, true);

await render({
  labels: {
    hint: "输入 api-gateway 确认删除。",
    copy: "复制资源名称",
    copied: "已复制",
    copyFailed: "复制失败，请手动复制。",
  },
});
assert.equal(copyButton().getAttribute("aria-label"), "复制资源名称");
assert.match(
  document.querySelector('[data-slot="field-description"]')?.textContent ?? "",
  /输入 api-gateway.*确认删除。/,
);
failCopy = true;
await click(copyButton());
assert.equal(copyButton().dataset.copyStatus, "error");
assert.match(copyButton().textContent ?? "", /复制失败，请手动复制。/);
assert.equal(deletes, 0);
assert.equal(openChanges.length, 0);

await render({ isDeleting: true });
assert.equal(copyButton().disabled, true);
await click(copyButton());
assert.equal(writes.length, 2, "a busy dialog disables resource copying");
await render();
await act(async () =>
  fireEvent.change(confirmation(), { target: { value: "api-gateway" } }),
);
assert.equal(
  deleteButton().disabled,
  false,
  "the original exact-name confirmation remains active",
);
await click(deleteButton());
assert.equal(deletes, 1);
assert.equal(copyButton().disabled, true);
await act(async () => finishDelete?.());
assert.deepEqual(openChanges, [false]);

await render({
  resourceName: "other-worker",
  labels: { hint: "Enter the exact identifier." },
});
assert.equal(copyButton().dataset.copyStatus, "idle");
assert.match(
  document.querySelector('[data-slot="field-description"]')?.textContent ?? "",
  /Enter the exact identifier\. other-worker/,
);
failCopy = false;
await click(copyButton());
assert.equal(writes.at(-1), "other-worker");
await act(async () => finishCopy?.());
await render({ resourceName: "" });
assert.equal(document.querySelector('[data-slot="inline-copy-text"]'), null);
assert.equal(deleteButton().disabled, true);
await act(async () => root.unmount());
await window.happyDOM.abort();
console.log(
  "inline resource copy, feedback, confirmation and busy semantics passed",
);
