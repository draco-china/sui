import { expect, test } from "bun:test";
import { describeFixture } from "./support/fixture";

describeFixture(
  "Tab Bar keeps navigation semantics through its floating press",
  "tab-bar-dom.tsx",
);

test("Tab Bar items share equal tracks in either orientation", async () => {
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
  expect(list).toContain("data-[orientation=vertical]:auto-rows-fr");
  expect(list).not.toMatch(/\sflex\s/);
});
