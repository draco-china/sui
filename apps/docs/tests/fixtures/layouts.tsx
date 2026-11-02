import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new HappyWindow({
  url: "http://localhost",
  width: 1280,
  height: 800,
}) as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
const document = window.document;
const observers: {
  callback: IntersectionObserverCallback;
  target?: Element;
}[] = [];
class FakeIntersectionObserver {
  record: (typeof observers)[number];
  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback };
    observers.push(this.record);
  }
  observe(target: Element) {
    this.record.target = target;
  }
  disconnect() {}
}
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLSelectElement: window.HTMLSelectElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Element: window.Element,
  Node: window.Node,
  Document: window.Document,
  DocumentFragment: window.DocumentFragment,
  ShadowRoot: window.ShadowRoot,
  SVGElement: window.SVGElement,
  MutationObserver: window.MutationObserver,
  IntersectionObserver: FakeIntersectionObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: window.navigator,
});
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { fireEvent } = await import("@testing-library/react");
const { AppInset, AppShell } = await import("@workspace/ui/layouts/app-shell");
const { AppSidebar } = await import("@workspace/ui/layouts/app-sidebar");
const { AppHeader } = await import("@workspace/ui/layouts/app-header");
const { LayoutProvider, matchPath } = await import(
  "@workspace/ui/layouts/layout-provider"
);
const { SectionNav } = await import("@workspace/ui/layouts/section-layout");
type LinkProps = import("@workspace/ui/layouts/types").LayoutLinkProps;

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
const visited: string[] = [];
function RouterLink({ href, ...props }: LinkProps) {
  return <a href={href} data-router-link {...props} />;
}
const navGroups = [
  {
    title: "General",
    items: [
      { title: "Dashboard", href: "/" },
      { title: "Tasks", href: "/tasks" },
    ],
  },
  {
    title: "Other",
    items: [
      {
        title: "Settings",
        items: [
          { title: "Profile", href: "/settings" },
          { title: "Account", href: "/settings/account" },
        ],
      },
    ],
  },
];
async function renderShell(currentPath: string, defaultOpen = true) {
  await act(async () => {
    root.render(
      <AppShell
        key={`${currentPath}-${defaultOpen}`}
        currentPath={currentPath}
        linkComponent={RouterLink}
        defaultOpen={defaultOpen}
      >
        <AppSidebar navGroups={navGroups} />
        <AppInset>
          <AppHeader fixed>Title</AppHeader>
        </AppInset>
      </AppShell>,
    );
  });
}
function link(name: string) {
  const found = [
    ...document.querySelectorAll<HTMLAnchorElement>("a[data-router-link]"),
  ].find((anchor) => anchor.textContent?.trim() === name);
  assert.ok(found, `link ${name}`);
  return found;
}

scenario("the default matcher compares paths exactly");
assert.equal(matchPath("/", "/"), true);
assert.equal(matchPath("/", "/tasks"), false);
assert.equal(matchPath("/settings/account", "/settings/account?tab=1"), true);
assert.equal(matchPath("/settings", "/settings/account"), false);
assert.equal(matchPath("/settings", "/settings-old"), false);

scenario("links use the router link and mark the current page");
await renderShell("/settings/account");
assert.equal(link("Account").getAttribute("aria-current"), "page");
assert.equal(link("Profile").getAttribute("aria-current"), null);
assert.equal(link("Dashboard").getAttribute("aria-current"), null);
assert.equal(link("Tasks").getAttribute("href"), "/tasks");
assert.equal(
  document.getElementById("main-content")?.tagName,
  "MAIN",
  "the inset is the main landmark the skip link targets",
);
assert.equal(
  document.querySelector('a[href="#main-content"]')?.textContent,
  "Skip to main content",
);

scenario("a collapsed icon sidebar turns sections into menus");
await renderShell("/settings/account", false);
assert.equal(document.querySelector('[data-slot="sidebar-menu-sub"]'), null);
const trigger = [
  ...document.querySelectorAll<HTMLButtonElement>(
    '[data-sidebar="menu-button"]',
  ),
].find((button) => button.textContent?.includes("Settings"));
assert.ok(trigger);
assert.equal(trigger.getAttribute("aria-haspopup"), "menu");
assert.ok(
  trigger.hasAttribute("data-active"),
  "the section shows its active child",
);

scenario("a fixed header gains its scrolled state from the marker");
const header = document.querySelector<HTMLElement>('[data-slot="app-header"]');
assert.ok(header);
assert.equal(header.dataset.scrolled, undefined);
const observer = observers.at(-1);
assert.ok(observer?.target);
await act(async () => {
  observer.callback(
    [{ isIntersecting: false } as IntersectionObserverEntry],
    observer as unknown as IntersectionObserver,
  );
});
assert.equal(header.dataset.scrolled, "true");

scenario("the phone select navigates through the layout");
await act(async () => {
  root.render(
    <LayoutProvider
      currentPath="/settings"
      onNavigate={(href) => visited.push(href)}
    >
      <SectionNav
        label="Settings"
        items={[
          { title: "Profile", href: "/settings" },
          { title: "Account", href: "/settings/account" },
        ]}
      />
    </LayoutProvider>,
  );
});
const select = document.querySelector<HTMLSelectElement>("select");
assert.ok(select);
assert.equal(select.value, "/settings");
assert.equal(select.getAttribute("aria-label"), "Settings");
await act(async () => {
  fireEvent.change(select, { target: { value: "/settings/account" } });
});
assert.deepEqual(visited, ["/settings/account"]);
await act(async () => root.unmount());
await window.happyDOM.abort();
