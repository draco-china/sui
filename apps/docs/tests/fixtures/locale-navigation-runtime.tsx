import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";

const window = new HappyWindow({
  url: "http://localhost/docs/test?preview=1#example",
}) as unknown as Window &
  typeof globalThis & { happyDOM: { close: () => Promise<void> } };
const document = window.document;
Object.assign(globalThis, {
  window,
  document,
  localStorage: window.localStorage,
  innerWidth: 1024,
  innerHeight: 768,
  scrollX: 0,
  scrollY: 0,
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
  CSS: window.CSS,
  getComputedStyle: window.getComputedStyle.bind(window),
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
const listeners = new Set<() => void>();
window.matchMedia = (media) =>
  ({
    matches: false,
    media,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
  }) as unknown as MediaQueryList;
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
  matchMedia: window.matchMedia,
});
window.requestAnimationFrame = requestFrame;
window.cancelAnimationFrame = cancelFrame;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { renderToStaticMarkup } = await import("react-dom/server");
const { ThemeIcon } = await import("@workspace/ui/components/theme-toggle");
window.localStorage.setItem("theme", "dark");
const darkShape = renderToStaticMarkup(<ThemeIcon theme="dark" />).match(
  /<path[^>]* d="([^"]+)"/,
)?.[1];
assert.ok(darkShape);
const {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
  useParams,
} = await import("@tanstack/react-router");
const { RootProvider } = await import("fumadocs-ui/provider/tanstack");
const { DocsLayout } = await import("fumadocs-ui/layouts/spacious");
const { DocsPage } = await import("fumadocs-ui/layouts/spacious/page");
const { i18nProvider } = await import("fumadocs-ui/i18n");
const { DocumentationActions, layoutOptions } = await import(
  "../../src/lib/layout"
);
const { getLocale, localePath, translations } = await import(
  "../../src/lib/i18n"
);
const { createMorph } = await import("@workspace/ui/components/morph-icon");
const targetPath = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "path",
);
const targetMorph = createMorph(
  targetPath,
  "M3.5 6.5 L10.5 6.5 M10.5 6.5 L3.5 17.5 M3.5 17.5 L10.5 17.5 M7 12 L7 12 M13.5 6.5 L13.5 17.5 M20.5 6.5 L20.5 17.5 M13.5 12 L20.5 12",
);
const chinese = targetPath.getAttribute("d");
targetMorph.destroy();
function Providers() {
  const { lang } = useParams({ strict: false });
  return (
    <RootProvider
      i18n={i18nProvider(translations, getLocale(lang))}
      theme={{
        defaultTheme: "system",
        scriptProps: { type: "application/json" },
      }}
      search={{ enabled: false }}
    >
      <Outlet />
    </RootProvider>
  );
}
function Documentation() {
  const { lang } = useParams({ strict: false });
  const locale = getLocale(lang);
  const options = layoutOptions(locale);
  return (
    <DocsLayout
      {...options}
      tree={{
        name: "Docs",
        children: [
          {
            type: "page",
            name: "Example",
            url: localePath(locale, "/docs/test"),
          },
        ],
      }}
      slots={{ ...options.slots, actions: DocumentationActions }}
      tabs={false}
      searchToggle={{ enabled: false }}
    >
      <DocsPage
        toc={[]}
        tableOfContent={{ enabled: false }}
        tableOfContentPopover={{ enabled: false }}
        footer={{ enabled: false }}
      >
        <div data-locale-content={locale}>Example</div>
      </DocsPage>
    </DocsLayout>
  );
}
let targetLoads = 0;
let releaseNavigation = () => {};
const navigationGate = new Promise<void>((resolve) => {
  releaseNavigation = resolve;
});
const rootRoute = createRootRoute({ component: Providers });
const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/{-$lang}/docs/$",
  component: Documentation,
  loader: async ({ params }) => {
    if (params.lang === "zh-CN") {
      targetLoads++;
      await navigationGate;
    }
  },
});
const router = createRouter({
  routeTree: rootRoute.addChildren([docsRoute]),
  history: createMemoryHistory({
    initialEntries: ["/docs/test?preview=1#example"],
  }),
  defaultPendingMs: 10_000,
});
await router.load();
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
await act(async () => root.render(<RouterProvider router={router} />));
function button() {
  const element = document.querySelector<HTMLButtonElement>(
    '#nd-page-panel > header [data-slot="locale-toggle"]',
  );
  assert.ok(
    element,
    "the real documentation header contains the shared language control",
  );
  return element;
}
const initialButton = button();
function themeShape() {
  return document
    .querySelector(
      '#nd-page-panel > header [data-slot="theme-mode-trigger"] path',
    )
    ?.getAttribute("d");
}
assert.equal(
  themeShape(),
  darkShape,
  "restoring a saved theme paints the final glyph without a mount morph",
);
const initialPath = initialButton.querySelector("svg path");
assert.ok(initialPath);
const initialShape = initialPath.getAttribute("d");
async function frame(time: number) {
  const callbacks = [...frames.values()];
  frames.clear();
  await act(async () => {
    for (const callback of callbacks) callback(time);
  });
}
await act(async () => {
  initialButton.click();
  initialButton.click();
});
assert.equal(initialButton.getAttribute("aria-busy"), "true");
assert.equal(
  targetLoads,
  0,
  "real route loading does not begin before the shape completes",
);
assert.equal(router.state.location.pathname, "/docs/test");
await frame(0);
await frame(80);
assert.equal(
  themeShape(),
  darkShape,
  "only the requested locale glyph animates",
);
assert.notEqual(
  initialPath.getAttribute("d"),
  initialShape,
  "the glyph visibly changes while the current document remains mounted",
);
assert.notEqual(
  initialPath.getAttribute("d"),
  chinese,
  "the intermediate curve is not the completed glyph",
);
assert.equal(targetLoads, 0);
for (let n = 0; n < 150 && targetLoads === 0; n++) await frame(100 + n * 16);
assert.equal(initialPath.getAttribute("d"), chinese);
assert.equal(
  targetLoads,
  1,
  "two clicks navigate once, after reaching the actual endpoint",
);
assert.equal(
  button(),
  initialButton,
  "the current header remains mounted during content loading",
);
assert.equal(
  initialButton.getAttribute("aria-busy"),
  "true",
  "the real layout returns the route promise",
);
await act(async () => {
  releaseNavigation();
  await new Promise((resolve) => setTimeout(resolve, 0));
});
assert.equal(router.state.location.pathname, "/zh-CN/docs/test");
assert.equal(router.state.location.searchStr, "?preview=1");
assert.equal(router.state.location.hash, "example");
assert.equal(
  document
    .querySelector("[data-locale-content]")
    ?.getAttribute("data-locale-content"),
  "zh-CN",
);
assert.equal(button().getAttribute("aria-busy"), "false");
assert.equal(button().querySelector("svg path")?.getAttribute("d"), chinese);
assert.equal(
  themeShape(),
  darkShape,
  "a new pathname header restores the existing theme without replaying its glyph",
);
await act(async () => button().click());
assert.equal(router.state.location.pathname, "/zh-CN/docs/test");
for (let n = 0; n < 150 && router.state.location.pathname !== "/docs/test"; n++)
  await frame(3000 + n * 16);
assert.equal(
  router.state.location.pathname,
  "/docs/test",
  "returning to English removes the language prefix",
);
assert.equal(router.state.location.searchStr, "?preview=1");
assert.equal(router.state.location.hash, "example");
await act(async () => root.unmount());
await window.happyDOM.close();
console.log(
  "Documentation locale navigation waits for morph completion and preserves the route passed",
);
