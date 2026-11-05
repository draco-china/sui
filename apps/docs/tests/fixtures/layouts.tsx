import { strict as assert } from "node:assert";
import { installDom } from "../support/dom";
import { scenario } from "../support/scenario";

const window = installDom("http://localhost", { width: 1280, height: 800 });
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
  IntersectionObserver: FakeIntersectionObserver,
  // Tabs measure their list; sizes do not matter here.
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
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
const { SectionLayout, SectionNav } = await import(
  "@workspace/ui/layouts/section-layout"
);
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
const sectionTrigger = document.querySelector<HTMLElement>(
  '[data-slot="select-trigger"]',
);
assert.ok(sectionTrigger);
assert.equal(sectionTrigger.textContent, "Profile");
assert.equal(sectionTrigger.getAttribute("aria-label"), "Settings");
await act(async () => {
  fireEvent.click(sectionTrigger);
});
const account = [
  ...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]'),
].find((item) => item.textContent === "Account");
assert.ok(account);
await act(async () => {
  fireEvent.click(account);
});
assert.deepEqual(visited, ["/settings/account"]);

scenario(
  "sections are a capped side column by default, and a row when horizontal",
);
const sections = [
  { title: "Profile", href: "/settings" },
  { title: "Account", href: "/settings/account" },
  { title: "Display", href: "/settings/display" },
];
await act(async () => {
  root.render(
    <LayoutProvider currentPath="/settings">
      <SectionLayout title="Settings" items={sections}>
        Content
      </SectionLayout>
    </LayoutProvider>,
  );
});
const aside = document.querySelector("aside");
assert.ok(aside?.className.includes("lg:max-w-64"), "the column has a cap");
assert.ok(aside?.className.includes("lg:min-w-48"), "and a floor");
const asideLists = [...(aside?.querySelectorAll('[role="tablist"]') ?? [])];
assert.deepEqual(
  asideLists.map((list) => list.getAttribute("aria-orientation")),
  ["vertical"],
  "one set of tabs, a column when the page is wide",
);
visited.length = 0;
await act(async () => {
  root.render(
    <LayoutProvider
      currentPath="/settings"
      onNavigate={(href) => visited.push(href)}
    >
      <SectionLayout title="Settings" orientation="horizontal" items={sections}>
        Content
      </SectionLayout>
    </LayoutProvider>,
  );
});
assert.equal(document.querySelector("aside"), null, "no side column");
assert.deepEqual(
  [...document.querySelectorAll('[role="tablist"]')].map((list) =>
    list.getAttribute("aria-orientation"),
  ),
  [null],
  "a row of tabs when horizontal",
);
const tablist = document.querySelector('[role="tablist"]');
const labelledBy = tablist?.getAttribute("aria-labelledby");
assert.ok(labelledBy, "the tabs are named by an element");
assert.equal(
  document.getElementById(labelledBy)?.textContent,
  "Settings",
  "the page title names the tabs",
);
const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
assert.equal(tabs.length, 3);
assert.equal(
  tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent,
  "ProfileProfile",
  "the current section's tab is selected",
);
const display = tabs.find((tab) => tab.textContent?.startsWith("Display"));
assert.ok(display);
await act(async () => {
  fireEvent.click(display);
});
assert.deepEqual(visited, ["/settings/display"], "choosing a tab navigates");
await act(async () => root.unmount());
await window.happyDOM.abort();
