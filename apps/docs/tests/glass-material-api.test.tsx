import { expect, test } from "bun:test";
import { Button } from "@workspace/ui/components/button";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { type HTMLElement, Window } from "happy-dom";
import { renderToString } from "react-dom/server";
import { glassDefaults } from "../../../packages/ui/src/lib/glass/defaults";
import { compiledStylesheet } from "./support/css";

const stylesheet = (name: string) =>
  compiledStylesheet(`components/${name}.css`).replace(/\s+/g, " ");

test("glass defaults describe the see-through Clear material", () => {
  expect(glassDefaults).toEqual({ strength: 22, tintOpacity: 0.12, blur: 4 });
});

test("each glass component is its own request before hydration", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <GlassSurface id="parent">
        <Button id="second" glass>
          Second
        </Button>
        <Button id="plain-button">Plain</Button>
      </GlassSurface>
      <GlassSurface id="sibling" glass={{ edge: "vertical" }} />
    </>,
  );
  const element = (id: string) =>
    window.document.querySelector<HTMLElement>(`#${id}`);
  const ids = ["parent", "second", "sibling"].map(
    (id) => element(id)?.dataset.glassScope,
  );
  expect(ids.every(Boolean)).toBe(true);
  expect(new Set(ids).size).toBe(3);
  expect(element("plain-button")?.hasAttribute("data-glass")).toBe(false);
});

test("text glow is off by default and caller controlled", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <GlassSurface id="default" />
      <GlassSurface id="on" glass={{ textGlow: true }} />
      <GlassSurface id="frosted" frosted />
    </>,
  );
  const element = (id: string) =>
    window.document.querySelector<HTMLElement>(`#${id}`);
  expect(element("default")?.dataset.glassTextGlow).toBe("false");
  expect(element("on")?.dataset.glassTextGlow).toBe("true");
  expect(element("frosted")?.dataset.glassTextGlow).toBeUndefined();
});

test("SSR glass keeps an explicit tint opacity and caller layout styles", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassSurface
      id="override"
      glass={{ tintOpacity: 0 }}
      style={{ borderRadius: 9, minHeight: 48 }}
    />,
  );
  const override = window.document.querySelector<HTMLElement>("#override");
  expect(override?.style.getPropertyValue("--glass-opacity")).toBe("0%");
  expect(override?.style.borderRadius).toBe("9px");
  expect(override?.style.minHeight).toBe("48px");
});

test("frosted glass is a CSS-only material that keeps component paint", () => {
  const css = stylesheet("frosted");
  expect(css).toContain("blur(var(--frosted-blur, 24px)) saturate(1.3)");
  expect(css).toContain("var(--frosted-opacity, 65%)");
  expect(css).toContain("var(--frosted-base, var(--popover))");
  // Semantic paint stays solid.
  expect(css).toMatch(/bg-primary[^{]*\{ background-color: revert-layer; \}/);
  expect(css).toContain("prefers-reduced-transparency: reduce");
  expect(css).not.toContain("--glass-filter");
});

test("glass inside another glass layer keeps its material without blurring again", () => {
  const css = stylesheet("glass");
  const layer = ':is([data-glass="true"], [data-frosted="true"])';
  const selector = `${layer} ${layer}:not([data-glass-lens]) {`;
  const start = css.indexOf(selector);
  expect(start).toBeGreaterThan(-1);
  const nested = css.slice(start, css.indexOf("}", start));
  expect(nested).toContain("backdrop-filter: none");
  expect(nested).not.toContain("background");
});

test("skeletons stay ordinary placeholders inside glass", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <GlassSurface>
      <Skeleton id="placeholder" />
    </GlassSurface>,
  );
  expect(
    window.document.querySelector("#placeholder")?.hasAttribute("data-glass"),
  ).toBe(false);
});

test("GlassSurface renders any element, Clear unless frosted, with ordinary controls", () => {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <GlassSurface id="nav-surface" render={<nav aria-label="Primary" />}>
        <Button id="surface-action">Share</Button>
      </GlassSurface>
      <GlassSurface id="frosted-surface" frosted />
    </>,
  );
  const find = (id: string) => window.document.querySelector(`#${id}`);
  const surface = find("nav-surface");
  expect(surface?.tagName).toBe("NAV");
  expect(surface?.getAttribute("aria-label")).toBe("Primary");
  expect(surface?.getAttribute("data-slot")).toBe("glass-surface");
  expect(surface?.getAttribute("data-glass")).toBe("true");
  expect(find("surface-action")?.hasAttribute("data-glass")).toBe(false);
  expect(find("frosted-surface")?.getAttribute("data-frosted")).toBe("true");
  expect(find("frosted-surface")?.hasAttribute("data-glass")).toBe(false);
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
      <ButtonGroup id="outer">
        <ButtonGroup id="inner" glass>
          <Button variant="outline">Archive</Button>
        </ButtonGroup>
        <ButtonGroup id="frosted-inner" frosted>
          <Button variant="outline">Snooze</Button>
        </ButtonGroup>
      </ButtonGroup>
    </>,
  );
  const single = window.document.getElementById("single");
  expect(single?.getAttribute("data-glass")).toBe("true");
  for (const button of single?.querySelectorAll('[data-slot="button"]') ?? [])
    expect(button.hasAttribute("data-glass")).toBe(false);
  expect(
    window.document.getElementById("outer")?.hasAttribute("data-glass"),
  ).toBe(false);
  expect(
    window.document.getElementById("inner")?.getAttribute("data-glass"),
  ).toBe("true");
  expect(
    window.document
      .getElementById("frosted-inner")
      ?.getAttribute("data-frosted"),
  ).toBe("true");
});

test("cards and QR codes stay content unless they ask for glass", async () => {
  const { Card } = await import("@workspace/ui/components/card");
  const { QRCode } = await import("@workspace/ui/components/qr-code");
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <Card id="content-card">
        <Button id="content-action">Ordinary</Button>
      </Card>
      <Card id="glass-card" glass>
        <Button id="card-action">Ordinary</Button>
      </Card>
      <QRCode id="content-code" value="sui" />
      <QRCode id="glass-code" value="sui" glass />
    </>,
  );
  const element = (id: string) => window.document.getElementById(id);
  expect(element("content-card")?.hasAttribute("data-glass")).toBe(false);
  expect(element("glass-card")?.getAttribute("data-glass")).toBe("true");
  for (const id of ["content-action", "card-action"])
    expect(element(id)?.hasAttribute("data-glass")).toBe(false);
  expect(element("content-code")?.hasAttribute("data-glass")).toBe(false);
  expect(element("glass-code")?.getAttribute("data-glass")).toBe("true");
});

test("carousel controls are glass when they ask, while slides stay content", async () => {
  const {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } = await import("@workspace/ui/components/carousel");
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <Carousel>
      <CarouselContent>
        <CarouselItem>
          <Button id="slide-action">Open</Button>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious id="previous" glass />
      <CarouselNext id="next" frosted />
    </Carousel>,
  );
  const element = (id: string) => window.document.getElementById(id);
  expect(element("previous")?.getAttribute("data-glass")).toBe("true");
  expect(element("next")?.getAttribute("data-frosted")).toBe("true");
  expect(element("slide-action")?.hasAttribute("data-glass")).toBe(false);
  expect(
    window.document
      .querySelector('[data-slot="carousel"]')
      ?.hasAttribute("data-glass"),
  ).toBe(false);
});

test("form fields and pagination controls are glass when they ask", async () => {
  const { Input } = await import("@workspace/ui/components/input");
  const { Textarea } = await import("@workspace/ui/components/textarea");
  const { Pagination, PaginationControls } = await import(
    "@workspace/ui/components/pagination"
  );
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    <>
      <Input id="field" glass />
      <Textarea id="notes" frosted />
      <Input id="plain-field" />
      <Pagination id="pages" page={2} perPage={10} totalCount={48}>
        <PaginationControls glass />
      </Pagination>
    </>,
  );
  const element = (id: string) => window.document.getElementById(id);
  expect(element("field")?.getAttribute("data-glass")).toBe("true");
  expect(element("notes")?.getAttribute("data-frosted")).toBe("true");
  expect(element("plain-field")?.hasAttribute("data-glass")).toBe(false);
  const pages = element("pages");
  expect(pages?.hasAttribute("data-glass")).toBe(false);
  expect(
    pages
      ?.querySelector('[data-slot="button-group"]')
      ?.getAttribute("data-glass"),
  ).toBe("true");
});
