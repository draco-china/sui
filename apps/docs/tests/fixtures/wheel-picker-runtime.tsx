import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  SVGElement: window.SVGElement,
  MutationObserver: window.MutationObserver,
  ResizeObserver: window.ResizeObserver,
  IntersectionObserver: window.IntersectionObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
let reduce = false;
const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
Object.defineProperty(mediaQuery, "matches", { get: () => reduce });
window.matchMedia = () => mediaQuery;
window.HTMLElement.prototype.scrollTo = function (
  options: ScrollToOptions | number,
) {
  this.scrollTop = typeof options === "number" ? options : (options.top ?? 0);
};
const { act, createRef, useState } = await import("react");
const { render, cleanup, fireEvent } = await import("@testing-library/react");
const { WheelPicker } = await import("@workspace/ui/components/wheel-picker");
const options = ["15", "30", "45", "60"];
const changes: string[] = [];
const rootRef = createRef<HTMLDivElement>();

scenario(
  "uncontrolled wheel supports keyboard bounds, form values, reset and forwarded refs",
);
const uncontrolled = render(
  <form>
    <WheelPicker
      ref={rootRef}
      options={options}
      defaultValue="30"
      name="duration"
      onValueChange={(v) => changes.push(v)}
    />
  </form>,
);
const wheelNode = rootRef.current;
assert(wheelNode);
await act(async () => {
  fireEvent.keyDown(wheelNode, { key: "ArrowDown" });
  await Bun.sleep(35);
});
assert.equal(
  uncontrolled.container
    .querySelector('[aria-selected="true"]')
    ?.getAttribute("aria-label"),
  "45",
);
assert.equal(uncontrolled.container.querySelector("input")?.value, "45");
assert.deepEqual(changes, ["45"]);
await act(async () => {
  fireEvent.keyDown(wheelNode, { key: "End" });
  await Bun.sleep(35);
  fireEvent.keyDown(wheelNode, { key: "ArrowDown" });
});
assert.equal(uncontrolled.container.querySelector("input")?.value, "60");
await act(async () => {
  uncontrolled.container.querySelector("form")?.reset();
  await Bun.sleep(35);
});
assert.equal(uncontrolled.container.querySelector("input")?.value, "30");
cleanup();

scenario("controlled wheel requests changes but keeps a rejected selection");
changes.length = 0;
const controlled = render(
  <WheelPicker
    options={options}
    value="30"
    onValueChange={(v) => changes.push(v)}
  />,
);
await act(async () => {
  fireEvent.keyDown(controlled.getByRole("listbox"), { key: "ArrowDown" });
  await Bun.sleep(35);
});
assert.deepEqual(changes, ["45"]);
assert.equal(
  controlled.getByRole("option", { selected: true }).getAttribute("aria-label"),
  "30",
);
assert.equal(
  controlled.container.querySelector<HTMLElement>(
    '[data-slot="wheel-picker-viewport"]',
  )?.scrollTop,
  36,
);
cleanup();

scenario(
  "controlled wheel follows accepted and external updates and option changes",
);
function Controlled() {
  const [value, setValue] = useState("15");
  return (
    <>
      <WheelPicker options={options} value={value} onValueChange={setValue} />
      <button type="button" onClick={() => setValue("60")}>
        External
      </button>
    </>
  );
}
const accepted = render(<Controlled />);
await act(async () => {
  fireEvent.keyDown(accepted.getByRole("listbox"), { key: "ArrowDown" });
  await Bun.sleep(35);
});
assert.equal(
  accepted.getByRole("option", { selected: true }).getAttribute("aria-label"),
  "30",
);
await act(async () => {
  fireEvent.click(accepted.getByText("External"));
});
assert.equal(
  accepted.getByRole("option", { selected: true }).getAttribute("aria-label"),
  "60",
);
accepted.rerender(<WheelPicker options={["15", "30"]} value="60" />);
assert.equal(
  accepted.getByRole("option", { selected: true }).getAttribute("aria-label"),
  "15",
);
cleanup();

scenario(
  "visible row counts update the cylinder horizon without changing selection",
);
const geometryOptions = Array.from({ length: 11 }, (_, index) => String(index));
const geometry = render(
  <WheelPicker options={geometryOptions} defaultValue="5" visibleCount={5} />,
);
const visibleRows = () =>
  [
    ...geometry.container.querySelectorAll<HTMLElement>("[data-wheel-item]"),
  ].filter((element) => element.style.visibility !== "hidden").length;
assert.equal(visibleRows(), 5);
geometry.rerender(
  <WheelPicker options={geometryOptions} defaultValue="5" visibleCount={7} />,
);
assert.equal(visibleRows(), 7);
assert.equal(
  geometry.getByRole("option", { selected: true }).getAttribute("aria-label"),
  "5",
);
cleanup();

scenario("disabled and empty wheels prevent changes and have no Tab stop");
changes.length = 0;
const disabled = render(
  <WheelPicker
    options={options}
    defaultValue="30"
    disabled
    onValueChange={(v) => changes.push(v)}
  />,
);
await act(async () => {
  fireEvent.keyDown(disabled.getByRole("listbox"), { key: "ArrowDown" });
});
assert.equal(disabled.getByRole("listbox").getAttribute("tabindex"), "-1");
assert.deepEqual(changes, []);
disabled.rerender(
  <WheelPicker options={[]} itemHeight={Number.NaN} visibleCount={0} />,
);
assert.equal(
  disabled.getByRole("listbox").getAttribute("aria-disabled"),
  "true",
);
assert.equal(disabled.queryAllByRole("option").length, 0);
assert(!disabled.container.innerHTML.includes("NaN"));
cleanup();

scenario(
  "consumer keyboard cancellation and reduced-motion preference remain effective",
);
const preference = render(
  <WheelPicker
    options={options}
    onKeyDown={(event) => event.preventDefault()}
  />,
);
await act(async () => {
  fireEvent.keyDown(preference.getByRole("listbox"), { key: "End" });
});
assert.equal(
  preference.getByRole("option", { selected: true }).getAttribute("aria-label"),
  "15",
);
await act(async () => {
  reduce = true;
  mediaQuery.dispatchEvent(new window.Event("change"));
});
for (const item of preference.container.querySelectorAll<HTMLElement>(
  "[data-wheel-item]",
))
  assert.equal(item.style.transform, "none");
cleanup();
await window.happyDOM.close();
