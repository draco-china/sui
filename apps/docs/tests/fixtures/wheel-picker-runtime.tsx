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
// Out to the requested row, then back to the kept one.
await act(async () => {
  await Bun.sleep(800);
});
assert.equal(
  controlled.container.querySelector<HTMLElement>('[data-wheel-item="1"]')
    ?.style.transform,
  "translate3d(0,0px,0px) rotateX(0deg)",
  "the drum returns to the kept selection",
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
cleanup();
// Motion reads the preference when a wheel mounts.
reduce = true;
mediaQuery.dispatchEvent(new window.Event("change"));
const reduced = render(<WheelPicker options={options} />);
for (const item of reduced.container.querySelectorAll<HTMLElement>(
  "[data-wheel-item]",
))
  assert.equal(item.style.transform, "none");
cleanup();

// Record Web Audio calls without relying on a physical sound device. The real
// waveform is still built, so these checks cover the buffer and shared lifetime.
const contexts: MockAudioContext[] = [];
const sources: MockSource[] = [];
const buffers: Float32Array[] = [];
class MockSource {
  buffer: unknown;
  onended?: () => void;
  stopped = false;
  started = false;
  connect() {}
  disconnect() {}
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
    this.onended?.();
  }
}
class MockAudioContext {
  state = "suspended";
  sampleRate = 48_000;
  destination = {};
  resumes = 0;
  closed = false;
  gain = { value: 0 };
  constructor() {
    contexts.push(this);
  }
  createGain() {
    return { gain: this.gain, connect() {}, disconnect() {} };
  }
  createBuffer(channels: number, length: number, rate: number) {
    assert.equal(channels, 1);
    assert.equal(rate, this.sampleRate);
    const data = new Float32Array(length);
    buffers.push(data);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    const source = new MockSource();
    sources.push(source);
    return source;
  }
  resume() {
    this.resumes++;
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}
Object.defineProperty(window, "AudioContext", {
  value: MockAudioContext,
  configurable: true,
});

scenario(
  "sound follows nearest row crossings before settle without a duplicate final tick",
);
reduce = false;
const soundChanges: string[] = [];
const sounding = render(
  <WheelPicker
    feedback="sound"
    options={options}
    defaultValue="30"
    onValueChange={(v) => soundChanges.push(v)}
  />,
);
const soundWheel = sounding.getByRole("listbox");
assert.equal(contexts.length, 0, "initial render must not create audio");
// A mouse drag moves the drum one row per 36px, starting from "30".
const pointer = { pointerId: 1, pointerType: "mouse", button: 0 };
await act(async () => {
  fireEvent.pointerDown(soundWheel, { ...pointer, clientY: 200 });
});
assert.equal(contexts.length, 1);
assert.equal(
  contexts[0]?.resumes,
  1,
  "prepare in the gesture, before the drum moves",
);
assert.equal(sources.length, 0, "preparation is silent");
for (const [position, ticks] of [
  [1.4, 0],
  [1.51, 1],
  [2.4, 1],
  [2.51, 2],
  [3, 2],
] as const) {
  await act(async () => {
    fireEvent.pointerMove(soundWheel, {
      ...pointer,
      clientY: 200 - (position - 1) * 36,
    });
  });
  assert.equal(sources.length, ticks);
}
assert.equal(
  sounding.getByRole("option", { selected: true }).getAttribute("aria-label"),
  "30",
);
assert.deepEqual(
  soundChanges,
  [],
  "ticks must not depend on a committed selection",
);
assert.equal(sources[0]?.stopped, true, "a new tick cuts the previous tail");
assert.equal(buffers.length, 1);
assert.equal(buffers[0]?.length, 768, "16ms at 48kHz");
const clickBuffer = buffers[0];
assert(clickBuffer);
assert(Math.max(...clickBuffer) <= 0.900001);
assert(Math.min(...clickBuffer) < -0.1);
assert.equal(contexts[0]?.gain.value, 0.055);
await act(async () => {
  fireEvent.pointerUp(soundWheel, { ...pointer, clientY: 128 });
  await Bun.sleep(180);
});
assert.deepEqual(soundChanges, ["60"]);
assert.equal(sources.length, 2, "settling on the nearest row must stay silent");
sounding.rerender(
  <WheelPicker feedback="sound" options={options} value="15" />,
);
await act(async () => {
  await Bun.sleep(400);
});
assert.equal(sources.length, 2, "external updates must stay silent");
cleanup();
assert.equal(contexts[0]?.closed, true);

scenario(
  "keyboard and direct selection tick once, including with reduced motion",
);
reduce = true;
const direct = render(
  <WheelPicker feedback="sound" options={options} defaultValue="15" />,
);
const startTicks = sources.length;
await act(async () => {
  fireEvent.keyDown(direct.getByRole("listbox"), { key: "ArrowDown" });
  await Bun.sleep(215);
});
assert.equal(sources.length, startTicks + 1);
await act(async () => {
  fireEvent.click(direct.getByRole("option", { name: "45" }));
  await Bun.sleep(35);
  fireEvent.click(direct.getByRole("option", { name: "45" }));
});
assert.equal(sources.length, startTicks + 2);
cleanup();

scenario(
  "multiple columns share audio and release it only after the final consumer",
);
const beforeShared = contexts.length;
const columns = render(
  <>
    <WheelPicker feedback="sound" options={options} aria-label="A" />
    <WheelPicker feedback="sound" options={options} aria-label="B" />
  </>,
);
await act(async () => {
  fireEvent.keyDown(columns.getByRole("listbox", { name: "A" }), {
    key: "ArrowDown",
  });
  fireEvent.keyDown(columns.getByRole("listbox", { name: "B" }), {
    key: "ArrowDown",
  });
});
assert.equal(contexts.length, beforeShared + 1);
const shared = contexts.at(-1);
assert(shared);
columns.rerender(
  <>
    <WheelPicker options={options} aria-label="A" />
    <WheelPicker feedback="sound" options={options} aria-label="B" />
  </>,
);
assert.equal(shared.closed, false);
cleanup();
assert.equal(shared.closed, true);

scenario("disabled, empty and sound-off wheels never initialize audio");
const beforeSilent = contexts.length;
const silent = render(
  <>
    <WheelPicker feedback="sound" disabled options={options} />
    <WheelPicker feedback="sound" options={[]} />
    <WheelPicker options={options} />
  </>,
);
await act(async () => {
  for (const wheel of silent.getAllByRole("listbox")) {
    fireEvent.wheel(wheel, { deltaY: 36 });
    fireEvent.keyDown(wheel, { key: "End" });
  }
});
assert.equal(contexts.length, beforeSilent);
cleanup();

scenario("unsupported and rejected Web Audio never interrupt selection");
for (const ctor of [
  undefined,
  class {
    constructor() {
      throw new Error("Audio denied");
    }
  },
]) {
  Object.defineProperty(window, "AudioContext", {
    value: ctor,
    configurable: true,
  });
  const noAudio = render(<WheelPicker feedback="sound" options={options} />);
  await act(async () => {
    fireEvent.keyDown(noAudio.getByRole("listbox"), { key: "End" });
  });
  assert.equal(
    noAudio.getByRole("option", { selected: true }).getAttribute("aria-label"),
    "60",
  );
  cleanup();
}
await window.happyDOM.close();
