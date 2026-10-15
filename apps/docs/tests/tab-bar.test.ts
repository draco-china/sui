import { expect, test } from "bun:test";

test("Tab Bar preserves navigation semantics through floating press interaction", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/tab-bar-dom.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "keyboard and cleanup passed",
  );
}, 10000);

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
