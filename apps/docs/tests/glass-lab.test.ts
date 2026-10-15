import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { GlassLab } from "../src/components/glass-lab";

function render(locale: "en-US" | "zh-CN") {
  const window = new Window();
  window.document.body.innerHTML = renderToString(
    createElement(GlassLab, { locale }),
  );
  return window;
}

test("playground keeps settings on the left and composed blocks on the right", () => {
  for (const locale of ["en-US", "zh-CN"] as const) {
    const window = render(locale);
    const document = window.document;
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const scene = document.querySelector('[data-slot="glass-lab-scene"]');
    expect(sidebar).not.toBeNull();
    expect(scene).not.toBeNull();
    expect(sidebar?.contains(scene as never)).toBe(false);
    // The shadcn-themes-style grid of realistic blocks replaced the catalog.
    expect(scene?.querySelectorAll("[data-lab-block]")).toHaveLength(12);
    expect(document.querySelector("[data-lab-component]")).toBeNull();
    expect(
      document.querySelector(
        `input[aria-label="${locale === "zh-CN" ? "搜索组件" : "Search components"}"]`,
      ),
    ).toBeNull();
    expect(scene?.querySelector("video")?.getAttribute("src")).toBe(
      "/playground/backgrounds/coast.mp4",
    );
    window.close();
  }
});

test("playground settings default to glass, Clear and diagonal edge light", () => {
  for (const locale of ["en-US", "zh-CN"] as const) {
    const window = render(locale);
    const sidebar = window.document.querySelector('[data-slot="sidebar"]');
    const group = (label: string) => {
      const buttons = [
        ...(sidebar?.querySelectorAll(
          `[data-slot="toggle-group"][aria-label="${label}"] button`,
        ) ?? []),
      ];
      return buttons.map((button) => [
        button.textContent,
        button.getAttribute("aria-pressed"),
      ]);
    };
    const zh = locale === "zh-CN";
    expect(group(zh ? "组件材质" : "Component material")).toEqual([
      [zh ? "普通" : "Ordinary", "false"],
      ["Glass", "true"],
    ]);
    expect(group(zh ? "玻璃材质" : "Glass material")).toEqual([
      [zh ? "清透" : "Clear", "true"],
      [zh ? "常规" : "Regular", "false"],
    ]);
    expect(group(zh ? "边缘光" : "Edge light")).toEqual([
      [zh ? "对角" : "Diagonal", "true"],
      [zh ? "上下" : "Vertical", "false"],
    ]);
    expect(group(zh ? "测试背景" : "Test background")).toEqual([
      [zh ? "海岸" : "Coast", "true"],
      [zh ? "海浪" : "Waves", "false"],
    ]);
    // SVG refraction with an automatic CSS fallback needs no renderer choice.
    expect(
      sidebar?.querySelector(
        `[aria-label="${zh ? "渲染方式" : "Rendering mode"}"]`,
      ),
    ).toBeNull();
    const switchFor = (label: string) =>
      [...(sidebar?.querySelectorAll("label") ?? [])]
        .find((element) => element.textContent === label)
        ?.closest('[data-slot="field"]')
        ?.querySelector('[role="switch"]')
        ?.getAttribute("aria-checked");
    expect(switchFor(zh ? "显示折射镜片" : "Show refraction lens")).toBe(
      "false",
    );
    expect(switchFor(zh ? "启用折射" : "Enable refraction")).toBe("true");
    expect(
      window.document.querySelector('[data-slot="glass-refraction-probe"]'),
    ).toBeNull();
    const sliders = [
      ...(sidebar?.querySelectorAll('input[type="range"]') ?? []),
    ];
    expect(sliders.map((slider) => slider.getAttribute("aria-label"))).toEqual(
      zh ? ["透明度", "折射强度"] : ["Transparency", "Refraction strength"],
    );
    // Clear tints 12%, so the surface starts 88% transparent.
    expect(sliders[0]?.getAttribute("value")).toBe("88");
    window.close();
  }
});

test("blocks put navigation, controls and floating layers in glass while content stays ordinary", () => {
  const window = render("en-US");
  const document = window.document;
  expect(
    document.querySelector('[data-lab-appearance="glass"]'),
  ).not.toBeNull();
  const panels = [
    ...document.querySelectorAll('[data-slot="glass-lab-panel"]'),
  ];
  expect(panels.length).toBeGreaterThan(5);
  for (const panel of panels) {
    expect(panel.getAttribute("data-glass")).toBe("true");
    expect(panel.getAttribute("data-glass-material")).toBe("clear");
  }
  // Copy components stay ordinary content inside a glass panel.
  for (const slot of ["clipboard-text", "inline-copy-text"]) {
    const copy = document.querySelector(`[data-slot="${slot}"]`);
    expect(copy?.closest('[data-slot="glass-lab-panel"]')).not.toBeNull();
    expect(copy?.hasAttribute("data-glass")).toBe(false);
    expect(copy?.querySelector("[data-glass]")).toBeNull();
  }
  expect(document.querySelector('[data-slot="tab-bar"]')).not.toBeNull();
  window.close();
});
