import { expect, test } from "bun:test";
import { describeFixture } from "./support/fixture";

describeFixture(
  "Tab Bar keeps navigation semantics through its floating press",
  "tab-bar-dom.tsx",
);

test("Tab Bar items share equal tracks", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { TabBar } = await import("@workspace/ui/components/tab-bar");
  const html = renderToStaticMarkup(
    createElement(TabBar, {
      "aria-label": "Destinations",
      value: "home",
      onValueChange: () => {},
      items: [
        { value: "home", label: "Home" },
        { value: "settings", label: "Notification settings" },
      ],
    }),
  );
  const list = html.match(/<div[^>]*data-slot="tab-bar-list"[^>]*>/)?.[0];
  expect(list).toContain("grid");
  expect(list).toContain("auto-cols-fr");
  expect(list).toContain("grid-flow-col");
  expect(list).not.toContain("orientation");
  expect(list).not.toMatch(/\sflex\s/);
});

test("Tab Bar items show no hover fill, only the selection pill", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { TabBar } = await import("@workspace/ui/components/tab-bar");
  const html = renderToStaticMarkup(
    createElement(TabBar, {
      "aria-label": "Destinations",
      value: "home",
      onValueChange: () => {},
      items: [
        { value: "home", label: "Home" },
        { value: "me", label: "Me" },
      ],
    }),
  );
  const items = html.match(/<button[^>]*data-tab-bar-item[^>]*>/g) ?? [];
  expect(items).toHaveLength(2);
  for (const item of items) {
    expect(item).not.toContain("hover:bg-muted");
    expect(item).toContain("hover:bg-transparent");
    expect(item).toContain(
      "group-data-[lens=false]/tab-bar:data-[active=true]:bg-foreground/8",
    );
    expect(item).toContain("data-[active=true]:text-accent-foreground");
  }
});

async function renderSearch(search?: Record<string, unknown>) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { TabBar } = await import("@workspace/ui/components/tab-bar");
  return renderToStaticMarkup(
    createElement(TabBar, {
      "aria-label": "Destinations",
      value: "home",
      onValueChange: () => {},
      items: [
        { value: "home", label: "Home" },
        { value: "me", label: "Me" },
      ],
      search,
    }),
  );
}

test("Tab Bar renders no search bar unless asked", async () => {
  expect(await renderSearch()).not.toContain("tab-bar-search");
});

test("Tab Bar search starts as a separate round button", async () => {
  const html = await renderSearch({ label: "Find" });
  expect(html).toMatch(/data-slot="tab-bar-search"[^>]*data-open="false"/);
  expect(html).toMatch(
    /<button[^>]*aria-label="Find"[^>]*aria-expanded="false"/,
  );
  expect(html).not.toContain("<input");
});

test("Tab Bar search in button mode only offers the button", async () => {
  const html = await renderSearch({ mode: "button" });
  expect(html).toMatch(/<button[^>]*aria-label="Search"/);
  expect(html).not.toContain("aria-expanded=");
});

test("Tab Bar search expands into a field and hides the bar", async () => {
  const html = await renderSearch({ open: true, value: "milk" });
  expect(html).toMatch(/data-slot="tab-bar-search"[^>]*data-open="true"/);
  expect(html).toMatch(/<input[^>]*type="search"[^>]*value="milk"/);
  expect(html).not.toContain("tab-bar-collapsed");
  expect(html).toMatch(/<div[^>]*hidden=""[^>]*data-slot="tab-bar-list"/);
});

test("Tab Bar search accepts custom expanded content", async () => {
  const html = await renderSearch({
    defaultOpen: true,
    render: () => "custom field",
  });
  expect(html).toContain("custom field");
  expect(html).not.toContain("<input");
});
