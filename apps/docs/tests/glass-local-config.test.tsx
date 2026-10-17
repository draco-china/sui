import { expect, test } from "bun:test";
import { Button } from "@workspace/ui/components/button";
import * as glass from "@workspace/ui/components/glass";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Toggle } from "@workspace/ui/components/toggle";
import { type HTMLElement, Window } from "happy-dom";
import { renderToString } from "react-dom/server";
import { describeFixture } from "./support/fixture";

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
        glass={{ tint: "#163842", tintOpacity: 0 }}
        style={{ minHeight: 48 }}
      />
      <GlassSurface id="second" glass={{ tintOpacity: 0.4 }} />
      <GlassSurface id="frosted" frosted />
      <GlassSurface id="off" glass={false && { tintOpacity: 0.8 }} />
    </>,
  );
  const first = window.document.querySelector<HTMLElement>("#first");
  const second = window.document.querySelector<HTMLElement>("#second");
  const frosted = window.document.querySelector<HTMLElement>("#frosted");
  const off = window.document.querySelector<HTMLElement>("#off");
  expect(first?.dataset.glassScope).toBeDefined();
  expect(second?.dataset.glassScope).not.toBe(first?.dataset.glassScope);
  expect(first?.style.getPropertyValue("--glass-base")).toBe("#163842");
  expect(first?.style.getPropertyValue("--glass-opacity")).toBe("0%");
  expect(first?.style.getPropertyValue("--glass-initial-edge-shadow")).toBe("");
  expect(first?.style.minHeight).toBe("48px");
  expect(second?.style.getPropertyValue("--glass-opacity")).toBe("40%");
  expect(frosted?.dataset.frosted).toBe("true");
  expect(frosted?.hasAttribute("data-glass")).toBe(false);
  expect(off?.hasAttribute("data-glass")).toBe(false);
  expect(off?.style.length).toBe(0);
  for (const element of [first, second, frosted, off])
    expect(element?.hasAttribute("glass")).toBe(false);
});

test("settings are never inherited: a child uses its own or the defaults", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassSurface id="parent" glass={{ tint: "#123456", tintOpacity: 0.2 }}>
      <Button id="local" glass={{ tintOpacity: 0 }}>
        Local
      </Button>
      <Button id="defaults" glass>
        Defaults
      </Button>
      <Toggle id="plain">Plain</Toggle>
    </GlassSurface>,
  );
  const parent = window.document.querySelector<HTMLElement>("#parent");
  const local = window.document.querySelector<HTMLElement>("#local");
  const defaults = window.document.querySelector<HTMLElement>("#defaults");
  const plain = window.document.querySelector<HTMLElement>("#plain");
  expect(local?.dataset.glassScope).not.toBe(parent?.dataset.glassScope);
  expect(local?.style.getPropertyValue("--glass-base")).toBe("");
  expect(local?.style.getPropertyValue("--glass-opacity")).toBe("0%");
  expect(defaults?.style.getPropertyValue("--glass-base")).toBe("");
  expect(defaults?.style.getPropertyValue("--glass-opacity")).toBe("");
  expect(defaults?.dataset.glassTextGlow).toBe("false");
  expect(plain?.hasAttribute("data-glass")).toBe(false);
});

describeFixture(
  "Local component requests keep their runtime lifecycle apart",
  "glass-local-config.tsx",
);
