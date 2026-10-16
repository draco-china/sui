import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";

const tailwindPlugin = Bun.resolveSync(
  "@tailwindcss/vite",
  new URL("../src", import.meta.url).pathname,
);
const { optimize } = await import(
  Bun.resolveSync("@tailwindcss/node", dirname(tailwindPlugin))
);

test("production CSS keeps fallback blur and layers live SVG refraction", () => {
  const source = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/glass.css",
      import.meta.url,
    ),
    "utf8",
  );
  const { code } = optimize(source, { minify: true });
  const material = code.match(
    /\[data-glass=true\]\[data-glass-state\]\{[^}]*background-image[^}]*\}/,
  )?.[0];
  expect(material).toBeDefined();
  expect(material).toMatch(/(?:^|;)backdrop-filter:blur\(/);
  expect(material).toContain("-webkit-backdrop-filter:blur(");
  expect(material).toContain("background-image:var(--glass-edge,none)");
  expect(code).not.toContain("--glass-frame");
  expect(code).not.toContain("vgpu");
  const ready: string[] =
    code.match(/[^{}]*\[data-glass-state=ready\][^{}]*\{[^}]*\}/g) ?? [];
  const svg = ready.find((rule) => rule.includes("[data-glass-renderer=svg]"));
  expect(svg).toContain("backdrop-filter:var(--glass-filter)");
  expect(svg).toContain("-webkit-backdrop-filter:var(--glass-filter)");
  expect(svg).toContain(":where(");
  expect(material).toContain("--glass-backdrop-blur:6px");
  expect(material).toMatch(
    /(?:^|;)backdrop-filter:blur\(var\(--glass-backdrop-blur\)\) ?saturate\(1\.3\)/,
  );
  expect(svg).toMatch(
    /backdrop-filter:var\(--glass-filter\) ?saturate\(1\.3\)/,
  );
  // Regular frosts more than Clear by changing variables only, so the
  // higher-specificity rule cannot override SVG refraction.
  expect(code).toContain(
    "[data-glass=true][data-glass-state][data-glass-material=regular]{--glass-opacity:30%;--glass-backdrop-blur:16px}",
  );
  expect(code).not.toContain("--glass-material-filter");
  expect(code).not.toContain("brightness(");
  // Every material keeps text legible over bright, busy backdrops with a soft
  // glow in its own tint and stronger secondary text; ordinary buttons and
  // fields keep crisp labels, and reduced transparency reverts both.
  const legible = code.match(
    /\[data-glass=true\]\[data-glass-state\]\{--glass-halo:[^}]*\}/,
  )?.[0];
  expect(legible).toContain("--glass-halo:var(--glass-base,var(--popover))");
  expect(legible).toContain(
    "text-shadow:0 0 .08em color-mix(in srgb, var(--glass-halo) 90%, transparent),",
  );
  expect(code).not.toContain("[data-glass-material=clear]");
  expect(code).toContain(
    "[data-glass=true][data-glass-state] :where(button,input,select,textarea):not([data-glass-state]){text-shadow:none}",
  );
  // Content on its own fill, such as a copy field or code, never glows.
  const layered =
    /\[data-glass=true\]\[data-glass-state\] :where\(code,kbd,pre,\[data-slot=badge\],\[data-slot=clipboard-text\],[^)]*\):not\(\[data-glass-state\]\)/;
  expect(code).toMatch(new RegExp(`${layered.source}\\{text-shadow:none\\}`));
  expect(code).toMatch(
    new RegExp(
      `${layered.source} :where\\(svg\\.lucide\\)\\{filter:revert-layer\\}`,
    ),
  );
  expect(code).toContain(
    "[data-glass=true][data-glass-state] :where(.text-muted-foreground){color:color-mix(in oklab, var(--muted-foreground) 40%, var(--foreground))}",
  );
  expect(code).toContain(
    "[data-glass=true][data-glass-state] :where(svg.lucide){filter:drop-shadow(0 0 1px color-mix(in srgb, var(--glass-halo) 85%, transparent)) drop-shadow(",
  );
  const reduced = code.slice(
    code.lastIndexOf("@media (prefers-reduced-transparency"),
  );
  expect(reduced).toContain("text-shadow:none");
  expect(reduced).toMatch(
    /:where\(\.text-muted-foreground\)\{color:revert-layer\}/,
  );
  expect(reduced).toMatch(/:where\(svg\.lucide\)\{filter:revert-layer\}/);
  // Grouped buttons share the group's capsule, with a light wash on hover.
  expect(code).toMatch(
    /\[data-slot=button-group\]:is\(\[data-glass=true\],\[data-glass-part=surface\]\)>:is\(\[data-variant=outline\][^{]*\{background-color:#0000;border-color:#0000\}/,
  );
  expect(code).toMatch(
    /:is\(:hover,:focus-visible,\[aria-expanded=true\]\):not\(:disabled\),\[data-slot=pagination-content\]\[data-glass=true\] \[data-slot=pagination-link\]:not\(\[data-active=true\]\):hover\{background-color:color-mix\(in srgb, var\(--foreground\) 8%, transparent\)\}/,
  );
  // Glass fields brighten while focused instead of drawing a ring.
  expect(code).toMatch(
    /\[data-glass=true\]:is\(\[data-slot=input\],[^{]*\[data-slot=tag-input\]\):focus-within\{--glass-press:/,
  );
  // Floating layers share one diffuse shadow; small controls keep the 1px drop shadow.
  const floating = code.match(
    /\[data-glass=true\]:is\([^{]*\[data-slot=popover-content\][^{]*\)\{[^}]*\}/,
  )?.[0];
  expect(floating).toContain("[data-slot=tooltip-content]");
  expect(floating).toContain("[data-slot=tab-bar-list]");
  expect(floating).not.toContain("[data-slot=button]");
  expect(floating).toContain("--tw-shadow:0 14px 36px -14px");
  // Pressed glass controls brighten and animate Button's shared press bloom.
  expect(code).toContain("var(--glass-press,0 0 #0000)");
  expect(code).toMatch(/:active\{--glass-press:inset 0 0 0 100vmax [^;}]+\}/);
  expect(code).toMatch(
    /transition-property:color,background-color,box-shadow,scale/,
  );
  const lens = code.match(
    /\[data-slot=tab-bar-indicator\]\[data-glass=true\]\{[^}]*\}/,
  )?.[0];
  expect(lens).toContain("background-color:#0000");
  expect(lens).toMatch(/(?:^|;)backdrop-filter:none/);
  expect(lens).toContain("-webkit-backdrop-filter:none");
});
