import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";

const window = new HappyWindow({
  url: "http://localhost/docs?preview=1#example",
}) as unknown as Window &
  typeof globalThis & {
    happyDOM: {
      close: () => Promise<void>;
      settings: { device: { prefersReducedMotion: string } };
    };
  };
const document = window.document;
let hidden = false;
Object.defineProperty(document, "hidden", {
  configurable: true,
  get: () => hidden,
});
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
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
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
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
const requestFrame = (callback: FrameRequestCallback) => {
  const id = ++nextFrame;
  frames.set(id, callback);
  return id;
};
const cancelFrame = (id: number) => {
  frames.delete(id);
};
Object.assign(globalThis, {
  requestAnimationFrame: requestFrame,
  cancelAnimationFrame: cancelFrame,
});
window.requestAnimationFrame = requestFrame;
window.cancelAnimationFrame = cancelFrame;
const listeners = new Set<() => void>();
let reduced = false;
window.matchMedia = (media) =>
  ({
    get matches() {
      return media.includes("prefers-reduced-motion") && reduced;
    },
    media,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
  }) as unknown as MediaQueryList;

Object.assign(globalThis, { matchMedia: window.matchMedia });
const { act, createRef, useState } = await import("react");
const { hydrateRoot } = await import("react-dom/client");
const { renderToString } = await import("react-dom/server");
const { ThemeToggle, runThemeTransition } = await import(
  "@workspace/ui/components/theme-toggle"
);
const { LocaleToggle } = await import("@workspace/ui/components/locale-toggle");
const changes: string[] = [];
const themeRef = createRef<HTMLButtonElement>();
const localeRef = createRef<HTMLButtonElement>();
const locales = [
  { value: "en-US", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "fr-FR", label: "Français" },
];
let setLocale: (locale: string) => void = () => {};
let pendingCalls = 0;
let cancelledNavigationCalls = 0;
let resolveNavigation: () => void = () => {};
let rejectNavigation: (error: Error) => void = () => {};
function navigate() {
  pendingCalls++;
  return new Promise<void>((resolve, reject) => {
    resolveNavigation = resolve;
    rejectNavigation = reject;
  });
}
function Example() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [locale, updateLocale] = useState("en-US");
  setLocale = updateLocale;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        throw new Error("toggle form submission");
      }}
    >
      <ThemeToggle
        ref={themeRef}
        id="theme"
        theme={theme}
        onThemeChange={(next) => {
          changes.push(next);
          setTheme(next);
        }}
        variant="circle"
        start="button"
      />
      <LocaleToggle
        ref={localeRef}
        id="locale"
        value={locale}
        options={locales.slice(0, 2)}
        onValueChange={(next) => {
          changes.push(next);
          updateLocale(next);
        }}
      />
      <LocaleToggle
        id="select-locale"
        mode="select"
        value={locale}
        options={locales}
        onValueChange={updateLocale}
      />
      <LocaleToggle
        id="pending-locale"
        value="en-US"
        options={locales.slice(0, 2)}
        onValueChange={navigate}
      />
      <LocaleToggle
        id="async-select"
        mode="select"
        value="en-US"
        options={locales}
        onValueChange={navigate}
      />
      <LocaleToggle
        id="cancel-before"
        value="en-US"
        options={locales.slice(0, 2)}
        onValueChange={() => {
          cancelledNavigationCalls++;
        }}
      />
      <LocaleToggle
        id="prevented-locale"
        value={locale}
        options={locales.slice(0, 2)}
        onValueChange={() => {
          throw new Error("prevented callback");
        }}
        onClick={(event) => event.preventDefault()}
      />
    </form>
  );
}
const host = document.createElement("div");
document.body.append(host);
host.innerHTML = renderToString(<Example />);
const errors: unknown[] = [];
let root: ReturnType<typeof hydrateRoot> | undefined;
await act(async () => {
  root = hydrateRoot(host, <Example />, {
    onRecoverableError: (error) => errors.push(error),
  });
  await new Promise((resolve) => setTimeout(resolve, 40));
});
assert.deepEqual(
  errors,
  [],
  "morph paths hydrate from stable server endpoints",
);
function control(id: string) {
  const element = document.getElementById(id);
  assert.ok(element);
  return element;
}
function path(id: string) {
  const element = control(id).querySelector("svg path");
  assert.ok(element);
  return element;
}
async function click(id: string) {
  await act(async () => control(id).click());
}
async function frame(time: number) {
  const callbacks = [...frames.values()];
  frames.clear();
  await act(async () => {
    for (const callback of callbacks) callback(time);
  });
}
async function settle(start = 100) {
  for (let n = 0; n < 100 && frames.size; n++) await frame(start + n * 16);
}
let transitions = 0;
Object.defineProperty(document, "startViewTransition", {
  configurable: true,
  value: (update: () => void) => {
    transitions++;
    update();
    return { finished: Promise.resolve() };
  },
});
const sunPath = path("theme");
let explicitMode: string | undefined;
runThemeTransition(
  () => {
    explicitMode = "system";
  },
  {
    button: control("theme"),
    variant: "circle",
    start: "button",
    reducedMotion: false,
  },
);
assert.equal(
  explicitMode,
  "system",
  "explicit mode selection uses the page transition without toggling to the other mode",
);
assert.equal(transitions, 1);
await Promise.resolve();
transitions = 0;
assert.equal(
  themeRef.current,
  control("theme"),
  "tooltip composition preserves the native theme button ref",
);
assert.equal(
  localeRef.current,
  control("locale"),
  "tooltip composition preserves the native locale button ref",
);
const initialSun = sunPath.getAttribute("d");
const languagePath = path("locale");
const english = languagePath.getAttribute("d");
assert.ok(initialSun && english);
assert.equal(control("theme").querySelectorAll("svg").length, 1);
assert.equal(control("locale").querySelectorAll("svg").length, 1);
assert.equal(
  control("theme").querySelector("svg")?.getAttribute("width"),
  "16",
);
assert.equal(
  control("theme").querySelector("svg")?.getAttribute("stroke-width"),
  "2",
);
assert.equal(
  control("locale").querySelector("svg")?.getAttribute("stroke-width"),
  "2",
);
await click("theme");
assert.equal(transitions, 1);
assert.equal(control("theme").getAttribute("aria-pressed"), "true");
assert.equal(
  path("theme"),
  sunPath,
  "theme morph updates one persistent SVG path",
);
await frame(0);
await frame(80);
const intermediateMoon = sunPath.getAttribute("d");
assert.notEqual(
  intermediateMoon,
  initialSun,
  "actual morph engine changes geometry in a rendered animation frame",
);
await settle(100);
const moon = sunPath.getAttribute("d");
assert.notEqual(moon, initialSun);
assert.notEqual(
  moon,
  intermediateMoon,
  "spring settles at the moon curve rather than an intermediate polyline",
);
await click("locale");
assert.deepEqual(
  changes,
  ["dark"],
  "language navigation waits for the requested glyph animation",
);
assert.equal(control("locale").getAttribute("aria-busy"), "true");
assert.equal(path("locale"), languagePath);
assert.equal(
  control("locale").getAttribute("aria-label"),
  "Change language: 简体中文",
);
assert.equal(control("locale").querySelector("svg")?.dataset.locale, "en-US");
await frame(2000);
await frame(2080);
const intermediateLanguage = languagePath.getAttribute("d");
assert.notEqual(intermediateLanguage, english);
assert.deepEqual(
  changes,
  ["dark"],
  "an intermediate path cannot start navigation",
);
await settle(2100);
assert.deepEqual(
  changes,
  ["dark", "zh-CN"],
  "canonical glyph completion starts navigation exactly once",
);
assert.equal(control("locale").querySelector("svg")?.dataset.locale, "zh-CN");
await click("prevented-locale");
assert.deepEqual(changes, ["dark", "zh-CN"]);
await act(async () => setLocale("fr-FR"));
assert.equal(
  control("select-locale").querySelector("svg")?.dataset.locale,
  "fr-FR",
);
await settle(4000);
assert.equal(
  control("select-locale").getAttribute("aria-label"),
  "Change language: Français",
);
await act(async () => {
  control("pending-locale").click();
  control("pending-locale").click();
});
assert.equal(
  pendingCalls,
  0,
  "same-frame clicks share the animation lock before navigation starts",
);
await settle(5000);
assert.equal(pendingCalls, 1);
assert.equal(control("pending-locale").getAttribute("aria-busy"), "true");
assert.equal(control("pending-locale").hasAttribute("disabled"), true);
assert.equal(
  control("pending-locale").querySelector("svg")?.dataset.locale,
  "en-US",
  "controlled selection waits for the application's committed value",
);
await act(async () => resolveNavigation());
assert.equal(control("pending-locale").getAttribute("aria-busy"), "false");
assert.equal(control("pending-locale").hasAttribute("disabled"), false);
await click("pending-locale");
await settle(7000);
assert.equal(pendingCalls, 2);
await act(async () => rejectNavigation(new Error("Navigation failed")));
assert.equal(
  control("pending-locale").getAttribute("aria-busy"),
  "false",
  "rejected callbacks release pending state without an unhandled rejection",
);
assert.equal(control("pending-locale").hasAttribute("disabled"), false);
await click("async-select");
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 40));
});
const option = [
  ...document.querySelectorAll<HTMLElement>('[role="option"]'),
].find((item) => item.textContent?.trim() === "Français");
assert.ok(option, "Base UI renders the multi-language menu");
await act(async () => option.click());
assert.equal(
  pendingCalls,
  2,
  "multi-language selection also waits for the preview morph",
);
await settle(9000);
assert.equal(
  pendingCalls,
  3,
  "select and toggle use the same asynchronous request contract",
);
assert.equal(control("async-select").getAttribute("aria-busy"), "true");
assert.equal(control("async-select").hasAttribute("disabled"), true);
await act(async () => resolveNavigation());
assert.equal(control("async-select").getAttribute("aria-busy"), "false");
await click("cancel-before");
assert.equal(cancelledNavigationCalls, 0);
await act(async () => {
  hidden = true;
  document.dispatchEvent(new window.Event("visibilitychange"));
});
assert.equal(
  cancelledNavigationCalls,
  1,
  "hidden documents complete the endpoint without waiting for paused RAF",
);
await act(async () => {
  hidden = false;
  document.dispatchEvent(new window.Event("visibilitychange"));
});

assert.equal(window.localStorage.length, 0);
assert.equal(window.location.href, "http://localhost/docs?preview=1#example");
await act(async () => {
  reduced = true;
  for (const listener of listeners) listener();
});
await click("theme");
assert.equal(transitions, 1, "reduced motion skips the page transition");
assert.equal(
  sunPath.getAttribute("d"),
  initialSun,
  "reduced motion swaps straight to the original sun curve",
);
await act(async () => setLocale("zh-CN"));
assert.equal(
  languagePath.getAttribute("d"),
  "M3.5 6.5 L10.5 6.5 M10.5 6.5 L3.5 17.5 M3.5 17.5 L10.5 17.5 M7 12 L7 12 M13.5 6.5 L13.5 17.5 M20.5 6.5 L20.5 17.5 M13.5 12 L20.5 12",
  "reduced motion uses the reference ZH lettering without animation frames",
);
await click("pending-locale");
const lateNavigation = resolveNavigation;
await act(async () => {
  reduced = false;
  for (const listener of listeners) listener();
  setLocale("en-US");
});
await click("cancel-before");
const beforeTeardownNavigation = cancelledNavigationCalls;
assert.ok(frames.size > 0, "an active language flight exists before teardown");
const detachedPath = languagePath.getAttribute("d");
await act(async () => root?.unmount());
assert.equal(themeRef.current, null);
assert.equal(localeRef.current, null);
await frame(5000);
await frame(5016);
assert.equal(
  languagePath.getAttribute("d"),
  detachedPath,
  "destroyed morphs cannot repaint detached paths",
);
assert.equal(
  frames.size,
  0,
  "destroyed morphs and pending portal frames stop scheduling work",
);
await act(async () => lateNavigation());
assert.equal(listeners.size, 0, "unmount releases media subscriptions");
assert.equal(
  cancelledNavigationCalls,
  beforeTeardownNavigation,
  "unmount before animation completion cannot navigate",
);
assert.deepEqual(errors, []);
await window.happyDOM.close();
console.log(
  "Toggle morph geometry, async callbacks, reduced motion and hydration passed",
);
