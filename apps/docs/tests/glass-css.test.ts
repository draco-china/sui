import { expect, test } from "bun:test";
import { glassDefaults } from "../../../packages/ui/src/lib/glass/defaults";
import { glassShadow } from "../../../packages/ui/src/lib/glass/edge";
import { compiledStylesheet, optimize } from "./support/css";

// The stylesheet as production ships it: minified, with nesting flattened.
const minifiedSheet = (name: string) =>
  compiledStylesheet(`components/${name}.css`, true);
const code = minifiedSheet("glass");
const frosted = minifiedSheet("frosted");
const layer = ":is([data-glass=true],[data-frosted=true])";
const material =
  code.match(
    /\[data-glass=true\]\[data-glass-state\]\{[^}]*background-image[^}]*\}/,
  )?.[0] ?? "";
const frostedMaterial =
  frosted.match(/^\[data-frosted=true\]\{[^}]*\}/)?.[0] ?? "";
const legible =
  code.match(
    /\[data-glass=true\]\[data-glass-state\]\{--glass-halo:[^}]*\}/,
  )?.[0] ?? "";

/** A declaration value as the minifier writes it, such as colors in hex. */
function minified(value: string) {
  return optimize(`a{--value:${value}}`, { minify: true }).code.match(
    /--value:([^;}]+)/,
  )?.[1];
}

test("Clear blurs as its fallback and layers live SVG refraction over it", () => {
  expect(material).toContain("--glass-backdrop-blur:6px");
  expect(material).toMatch(
    /(?:^|;)backdrop-filter:blur\(var\(--glass-backdrop-blur\)\) ?saturate\(1\.3\)/,
  );
  expect(material).toContain("-webkit-backdrop-filter:blur(");
  expect(material).toContain("background-image:var(--glass-edge,none)");
  const ready: string[] =
    code.match(/[^{}]*\[data-glass-state=ready\][^{}]*\{[^}]*\}/g) ?? [];
  const svg = ready.find((rule) => rule.includes("[data-glass-renderer=svg]"));
  expect(svg).toContain(":where(");
  expect(svg).toMatch(
    /(?:^|;)backdrop-filter:var\(--glass-filter\) ?saturate\(1\.3\)/,
  );
  expect(svg).toContain("-webkit-backdrop-filter:var(--glass-filter)");
  for (const removed of ["--glass-frame", "vgpu", "--glass-material-filter"])
    expect(code).not.toContain(removed);
});

test("frosted glass blurs 24px behind its 65% tint, CSS only and without edge light", () => {
  expect(frostedMaterial).toContain("var(--frosted-opacity,65%)");
  expect(frostedMaterial).toMatch(
    /(?:^|;)backdrop-filter:blur\(var\(--frosted-blur,24px\)\) ?saturate\(1\.3\)/,
  );
  expect(frosted).not.toContain("--glass-edge");
  expect(frosted).not.toContain("--glass-filter");
  expect(frosted).not.toContain("outline");
  // The CSS tint matches the runtime's default before the runtime runs.
  expect(material).toContain(
    `var(--glass-opacity,${glassDefaults.tintOpacity * 100}%)`,
  );
  expect(code).not.toContain("brightness(");
  expect(code).not.toContain("data-glass-material");
  expect(code).not.toContain("data-glass-part");
});

test("frosted glass's drop shadow is glassShadow() over a white tint, or a black one in dark mode", () => {
  const shadow = (rule: RegExp) =>
    frosted.match(rule)?.[1]?.match(/--frosted-shadow:([^;}]+)/)?.[1];
  expect(shadow(/^\[data-frosted=true\]\{([^}]*)\}/)).toBe(
    minified(glassShadow([0, 0, 0], [1, 1, 1])),
  );
  expect(shadow(/\[data-frosted=true\]:where\(\.dark \*\)\{([^}]*)\}/)).toBe(
    minified(glassShadow([1, 1, 1], [0, 0, 0])),
  );
});

test("only Clear glass hides component borders, rings and focus rings", () => {
  expect(code).toMatch(
    /(?:^|\})\[data-glass=true\],\[data-slot=tabs-list\]\[data-glass=true\] \[data-slot=tabs-trigger\],/,
  );
  // Frosted glass hides borders and decorative rings but keeps focus rings,
  // and Increase Contrast brings them back.
  expect(frosted).toContain("border-color:#0000");
  expect(frosted).toContain(":not(:focus-visible,:has(>:focus-visible))");
  expect(frosted).toContain("@media (prefers-contrast:more)");
  expect(code).not.toContain("data-glass-border");
});

test("text and icons glow in the material's tint and secondary text strengthens", () => {
  expect(legible).toContain("--glass-halo:var(--glass-base,var(--popover))");
  expect(legible).toContain(
    "text-shadow:0 0 .08em color-mix(in srgb, var(--glass-halo) 90%, transparent),",
  );
  expect(legible).toContain(
    "--glass-icon-glow:drop-shadow(0 0 1px color-mix(in srgb, var(--glass-halo) 85%, transparent)) drop-shadow(",
  );
  expect(code).toContain(
    "[data-glass=true][data-glass-state] :where(svg.lucide){filter:var(--glass-icon-glow)}",
  );
  expect(code).toContain(
    `${layer} :where(.text-muted-foreground){color:color-mix(in oklab, var(--muted-foreground) 40%, var(--foreground))}`,
  );
});

test("the textGlow switch alone decides, with nothing inside a glowing surface excluded", () => {
  expect(code).toContain(
    "[data-glass=true][data-glass-state][data-glass-text-glow=false]{--glass-icon-glow:none;text-shadow:none}",
  );
  expect(code).not.toContain(
    ":where(button,input,select,textarea):not([data-glass-state])",
  );
  expect(code).not.toContain(":where(code,kbd,pre,");
});

test("each rule undoes itself under reduced transparency or forced colors", () => {
  // A positive query stays safe where the feature is unsupported.
  const reduced =
    "@media (prefers-reduced-transparency:reduce),(forced-colors:active){";
  for (const revert of [
    "[data-glass=true][data-glass-state]{--glass-initial-edge-shadow:0 0 #0000;background-color:var(--glass-base,var(--popover));",
    "[data-glass=true][data-glass-state]{text-shadow:none}",
    `${layer} :where(.text-muted-foreground){color:revert-layer}`,
    "[data-glass=true][data-glass-state] :where(svg.lucide){filter:revert-layer}",
  ])
    expect(code).toContain(reduced + revert);
  expect(code).not.toContain("prefers-reduced-transparency:no-preference");
});

test("grouped buttons share their group's capsule with a light hover wash", () => {
  expect(code).toMatch(
    /\[data-slot=button-group\]:is\(\[data-glass=true\],\[data-frosted=true\]\)>:is\(\[data-variant=outline\][^{]*\{background-color:#0000;border-color:#0000\}/,
  );
  expect(code).toMatch(
    /:is\(:hover,:focus-visible,\[aria-expanded=true\]\):not\(:disabled\),\[data-slot=pagination-content\]:is\(\[data-glass=true\],\[data-frosted=true\]\) \[data-slot=pagination-link\]:not\(\[data-active=true\]\):hover\{background-color:color-mix\(in srgb, var\(--foreground\) 8%, transparent\)\}/,
  );
});

test("focused glass fields and pressed glass controls brighten instead of drawing a ring", () => {
  expect(code).toMatch(
    /:is\(\[data-glass=true\],\[data-frosted=true\]\):is\(\[data-slot=input\],[^{]*\[data-slot=tag-input\]\):focus-within\{--glass-press:/,
  );
  expect(code).toContain("var(--glass-press,0 0 #0000)");
  expect(frosted).toContain("var(--glass-press,0 0 #0000)");
  expect(code).toMatch(/:active\{--glass-press:inset 0 0 0 100vmax [^;}]+\}/);
  expect(code).toMatch(
    /transition-property:color,background-color,box-shadow,scale/,
  );
});

test("floating layers share one diffuse shadow while small controls keep theirs", () => {
  const floating = code.match(
    /:is\(\[data-glass=true\],\[data-frosted=true\]\):is\([^{]*\[data-slot=popover-content\][^{]*\)\{[^}]*\}/,
  )?.[0];
  expect(floating).toContain("[data-slot=tooltip-content]");
  expect(floating).toContain("[data-slot=tab-bar-list]");
  expect(floating).not.toContain("[data-slot=button]");
  expect(floating).toContain("--tw-shadow:0 14px 36px -14px");
});

test("the TabBar lens has no tint or backdrop of its own", () => {
  const lens = code.match(
    /\[data-glass=true\]\[data-glass-state\]:where\(\[data-slot=tab-bar-indicator\]\)\{[^}]*\}/,
  )?.[0];
  expect(lens).toContain("background-color:#0000");
  expect(lens).toMatch(/(?:^|;)backdrop-filter:none/);
  expect(lens).toContain("-webkit-backdrop-filter:none");
});

test("Clear keyboard focus has an independent outline and system color fallback", () => {
  expect(code).toContain(":focus-visible");
  expect(code).toContain("outline:2px solid var(--ring)");
  expect(code).toContain("outline-offset:3px");
  expect(code).toContain("outline-color:highlight");
});

test("Frosted retains the inverse surface tint used by Tooltip", () => {
  expect(frosted).toContain("[class~=bg-foreground]");
  expect(frosted).toContain(
    "--frosted-tint:var(--frosted-base,var(--foreground))",
  );
});
