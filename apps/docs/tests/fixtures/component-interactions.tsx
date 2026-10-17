import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new HappyWindow({
  url: "http://localhost",
}) as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
window.document.write("<!doctype html><html><head></head><body></body></html>");
Object.defineProperty(window.document, "compatMode", {
  value: "CSS1Compat",
  configurable: true,
});
Object.assign(globalThis, {
  window,
  document: window.document,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  HTMLIFrameElement: window.HTMLIFrameElement,
  Node: window.Node,
  DocumentFragment: window.DocumentFragment,
  MutationObserver: window.MutationObserver,
  ResizeObserver: window.ResizeObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
const { act, createRef, useRef } = await import("react");
const { render, fireEvent, cleanup } = await import("@testing-library/react");
const { Calendar, CalendarDayButton } = await import(
  "@workspace/ui/components/calendar"
);
const { CalendarDay } = await import("react-day-picker");

scenario("a focused calendar day button takes focus and forwards its ref");
const date = new Date(2026, 9, 8);
const buttonRef = createRef<HTMLButtonElement>();
let view = render(
  <CalendarDayButton
    ref={buttonRef}
    day={new CalendarDay(date, new Date(2026, 9, 1))}
    modifiers={{ focused: true }}
  >
    8
  </CalendarDayButton>,
);
assert.equal(document.activeElement, view.getByText("8"));
assert.equal(buttonRef.current, view.getByText("8"));
cleanup();

scenario("a focused calendar day keeps its node and focus on reselection");
view = render(
  <Calendar mode="single" month={new Date(2026, 9, 1)} selected={date} />,
);
const day = view.container.querySelector<HTMLButtonElement>("[data-day]");
await act(async () => day?.focus());
view.rerender(
  <Calendar
    mode="single"
    month={new Date(2026, 9, 1)}
    selected={new Date(2026, 9, 9)}
  />,
);
assert.equal(day, view.container.querySelector("[data-day]"));
assert.equal(document.activeElement, day);
cleanup();

scenario("markdown code blocks keep their viewer across prop changes");
const { MarkdownViewer } = await import(
  "@workspace/ui/components/markdown-viewer"
);
view = render(<MarkdownViewer content={"```js\nconst n=1\n```"} />);
const code = view.container.querySelector('[data-slot="code-viewer"]');
assert.ok(code);
view.rerender(
  <MarkdownViewer
    content={"```js\nconst n=1\n```"}
    className="layout"
    theme="dark"
    labels={{ code: { copy: "Copy code" } }}
  />,
);
assert.equal(code, view.container.querySelector('[data-slot="code-viewer"]'));
cleanup();

scenario("an uncontrolled sidebar toggles and reports the change");
const { SidebarProvider, useSidebar } = await import(
  "@workspace/ui/components/sidebar"
);
const changes: boolean[] = [];
function SidebarProbe() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <button type="button" onClick={toggleSidebar}>
      {String(open)}
    </button>
  );
}
view = render(
  <SidebarProvider onOpenChange={(open) => changes.push(open)}>
    <SidebarProbe />
  </SidebarProvider>,
);
fireEvent.click(view.getByText("true"));
assert.ok(view.getByText("false"));
assert.deepEqual(changes, [false]);
cleanup();

scenario("a controlled sidebar reports a toggle without changing");
view = render(
  <SidebarProvider open onOpenChange={(open) => changes.push(open)}>
    <SidebarProbe />
  </SidebarProvider>,
);
fireEvent.click(view.getByText("true"));
assert.ok(view.getByText("true"));
assert.deepEqual(changes, [false, false]);
cleanup();

scenario("a vertical toggle group moves focus with ArrowDown");
const { ToggleGroup, ToggleGroupItem } = await import(
  "@workspace/ui/components/toggle-group"
);
view = render(
  <ToggleGroup orientation="vertical">
    <ToggleGroupItem value="a">A</ToggleGroupItem>
    <ToggleGroupItem value="b">B</ToggleGroupItem>
  </ToggleGroup>,
);
const [a, b] = view.container.querySelectorAll("button");
await act(async () => a?.focus());
await act(async () => {
  assert.ok(a);
  fireEvent.keyDown(a, { key: "ArrowDown" });
  await new Promise((r) => setTimeout(r, 25));
});
assert.equal(document.activeElement, b);
cleanup();

scenario("a carousel leaves arrow keys to fields and editable content");
const { Carousel } = await import("@workspace/ui/components/carousel");
view = render(
  <Carousel>
    <input defaultValue="abc" />
    <div contentEditable suppressContentEditableWarning>
      Editable
    </div>
    <button type="button">Navigation</button>
  </Carousel>,
);
for (const target of [
  view.container.querySelector("input"),
  view.getByText("Editable"),
]) {
  const event = new window.KeyboardEvent("keydown", {
    key: "ArrowLeft",
    bubbles: true,
    cancelable: true,
  });
  await act(async () => target?.dispatchEvent(event));
  assert.equal(event.defaultPrevented, false);
}
const arrow = new window.KeyboardEvent("keydown", {
  key: "ArrowRight",
  bubbles: true,
  cancelable: true,
});
await act(async () => view.getByText("Navigation").dispatchEvent(arrow));
assert.equal(arrow.defaultPrevented, true);
cleanup();

scenario("a vertical carousel handles ArrowDown");
view = render(
  <Carousel orientation="vertical">
    <button type="button">Vertical</button>
  </Carousel>,
);
const down = new window.KeyboardEvent("keydown", {
  key: "ArrowDown",
  bubbles: true,
  cancelable: true,
});
await act(async () => view.getByText("Vertical").dispatchEvent(down));
assert.equal(down.defaultPrevented, true);
cleanup();

scenario("data table pinning follows column meta and can be turned off");
const { DataTable } = await import("@workspace/ui/blocks/data-table");
type RecordRow = { id: number; user: { name: string }; name: string };
let table:
  | import("@workspace/ui/blocks/data-table/types").Table<RecordRow>
  | undefined;
const data: RecordRow[] = [{ id: 1, user: { name: "A" }, name: "A" }];
const columns: import("@workspace/ui/blocks/data-table").DataTableColumnDef<
  RecordRow,
  unknown
>[] = [
  { accessorKey: "user.name", header: "Name", meta: { pinned: "start" } },
  {
    id: "label",
    accessorFn: (r) => r.name,
    header: "Label",
    meta: { pinned: "end" },
  },
];
const props = {
  columns,
  data,
  rowKey: "id" as const,
  children: (
    ctx: import("@workspace/ui/blocks/data-table").DataTableRenderContext<RecordRow> & {
      content: import("react").ReactNode;
    },
  ) => {
    table = ctx.table;
    return ctx.content;
  },
};
view = render(<DataTable {...props} />);
assert.equal(table?.getColumn("user_name")?.getIsPinned(), "start");
assert.equal(table?.getColumn("label")?.getIsPinned(), "end");
view.rerender(<DataTable {...props} table={{ pinning: false }} />);
assert.equal(table?.getColumn("user_name")?.getIsPinned(), false);
assert.equal(table?.getColumn("label")?.getIsPinned(), false);
assert.equal(view.container.querySelector("td")?.style.position, "");
view.rerender(<DataTable {...props} />);
assert.equal(table?.getColumn("user_name")?.getIsPinned(), "start");
cleanup();

scenario("header-named columns pin and filter-only columns stay hidden");
const headerColumns: typeof columns = [
  {
    accessorFn: (r) => r.name,
    header: "Display name",
    meta: { pinned: "start" },
  },
  { accessorKey: "user.name", header: "Hidden", meta: { filterOnly: true } },
];
view = render(<DataTable {...props} columns={headerColumns} />);
assert.equal(table?.getColumn("Display name")?.getIsPinned(), "start");
assert.equal(table?.getColumn("user_name")?.getIsVisible(), false);
cleanup();

scenario("outer fullscreen leaves Tab and Escape to a nested dialog");
const { useFullscreen } = await import(
  "../../../../packages/ui/src/hooks/use-fullscreen"
);
const { Dialog } = await import("@base-ui/react/dialog");
function FullscreenProbe() {
  const ref = useRef<HTMLDivElement>(null);
  const { fullscreen } = useFullscreen({ defaultFullscreen: true, ref });
  return (
    <div ref={ref} data-fullscreen={fullscreen}>
      <button type="button">Inside</button>
      <Dialog.Root defaultOpen>
        <Dialog.Portal>
          <Dialog.Popup>
            <Dialog.Title>Nested</Dialog.Title>
            <input aria-label="First" />
            <button type="button">Portal next</button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
view = render(<FullscreenProbe />);
const first = view.getByLabelText("First");
await act(async () => first.focus());
const tab = new window.KeyboardEvent("keydown", {
  key: "Tab",
  bubbles: true,
  cancelable: true,
});
await act(async () => first.dispatchEvent(tab));
assert.equal(
  document.activeElement,
  first,
  "outer fullscreen must not steal portal focus",
);
assert.equal(tab.defaultPrevented, false);
const escapeEvent = new window.KeyboardEvent("keydown", {
  key: "Escape",
  bubbles: true,
  cancelable: true,
});
await act(async () => first.dispatchEvent(escapeEvent));
assert.equal(
  view.container
    .querySelector("[data-fullscreen]")
    ?.getAttribute("data-fullscreen"),
  "true",
);
cleanup();
await window.happyDOM.abort();
