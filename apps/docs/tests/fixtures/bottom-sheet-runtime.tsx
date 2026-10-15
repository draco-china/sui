import { strict as assert } from "node:assert";
import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });
const document = window.document as unknown as Document;
class Observer {
  observe() {}
  disconnect() {}
}
Object.assign(globalThis, {
  window,
  document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLDivElement: window.HTMLDivElement,
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

// An 800px viewport, a 12px top gap and content taller than the default size.
const heights: Record<string, number> = {
  "bottom-sheet-probe": 12,
  "bottom-sheet-header": 80,
  "bottom-sheet-body": 900,
  "bottom-sheet-footer": 80,
};
Object.defineProperties(window.HTMLElement.prototype, {
  offsetHeight: {
    get() {
      return heights[this.dataset?.slot ?? ""] ?? 0;
    },
  },
  clientHeight: {
    get() {
      return this.dataset?.slot === "bottom-sheet-viewport" ? 812 : 0;
    },
  },
  scrollHeight: {
    get() {
      return heights[this.dataset?.slot ?? ""] ?? 0;
    },
  },
});

const React = await import("react");
const { act } = React;
const { createRoot } = await import("react-dom/client");
const {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} = await import("@workspace/ui/components/bottom-sheet");

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
const changes: boolean[] = [];

function Sheet({ step }: { step: string }) {
  return (
    <BottomSheet
      defaultOpen
      contentKey={step}
      onOpenChange={(open) => changes.push(open)}
    >
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>Choose a city</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody>{step}</BottomSheetBody>
        <BottomSheetFooter>
          <BottomSheetClose>Done</BottomSheetClose>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}

await act(async () => root.render(<Sheet step="regions" />));
const popup = () =>
  document.querySelector<HTMLElement>('[data-slot="bottom-sheet-popup"]');
const grabber = () =>
  document.querySelector<HTMLButtonElement>(
    '[data-slot="bottom-sheet-grabber"]',
  );

assert.ok(popup(), "the sheet opens");
assert.ok(
  document.querySelector('[data-slot="bottom-sheet-overlay"]'),
  "a modal sheet dims the page behind it",
);
assert.ok(
  document
    .querySelector('[data-slot="bottom-sheet-viewport"]')
    ?.hasAttribute("data-base-ui-swipe-ignore"),
  "Base UI swipe handling stays out of the sheet's own gestures",
);
assert.equal(popup()?.dataset.size, "default");
assert.ok(popup()?.hasAttribute("data-expandable"));
// Half of the 800px left below the top gap.
assert.equal(popup()?.style.getPropertyValue("--bottom-sheet-height"), "400px");
const container = () =>
  document.querySelector<HTMLElement>('[data-slot="bottom-sheet-container"]');
assert.equal(
  container()?.dataset.scroll,
  "none",
  "the body of an expandable sheet at the default size does not scroll",
);
assert.equal(grabber()?.getAttribute("aria-label"), "Expand sheet");

await act(async () => grabber()?.click());
assert.equal(popup()?.dataset.size, "lg");
assert.equal(popup()?.style.getPropertyValue("--bottom-sheet-height"), "800px");
assert.equal(popup()?.style.getPropertyValue("--bottom-sheet-progress"), "1");
assert.equal(grabber()?.getAttribute("aria-label"), "Collapse sheet");
await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
assert.equal(
  container()?.dataset.scroll,
  "body",
  "the body scrolls once expansion settles",
);

await act(async () => root.render(<Sheet step="cities" />));
assert.equal(
  popup()?.dataset.size,
  "default",
  "a new content key returns to the default size",
);

await act(async () =>
  document
    .querySelector<HTMLButtonElement>('[data-slot="bottom-sheet-close"]')
    ?.click(),
);
assert.deepEqual(changes, [false]);

await act(async () =>
  root.render(
    <BottomSheet defaultOpen modal={false} key="nonmodal">
      <BottomSheetContent>
        <BottomSheetTitle>Format</BottomSheetTitle>
      </BottomSheetContent>
    </BottomSheet>,
  ),
);
assert.equal(
  document.querySelector('[data-slot="bottom-sheet-overlay"]'),
  null,
  "a nonmodal sheet leaves the page behind it usable",
);

await act(async () => root.unmount());
console.log("bottom sheet runtime passed");
