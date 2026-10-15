import { expect, test } from "bun:test";
import { Button } from "@workspace/ui/components/button";
import * as glass from "@workspace/ui/components/glass";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Toggle } from "@workspace/ui/components/toggle";
import { type HTMLElement, Window } from "happy-dom";
import { renderToString } from "react-dom/server";
import { GlassContext } from "../../../packages/ui/src/lib/glass/context";

test("public Glass API provides component settings and target refresh without a Provider", () => {
  expect("GlassProvider" in glass).toBe(false);
  expect(typeof glass.GlassSurface).toBe("function");
  expect(typeof glass.refreshGlass).toBe("function");
});

test("local settings create independent requests without becoming DOM attributes", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <GlassSurface
        id="first"
        glassConfig={{
          material: "clear",
          options: { tint: "#163842", tintOpacity: 0 },
        }}
        style={{ minHeight: 48 }}
      />
      <GlassSurface
        id="second"
        glassConfig={{
          material: "regular",
          options: { tintOpacity: 0.4 },
        }}
      />
      <GlassSurface
        id="off"
        glass={false}
        glassConfig={{ options: { tintOpacity: 0.8 } }}
      />
    </>,
  );
  const first = window.document.querySelector<HTMLElement>("#first");
  const second = window.document.querySelector<HTMLElement>("#second");
  const off = window.document.querySelector<HTMLElement>("#off");
  expect(first?.dataset.glassScope).toBeDefined();
  expect(second?.dataset.glassScope).not.toBe(first?.dataset.glassScope);
  expect(first?.style.getPropertyValue("--glass-base")).toBe("#163842");
  expect(first?.style.getPropertyValue("--glass-opacity")).toBe("0%");
  expect(first?.style.getPropertyValue("--glass-initial-edge-shadow")).toBe("");
  expect(first?.style.minHeight).toBe("48px");
  expect(second?.dataset.glassMaterial).toBe("regular");
  expect(second?.style.getPropertyValue("--glass-opacity")).toBe("40%");
  expect(off?.hasAttribute("data-glass")).toBe(false);
  expect(off?.style.length).toBe(0);
  for (const element of [first, second, off])
    expect(element?.hasAttribute("glassConfig")).toBe(false);
});

test("local settings inherit options while a sibling keeps its configuration", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassContext.Provider
      value={{
        enabled: true,
        surface: false,
        configuration: {
          material: "regular",
          options: { tint: "#123456", tintOpacity: 0.2 },
        },
      }}
    >
      <Button
        id="local"
        glassConfig={{ material: "clear", options: { tintOpacity: 0 } }}
      >
        Local
      </Button>
      <Button id="sibling">Action</Button>
      <Toggle id="fixed" glassConfig={{ material: "clear" }}>
        Fixed
      </Toggle>
    </GlassContext.Provider>,
  );
  const local = window.document.querySelector<HTMLElement>("#local");
  const sibling = window.document.querySelector<HTMLElement>("#sibling");
  const fixed = window.document.querySelector('[data-slot="toggle"]');
  expect(local?.dataset.glassScope).not.toBe(sibling?.dataset.glassScope);
  expect(local?.dataset.glassMaterial).toBe("clear");
  expect(local?.style.getPropertyValue("--glass-base")).toBe("#123456");
  expect(local?.style.getPropertyValue("--glass-opacity")).toBe("0%");
  expect(local?.style.getPropertyValue("--glass-edge")).toBe("");
  expect(sibling?.dataset.glassMaterial).toBe("regular");
  expect(sibling?.style.getPropertyValue("--glass-opacity")).toBe("20%");
  expect(fixed?.getAttribute("data-glass-material")).toBe("regular");
  expect(fixed?.getAttribute("data-glass-scope")).toBeTruthy();
  expect(fixed?.getAttribute("data-glass-scope")).not.toBe(
    local?.dataset.glassScope,
  );
});

test("local component requests preserve runtime lifecycle in isolation", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-local-config.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "local requests passed",
  );
}, 10_000);
