import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Loader, loaderVariantNames } from "@workspace/ui/components/loader";
import { Window } from "happy-dom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("Loader server rendering contract", () => {
  test("all eighteen variants render distinct decorative visuals with a localized status", () => {
    const visuals = new Set<string>();
    for (const variant of loaderVariantNames) {
      const html = renderToStaticMarkup(
        createElement(Loader, {
          variant,
          label: "正在保存草稿",
          id: `loading-${variant}`,
          title: "Save status",
          "aria-live": "polite",
          className: "text-primary",
          style: { color: "red" },
        }),
      );
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="正在保存草稿"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain(`id="loading-${variant}"`);
      expect(html).toContain('title="Save status"');
      expect(html).toContain("text-primary");
      expect(html).toContain("color:red");
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain('role="progressbar"');
      expect(html).not.toMatch(/(?:NaN|Infinity|undefined)/);
      const visualStart = html.indexOf('<span aria-hidden="true"');
      expect(visualStart).toBeGreaterThan(0);
      visuals.add(html.slice(visualStart));
    }
    expect(visuals.size).toBe(18);
  });

  test("dash ring travels one complete normalized circumference without a reset jump", () => {
    const window = new Window();
    const style = window.document.createElement("style");
    style.textContent = readFileSync(
      new URL(
        "../../../packages/ui/src/styles/components/loader.css",
        import.meta.url,
      ),
      "utf8",
    );
    window.document.head.append(style);
    const keyframes = [...(style.sheet?.cssRules ?? [])].find(
      (rule) => (rule as unknown as CSSKeyframesRule).name === "loader-dash",
    ) as unknown as CSSKeyframesRule;
    expect(keyframes).toBeDefined();
    const [start, middle, end] = [...keyframes.cssRules] as CSSKeyframeRule[];
    expect(start?.style.strokeDasharray).toBe(end?.style.strokeDasharray);
    for (const frame of [start, middle, end]) {
      expect(
        frame?.style.strokeDasharray
          .split(" ")
          .map(Number)
          .reduce((sum, part) => sum + part, 0),
      ).toBe(100);
    }
    expect(
      Number(end?.style.strokeDashoffset) -
        Number(start?.style.strokeDashoffset),
    ).toBe(-100);
    expect(Number(middle?.style.strokeDashoffset)).toBeLessThan(0);
    expect(Number(middle?.style.strokeDashoffset)).toBeGreaterThan(-100);
    expect(Number(middle?.style.strokeDasharray.split(" ")[0])).toBeGreaterThan(
      Number(start?.style.strokeDasharray.split(" ")[0]),
    );
    for (const size of [8, 16, 20, 28, 40]) {
      window.document.body.innerHTML = renderToStaticMarkup(
        createElement(Loader, { variant: "dash-ring", size }),
      );
      const svg = window.document.querySelector(
        'svg[data-slot="loader-dash-ring"]',
      );
      const arc = window.document.querySelector(
        'circle[data-slot="loader-dash"]',
      );
      expect(svg?.classList.contains("origin-center")).toBe(true);
      expect(
        window.document.querySelector('[data-slot="loader"]')?.className,
      ).toContain("motion-reduce:[&_*]:animate-none!");
      expect(arc?.getAttribute("pathLength")).toBe("100");
      expect(arc?.getAttribute("stroke-dasharray")).toBe("25 75");
      expect(arc?.getAttribute("transform")).toBe("rotate(-90 20 20)");
      const stroke = Number(arc?.getAttribute("stroke-width"));
      expect(stroke).toBeGreaterThan(0);
      expect(16 + stroke / 2).toBeLessThanOrEqual(20);
      if (size >= 16) expect((stroke * size) / 40).toBeGreaterThanOrEqual(2);
    }
    window.happyDOM.close();
  });

  test("character variants have deterministic static server frames", () => {
    for (const variant of loaderVariantNames.filter(
      (name) =>
        name.startsWith("ascii") || ["scramble", "percent"].includes(name),
    )) {
      const render = () =>
        renderToStaticMarkup(createElement(Loader, { variant }));
      const first = render();
      expect(render()).toBe(first);
      expect(first.replace(/<[^>]+>/g, "").trim().length).toBeGreaterThan(0);
    }
    expect(
      renderToStaticMarkup(createElement(Loader, { variant: "scramble" })),
    ).toContain("LOADING");
    expect(
      renderToStaticMarkup(createElement(Loader, { variant: "percent" })),
    ).toContain("0%");
  });

  test("numeric edge inputs never publish invalid SVG or CSS numbers", () => {
    const values = [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_VALUE,
      -Number.MAX_VALUE,
    ];
    for (const variant of loaderVariantNames) {
      for (const value of values) {
        const html = renderToStaticMarkup(
          createElement(Loader, { variant, size: value, speed: value }),
        );
        expect(html).not.toMatch(/(?:NaN|Infinity|undefined)/);
        expect(html).toContain('role="status"');
      }
    }
  });

  test("render elements retain native props and caller classes", () => {
    const html = renderToStaticMarkup(
      createElement(Loader, {
        label: "Loading messages",
        id: "custom-loader",
        className: "caller-class",
        render: createElement("div", {
          className: "render-class",
          "data-render": "element",
        }),
      }),
    );
    expect(html.startsWith("<div ")).toBe(true);
    expect(html).toContain('id="custom-loader"');
    expect(html).toContain('data-render="element"');
    expect(html).toContain("caller-class");
    expect(html).toContain("render-class");
    expect(html).toContain('aria-label="Loading messages"');
    expect(html).toContain('data-slot="loader"');
  });

  test("render callbacks receive the selected variant and complete decorative children", () => {
    const html = renderToStaticMarkup(
      createElement(Loader, {
        variant: "helix",
        render: (props, state) =>
          createElement("output", {
            ...props,
            "data-selected-variant": String(
              "variant" in state ? state.variant : undefined,
            ),
          }),
      }),
    );
    expect(html.startsWith("<output ")).toBe(true);
    expect(html).toContain('data-selected-variant="helix"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('role="status"');
  });

  test("multiple metaball loaders have unique SVG filter IDs with matching references", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(Loader, { variant: "metaballs" }),
        createElement(Loader, { variant: "metaballs" }),
        createElement(Loader, { variant: "metaballs" }),
      ),
    );
    const ids = [...html.matchAll(/<filter id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const refs = [...html.matchAll(/filter="url\(#([^)]*)\)"/g)].map(
      (match) => match[1],
    );
    expect(ids.length).toBe(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(refs).toEqual(ids);
  });
});
