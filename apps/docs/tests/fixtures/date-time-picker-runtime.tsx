import { strict as assert } from "node:assert";
import type { DateRange } from "@workspace/ui/components/date-picker";
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
const { act, useState } = await import("react");
const { render, cleanup, fireEvent } = await import("@testing-library/react");
const { DatePicker } = await import("@workspace/ui/components/date-picker");
const { TimePicker } = await import("@workspace/ui/components/time-picker");

const type = async (element: Element, keys: string) => {
  for (const key of keys) {
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? element, { key });
    });
  }
};

scenario("typing digits fills each date segment and moves on");
{
  const changes: (Date | undefined)[] = [];
  const view = render(
    <form>
      <DatePicker
        locale="zh-CN"
        aria-label="Due"
        name="due"
        onValueChange={(value) => changes.push(value)}
      />
    </form>,
  );
  const [year] = view.getAllByRole("spinbutton");
  act(() => year.focus());
  await type(year, "20261102");
  const last = changes.at(-1);
  assert.equal(last?.getFullYear(), 2026);
  assert.equal(last?.getMonth(), 10);
  assert.equal(last?.getDate(), 2);
  const hidden =
    view.container.querySelector<HTMLInputElement>('input[name="due"]');
  assert.equal(hidden?.value, "2026-11-02");

  await act(async () => {
    fireEvent.keyDown(document.activeElement as Element, { key: "Backspace" });
  });
  assert.equal(changes.at(-1), undefined);
  cleanup();
}

scenario("arrow keys step a segment and wrap at its bounds");
{
  const view = render(
    <DatePicker
      locale="zh-CN"
      aria-label="Day"
      defaultValue={new Date(2026, 1, 28)}
    />,
  );
  const day = view.getByRole("spinbutton", { name: "日" });
  await act(async () => {
    fireEvent.keyDown(day, { key: "ArrowUp" });
  });
  assert.equal(day.getAttribute("aria-valuenow"), "1");
  cleanup();
}

scenario("a reversed range is held back until it can be put in order");
{
  const reports: ({ from?: Date; to?: Date } | undefined)[] = [];
  const view = render(
    <DatePicker
      mode="range"
      locale="zh-CN"
      defaultValue={{ from: new Date(2026, 5, 10) }}
      onValueChange={(value) => reports.push(value)}
    />,
  );
  const segments = view.getAllByRole("spinbutton");
  act(() => segments[3].focus());
  await type(segments[3], "20260101");
  assert.equal(reports.length, 0, "an end before the start is not reported");
  assert.equal(
    segments[3].getAttribute("aria-valuenow"),
    "2026",
    "typing keeps the end in place",
  );
  await act(async () => {
    (document.activeElement as HTMLElement).blur();
  });
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.from?.getMonth(), 0);
  assert.equal(reports[0]?.to?.getMonth(), 5);
  cleanup();
}

scenario("clearing a range also clears a half-typed end");
{
  const view = render(
    <DatePicker
      mode="range"
      locale="zh-CN"
      labels={{ clear: "Clear" }}
      defaultValue={{ from: new Date(2026, 5, 10) }}
    />,
  );
  const end = () => view.getAllByRole("spinbutton")[4];
  act(() => end().focus());
  await type(end(), "11");
  assert.equal(end().getAttribute("aria-valuenow"), "11");
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Clear" }));
  });
  assert.equal(
    end().getAttribute("aria-valuenow"),
    null,
    "the end's month is empty again",
  );
  cleanup();
}

scenario("time picker reports 24-hour strings from a 12-hour field");
{
  const changes: (string | undefined)[] = [];
  const view = render(
    <TimePicker
      locale="en-US"
      hourCycle="h12"
      aria-label="Alarm"
      defaultValue="09:15"
      onValueChange={(value) => changes.push(value)}
    />,
  );
  const period = view.getByRole("spinbutton", { name: "AM/PM" });
  await act(async () => {
    fireEvent.keyDown(period, { key: "p" });
  });
  assert.equal(changes.at(-1), "21:15");
  const hour = view.getByRole("spinbutton", { name: "Hour" });
  act(() => hour.focus());
  await type(hour, "07");
  assert.equal(changes.at(-1), "19:15");
  cleanup();
}

scenario("a time range ending before it starts crosses midnight");
{
  let value: { from?: string; to?: string } | undefined;
  const view = render(
    <TimePicker
      range
      locale="zh-CN"
      defaultValue={{ from: "22:00" }}
      onValueChange={(next) => {
        value = next;
      }}
    />,
  );
  const segments = view.getAllByRole("spinbutton");
  act(() => segments[2].focus());
  await type(segments[2], "0200");
  await act(async () => {
    (document.activeElement as HTMLElement).blur();
  });
  assert.deepEqual(value, { from: "22:00", to: "02:00" });
  cleanup();
}

scenario("a 12-hour hour announces 1 to 12");
{
  const view = render(
    <TimePicker
      locale="en-US"
      hourCycle="h12"
      aria-label="Alarm"
      defaultValue="19:30"
    />,
  );
  const hour = view.getByRole("spinbutton", { name: "Hour" });
  assert.equal(hour.getAttribute("aria-valuenow"), "7");
  assert.equal(hour.getAttribute("aria-valuemin"), "1");
  assert.equal(hour.getAttribute("aria-valuemax"), "12");
  const period = view.getByRole("spinbutton", { name: "AM/PM" });
  assert.equal(period.getAttribute("aria-valuenow"), "1");
  assert.equal(period.getAttribute("aria-valuetext"), "PM");
  cleanup();
}
scenario("a label for the field focuses its first segment and names it");
{
  const view = render(
    <div>
      <label htmlFor="due">Due</label>
      <DatePicker id="due" locale="zh-CN" />
    </div>,
  );
  const label = view.getByText("Due");
  await act(async () => {
    fireEvent.click(label);
  });
  const first = view.getAllByRole("spinbutton")[0];
  assert.equal(document.activeElement, first, "the label focuses the field");
  assert.equal(
    view.container
      .querySelector('[data-slot="date-time-field"]')
      ?.getAttribute("aria-labelledby"),
    label.id,
    "an unnamed field takes the label as its name",
  );
  cleanup();
}

scenario("a new value replaces a reversed range still being entered");
{
  const start = new Date(2026, 5, 10);
  let setRange: (value: DateRange | undefined) => void = () => {};
  function Controlled() {
    const [range, set] = useState<DateRange | undefined>({
      from: start,
    });
    setRange = set;
    return (
      <DatePicker
        mode="range"
        locale="zh-CN"
        value={range}
        onValueChange={set}
      />
    );
  }
  const view = render(<Controlled />);
  const segments = view.getAllByRole("spinbutton");
  act(() => segments[3].focus());
  await type(segments[3], "20260101");
  await act(async () => {
    setRange({ from: new Date(2026, 8, 1), to: new Date(2026, 8, 30) });
  });
  const spinbuttons = view.getAllByRole("spinbutton");
  assert.equal(spinbuttons[1].getAttribute("aria-valuenow"), "9");
  assert.equal(spinbuttons[4].getAttribute("aria-valuenow"), "9");
  cleanup();
}
await window.happyDOM.close();
