import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { GlassLab } from "../src/components/glass-lab";
import {
  GlassLabSkeleton,
  glassLabSkeletons,
} from "../src/components/glass-lab-skeleton";
import { components } from "../src/lib/catalog";
import { glassLabCatalog } from "../src/lib/glass-lab";

test("playground shows material surfaces and operation controls, while ordinary components stay in the docs catalog", () => {
  const omitted = new Set([
    "alert",
    "avatar",
    "badge",
    "breadcrumb",
    "bubble",
    "button-group",
    "collapsible",
    "empty",
    "field",
    "html-viewer",
    "item",
    "kbd",
    "loader",
    "long-text",
    "markdown-viewer",
    "marker",
    "message",
    "navigation-progress",
    "progress",
    "qr-code",
    "resizable",
    "scroll-area",
    "sidebar",
    "table",
    "aspect-ratio",
    "direction",
    "label",
    "separator",
    "skeleton",
    "theme-toggle",
    "locale-toggle",
  ]);
  expect(glassLabCatalog.map((entry) => entry.slug)).toEqual(
    components
      .filter((entry) => !omitted.has(entry.slug))
      .map((entry) => entry.slug),
  );
  expect(glassLabCatalog).toHaveLength(50);
  const dedicated = new Set(["glass", "tab-bar", "toast"]);
  for (const entry of glassLabCatalog) {
    expect(Boolean(entry.demo) || dedicated.has(entry.slug)).toBe(true);
  }
});

test("each displayed demo has its own static loading outline", () => {
  expect(Object.keys(glassLabSkeletons).sort()).toEqual(
    glassLabCatalog.map((entry) => entry.slug).sort(),
  );
  const outlines = new Map<string, string>();
  for (const entry of glassLabCatalog) {
    const window = new Window();
    const html = renderToString(
      createElement(GlassLabSkeleton, { slug: entry.slug }),
    );
    window.document.body.innerHTML = html;
    const outline = window.document.querySelector("[data-lab-skeleton]");
    expect(outline?.getAttribute("data-lab-skeleton")).toBe(entry.slug);
    expect(outline?.getAttribute("aria-hidden")).toBe("true");
    expect(
      outline?.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
    expect(outline?.querySelector("button,input,textarea")).toBeNull();
    outlines.set(entry.slug, html);
    window.close();
  }
  expect(outlines.get("button")).not.toBe(outlines.get("editor"));
  expect(outlines.get("input")).not.toBe(outlines.get("accordion"));
});

test("glass lab renders in both locales with individual glass in a shared gallery, material controls and deferred component previews", () => {
  for (const locale of ["en-US", "zh-CN"] as const) {
    const html = renderToString(createElement(GlassLab, { locale }));
    expect([...html.matchAll(/data-lab-component=/g)]).toHaveLength(
      glassLabCatalog.length,
    );
    expect([...html.matchAll(/data-lab-appearance=/g)]).toHaveLength(1);
    expect(html).toContain('data-slot="glass-lab-scene"');
    expect(html).toContain('data-lab-material="individual"');
    expect([...html.matchAll(/data-glass="true"/g)].length).toBeGreaterThan(10);
    expect([...html.matchAll(/data-lab-preview="loaded"/g)]).toHaveLength(4);
    expect(html).toContain(
      locale === "zh-CN" ? "搜索组件" : "Search components",
    );
    expect(html).not.toContain(
      locale === "zh-CN" ? "最低文字对比度" : "Automatic contrast fill",
    );
    expect(html).not.toContain(
      locale === "zh-CN" ? "CSS 回退模糊" : "CSS fallback blur",
    );
    expect(html).not.toContain("data-glass-intensity");
    expect(html).toContain('aria-invalid="true"');
    expect(html).not.toContain('data-slot="editor"');
  }
});

test("fullscreen lab keeps the same component coverage without per-component comparison shells", () => {
  const html = renderToString(createElement(GlassLab, { locale: "zh-CN" }));
  expect([...html.matchAll(/data-lab-container=/g)]).toHaveLength(1);
  expect([...html.matchAll(/data-lab-component=/g)]).toHaveLength(
    glassLabCatalog.length,
  );
  expect(html).toContain('data-slot="sidebar"');
  expect(html).toContain('data-slot="sidebar-content"');
  expect(html).not.toContain("全部收起");
  expect(html).not.toContain("展开当前分类");
});

test("playground separates the glass switch, two materials and two video backgrounds in both locales", () => {
  for (const locale of ["en-US", "zh-CN"] as const) {
    const window = new Window();
    window.document.body.innerHTML = renderToString(
      createElement(GlassLab, { locale }),
    );
    const sidebar = window.document.querySelector('[data-slot="sidebar"]');
    expect(sidebar).not.toBeNull();
    const materialLabel =
      locale === "zh-CN" ? "组件材质" : "Component material";
    const material = sidebar?.querySelector(
      `[data-slot="toggle-group"][aria-label="${materialLabel}"]`,
    );
    const choices = [...(material?.querySelectorAll("button") ?? [])];
    expect(choices.map((choice) => choice.textContent)).toEqual([
      locale === "zh-CN" ? "普通" : "Ordinary",
      "Glass",
    ]);
    expect(
      choices.map((choice) => choice.getAttribute("aria-pressed")),
    ).toEqual(["false", "true"]);
    const glassMaterialLabel =
      locale === "zh-CN" ? "玻璃材质" : "Glass material";
    const glassMaterial = sidebar?.querySelector(
      `[data-slot="toggle-group"][aria-label="${glassMaterialLabel}"]`,
    );
    const materials = [...(glassMaterial?.querySelectorAll("button") ?? [])];
    expect(materials.map((choice) => choice.textContent)).toEqual(
      locale === "zh-CN" ? ["清透", "常规"] : ["Clear", "Regular"],
    );
    expect(
      materials.map((choice) => choice.getAttribute("aria-pressed")),
    ).toEqual(["true", "false"]);
    const backgroundLabel = locale === "zh-CN" ? "测试背景" : "Test background";
    const background = sidebar?.querySelector(
      `[data-slot="toggle-group"][aria-label="${backgroundLabel}"]`,
    );
    const videos = [...(background?.querySelectorAll("button") ?? [])];
    expect(videos).toHaveLength(2);
    expect(videos.map((choice) => choice.getAttribute("aria-pressed"))).toEqual(
      ["true", "false"],
    );
    expect(videos[0]?.textContent).toContain(
      locale === "zh-CN" ? "海岸" : "Coast",
    );
    expect(videos[1]?.textContent).toContain(
      locale === "zh-CN" ? "海浪" : "Waves",
    );
    const modeLabel = locale === "zh-CN" ? "渲染方式" : "Rendering mode";
    const mode = sidebar?.querySelector(
      `[data-slot="toggle-group"][aria-label="${modeLabel}"]`,
    );
    expect(
      [...(mode?.querySelectorAll("button") ?? [])].map((choice) =>
        choice.getAttribute("aria-pressed"),
      ),
    ).toEqual(["true", "false", "false"]);
    const categoryLabel =
      locale === "zh-CN" ? "组件分类" : "Component category";
    const category = window.document.querySelector(
      `[data-slot="toggle-group"][aria-label="${categoryLabel}"]`,
    );
    expect(category).toBeNull();
    for (const section of window.document.querySelectorAll(
      "[data-lab-component]",
    )) {
      expect(section.children).toHaveLength(1);
      expect(section.firstElementChild?.hasAttribute("data-lab-preview")).toBe(
        true,
      );
    }
    expect(window.document.querySelectorAll("select")).toHaveLength(0);
    const backdrop = window.document.querySelector(
      '[data-glass-capture="media"] video[data-glass-backdrop]',
    );
    expect(backdrop?.getAttribute("src")).toBe(
      "/playground/backgrounds/coast.mp4",
    );
    const comparison = sidebar?.querySelector('[role="switch"]');
    expect(comparison?.getAttribute("aria-checked")).toBe("false");
    expect(
      window.document.querySelectorAll('[data-lab-appearance="ordinary"]'),
    ).toHaveLength(0);
    const switchFor = (label: string) => {
      const controlLabel = [...(sidebar?.querySelectorAll("label") ?? [])].find(
        (element) => element.textContent === label,
      );
      return controlLabel
        ?.closest('[data-slot="field"]')
        ?.querySelector('[role="switch"]');
    };
    expect(
      switchFor(
        locale === "zh-CN" ? "显示折射镜片" : "Show refraction lens",
      )?.getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      switchFor(
        locale === "zh-CN" ? "启用折射" : "Enable refraction",
      )?.getAttribute("aria-checked"),
    ).toBe("true");
    const lens = window.document.querySelector(
      'button[data-slot="glass-refraction-probe"]',
    );
    expect(lens?.getAttribute("data-glass")).toBe("true");
    expect(lens?.getAttribute("aria-label")).toBe(
      locale === "zh-CN" ? "折射镜片" : "Refraction lens",
    );
    expect(lens?.getAttribute("aria-keyshortcuts")).toContain("ArrowRight");
    const sliders = [
      ...(sidebar?.querySelectorAll('input[type="range"]') ?? []),
    ];
    expect(sliders.map((slider) => slider.getAttribute("aria-label"))).toEqual(
      locale === "zh-CN"
        ? ["透明度", "折射强度", "边缘高光"]
        : ["Transparency", "Refraction strength", "Edge highlight"],
    );
    expect(sliders[0]?.getAttribute("value")).toBe("90");
    expect(sidebar?.querySelector('a[href$="credits.txt"]')).toBeNull();
    window.close();
  }
});
