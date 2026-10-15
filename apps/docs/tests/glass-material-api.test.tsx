import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Button } from "@workspace/ui/components/button";
import {
  type GlassMaterial,
  GlassSurface,
} from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { type HTMLElement, Window } from "happy-dom";
import { renderToString } from "react-dom/server";
import {
  glassDefaults,
  glassMaterials,
} from "../../../packages/ui/src/lib/glass/defaults";

test("clear retains confirmed defaults and regular changes only its base opacity", () => {
  expect(glassMaterials.clear).toBe(glassDefaults);
  expect(glassMaterials.regular).toEqual({
    ...glassDefaults,
    tintOpacity: 0.35,
  });
});

test("surface configuration reaches nested controls while siblings stay independent before hydration", () => {
  const material: GlassMaterial = "regular";
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <GlassSurface id="regular-parent" glassConfig={{ material }}>
        <Input id="regular-input" glass />
        <Button id="regular-button" glass>
          Action
        </Button>
        <Button id="plain-button" glass={false}>
          Plain
        </Button>
      </GlassSurface>
      <GlassSurface id="clear-surface" />
    </>,
  );
  for (const id of ["regular-input", "regular-button"])
    expect(
      window.document.querySelector<HTMLElement>(`#${id}`)?.dataset
        .glassMaterial,
    ).toBe("regular");
  expect(
    window.document.querySelector<HTMLElement>("#clear-surface")?.dataset
      .glassMaterial,
  ).toBe("clear");
  expect(
    window.document.querySelector<HTMLElement>("#plain-button")?.dataset
      .glassMaterial,
  ).toBeUndefined();
  const ids = [
    "regular-parent",
    "regular-input",
    "regular-button",
    "clear-surface",
  ].map(
    (id) =>
      window.document.querySelector<HTMLElement>(`#${id}`)?.dataset.glassScope,
  );
  expect(ids.every(Boolean)).toBe(true);
  expect(new Set(ids).size).toBe(4);
});

test("regular SSR fallback preserves explicit opacity and caller layout styles", () => {
  const window = new Window();
  const style = window.document.createElement("style");
  style.textContent = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/glass.css",
      import.meta.url,
    ),
    "utf8",
  );
  window.document.head.append(style);
  window.document.body.innerHTML = renderToString(
    <>
      <GlassSurface
        id="regular-default"
        glassConfig={{ material: "regular" }}
      />
      <GlassSurface
        id="regular-override"
        glassConfig={{ material: "regular", options: { tintOpacity: 0 } }}
        style={{ borderRadius: 9, minHeight: 48 }}
      />
    </>,
  );
  const regular =
    window.document.querySelector<HTMLElement>("#regular-default");
  const override =
    window.document.querySelector<HTMLElement>("#regular-override");
  if (!regular || !override) throw new Error("Expected both SSR surfaces");
  expect(
    window.getComputedStyle(regular).getPropertyValue("--glass-opacity"),
  ).toBe("35%");
  expect(
    window.getComputedStyle(override).getPropertyValue("--glass-opacity"),
  ).toBe("0%");
  expect(override?.style.borderRadius).toBe("9px");
  expect(override?.style.minHeight).toBe("48px");
  expect(regular?.style.getPropertyValue("--glass-opacity")).toBe("");
});

test("CSS-only skeleton keeps fixed Regular under a Clear surface configuration", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassSurface glassConfig={{ material: "clear", mode: "auto" }}>
      <Skeleton glass id="fixed-regular" />
      <Skeleton glass={false} id="plain-skeleton" />
      <GlassSurface id="ambient-clear" />
    </GlassSurface>,
  );
  const fixed = window.document.querySelector<HTMLElement>("#fixed-regular");
  const ambient = window.document.querySelector<HTMLElement>("#ambient-clear");
  expect(fixed?.dataset.glassMaterial).toBe("regular");
  expect(fixed?.dataset.glassScope).not.toBe(ambient?.dataset.glassScope);
  expect(ambient?.dataset.glassMaterial).toBe("clear");
  expect(
    window.document.querySelector<HTMLElement>("#plain-skeleton")?.dataset
      .glassMaterial,
  ).toBeUndefined();
});
