import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { Button } from "@workspace/ui/components/button";
import {
  GlassContent,
  type GlassMaterial,
  GlassSurface,
} from "@workspace/ui/components/glass";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { type HTMLElement, Window } from "happy-dom";
import { renderToString } from "react-dom/server";
import {
  glassDefaultMaterial,
  glassDefaults,
  glassMaterials,
} from "../../../packages/ui/src/lib/glass/defaults";

// Load the stylesheet as Tailwind compiles it, with nesting flattened.
const tailwindPlugin = Bun.resolveSync(
  "@tailwindcss/vite",
  new URL("../src", import.meta.url).pathname,
);
const { optimize } = await import(
  Bun.resolveSync("@tailwindcss/node", dirname(tailwindPlugin))
);

test("regular is the default and frosts more than the see-through clear", () => {
  expect(glassDefaultMaterial).toBe("regular");
  const { clear, regular } = glassMaterials;
  expect([clear.tintOpacity, regular.tintOpacity]).toEqual([0.12, 0.3]);
  expect([clear.blur, regular.blur]).toEqual([4, 14]);
  expect(glassDefaults.strength).toBe(22);
});

test("surface configuration reaches nested controls while siblings stay independent before hydration", () => {
  const material: GlassMaterial = "regular";
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <GlassSurface id="regular-parent" glassConfig={{ material }}>
        <Button id="regular-second" glass>
          Second
        </Button>
        <Button id="regular-button" glass>
          Action
        </Button>
        <Button id="plain-button" glass={false}>
          Plain
        </Button>
      </GlassSurface>
      <GlassSurface id="clear-surface" glassConfig={{ material: "clear" }} />
    </>,
  );
  for (const id of ["regular-second", "regular-button"])
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
    "regular-second",
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
  style.textContent = optimize(
    readFileSync(
      new URL(
        "../../../packages/ui/src/styles/components/glass.css",
        import.meta.url,
      ),
      "utf8",
    ),
  ).code;
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
  ).toBe("30%");
  expect(
    window.getComputedStyle(override).getPropertyValue("--glass-opacity"),
  ).toBe("0%");
  expect(override?.style.borderRadius).toBe("9px");
  expect(override?.style.minHeight).toBe("48px");
  expect(regular?.style.getPropertyValue("--glass-opacity")).toBe("");
});

test("skeletons stay ordinary placeholders inside glass", () => {
  const html = renderToString(
    <GlassSurface glassConfig={{ material: "clear" }}>
      <Skeleton id="placeholder" />
    </GlassSurface>,
  );
  const window = new Window();
  window.document.body.innerHTML = html;
  const placeholder = window.document.querySelector("#placeholder");
  expect(placeholder?.hasAttribute("data-glass")).toBe(false);
  expect(placeholder?.hasAttribute("data-glass-part")).toBe(false);
});

test("GlassSurface renders any element and GlassContent keeps its own controls ordinary", () => {
  const html = renderToString(
    <GlassSurface id="nav-surface" render={<nav aria-label="Primary" />}>
      <Button id="surface-action">Share</Button>
      <GlassContent id="content" render={<section />}>
        <Button id="content-action">Edit</Button>
        <Button id="explicit-action" glass>
          Pin
        </Button>
      </GlassContent>
    </GlassSurface>,
  );
  const window = new Window();
  window.document.body.innerHTML = html;
  const find = (id: string) => window.document.querySelector(`#${id}`);
  const surface = find("nav-surface");
  expect(surface?.tagName).toBe("NAV");
  expect(surface?.getAttribute("aria-label")).toBe("Primary");
  expect(surface?.getAttribute("data-slot")).toBe("glass-surface");
  expect(surface?.getAttribute("data-glass")).toBe("true");
  expect(find("surface-action")?.getAttribute("data-glass-part")).toBe(
    "control",
  );
  expect(find("content")?.tagName).toBe("SECTION");
  expect(find("content")?.getAttribute("data-slot")).toBe("glass-content");
  for (const id of ["content", "content-action"]) {
    expect(find(id)?.hasAttribute("data-glass")).toBe(false);
    expect(find(id)?.hasAttribute("data-glass-part")).toBe(false);
  }
  expect(find("explicit-action")?.getAttribute("data-glass")).toBe("true");
});

test("ordinary and glass buttons share the press bloom", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <Button id="ordinary">Ordinary</Button>
      <Button id="glass" glass>
        Glass
      </Button>
    </>,
  );
  for (const id of ["ordinary", "glass"]) {
    const classes = window.document.getElementById(id)?.className ?? "";
    expect(classes).toContain(
      "motion-safe:active:not-aria-[haspopup]:scale-[1.04]",
    );
    expect(classes).not.toContain("translate-y-px");
  }
});

test("a glass button group is one capsule, and a group of groups only lays them out", async () => {
  const { ButtonGroup } = await import("@workspace/ui/components/button-group");
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <ButtonGroup id="single" glass>
        <Button variant="outline">One</Button>
        <Button variant="outline">Two</Button>
      </ButtonGroup>
      <ButtonGroup id="outer" glass>
        <ButtonGroup id="inner">
          <Button variant="outline">Archive</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline">Snooze</Button>
        </ButtonGroup>
      </ButtonGroup>
    </>,
  );
  const single = window.document.getElementById("single");
  expect(single?.getAttribute("data-glass")).toBe("true");
  for (const button of single?.querySelectorAll('[data-slot="button"]') ?? []) {
    expect(button.hasAttribute("data-glass")).toBe(false);
    expect(button.getAttribute("data-glass-part")).toBe("control");
  }
  expect(
    window.document.getElementById("outer")?.hasAttribute("data-glass"),
  ).toBe(false);
  expect(
    window.document.getElementById("inner")?.getAttribute("data-glass"),
  ).toBe("true");
});

test("popups default to Regular with vertical edge light unless configured", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-popup-defaults.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "popup glass defaults passed",
  );
});

test("cards and QR codes stay content unless glass is explicit", async () => {
  const { Card } = await import("@workspace/ui/components/card");
  const { QRCode } = await import("@workspace/ui/components/qr-code");
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassSurface glassConfig={{ material: "clear" }}>
      <Card id="content-card">
        <Button id="content-action">Ordinary</Button>
      </Card>
      <Card id="glass-card" glass>
        <Button id="card-action">Shared</Button>
      </Card>
      <QRCode id="content-code" value="sui" />
      <QRCode id="glass-code" value="sui" glass />
    </GlassSurface>,
  );
  const element = (id: string) => window.document.getElementById(id);
  expect(element("content-card")?.hasAttribute("data-glass")).toBe(false);
  expect(element("content-action")?.hasAttribute("data-glass-part")).toBe(
    false,
  );
  expect(element("glass-card")?.getAttribute("data-glass")).toBe("true");
  expect(element("card-action")?.getAttribute("data-glass-part")).toBe(
    "control",
  );
  expect(element("content-code")?.hasAttribute("data-glass")).toBe(false);
  expect(element("glass-code")?.getAttribute("data-glass")).toBe("true");
  expect(element("glass-code")?.getAttribute("data-glass-material")).toBe(
    "clear",
  );
});

test("a glass carousel floats its controls while slides stay content", async () => {
  const {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } = await import("@workspace/ui/components/carousel");
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <Carousel glass>
      <CarouselContent>
        <CarouselItem>
          <Button id="slide-action">Open</Button>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious id="previous" />
      <CarouselNext id="next" />
    </Carousel>,
  );
  const element = (id: string) => window.document.getElementById(id);
  expect(element("previous")?.getAttribute("data-glass")).toBe("true");
  expect(element("next")?.getAttribute("data-glass")).toBe("true");
  expect(element("slide-action")?.hasAttribute("data-glass")).toBe(false);
  expect(
    window.document
      .querySelector('[data-slot="carousel"]')
      ?.hasAttribute("data-glass"),
  ).toBe(false);
});

test("form fields are glass on their own and ordinary inside glass surfaces", async () => {
  const { Input } = await import("@workspace/ui/components/input");
  const { Textarea } = await import("@workspace/ui/components/textarea");
  const { Card } = await import("@workspace/ui/components/card");
  const { Pagination } = await import("@workspace/ui/components/pagination");
  const { GlassContext } = await import(
    "../../../packages/ui/src/lib/glass/context"
  );
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassContext.Provider value={{ enabled: true, surface: false }}>
      <Input id="field" />
      <Textarea id="notes" />
      <GlassSurface>
        <Input id="surface-field" />
      </GlassSurface>
      <Card>
        <Input id="card-field" />
      </Card>
      <Pagination id="pages" page={2} perPage={10} totalCount={48} />
    </GlassContext.Provider>,
  );
  const element = (id: string) => window.document.getElementById(id);
  expect(element("field")?.getAttribute("data-glass")).toBe("true");
  expect(element("notes")?.getAttribute("data-glass")).toBe("true");
  // Inside a surface or content, a field keeps its own fill and focus ring.
  for (const id of ["surface-field", "card-field"]) {
    expect(element(id)?.hasAttribute("data-glass")).toBe(false);
    expect(element(id)?.hasAttribute("data-glass-part")).toBe(false);
  }
  const pages = element("pages");
  expect(pages?.hasAttribute("data-glass")).toBe(false);
  expect(
    pages
      ?.querySelector('[data-slot="button-group"]')
      ?.getAttribute("data-glass"),
  ).toBe("true");
});
