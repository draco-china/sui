import { expect, test } from "bun:test";
import { strict as assert } from "node:assert";
import {
  colorToCSS,
  colorToHex,
  colorToRGB,
  formatColor,
  parseColor,
  parseHexColor,
} from "@workspace/ui/lib/color/model";

function required<T>(value: T | null): T {
  assert.notEqual(value, null);
  return value as T;
}

test("color conversions accept shorthand and alpha without invalid coercion", () => {
  expect(colorToHex(required(parseHexColor("abc")))).toBe("#AABBCC");
  expect(colorToHex(required(parseHexColor("#abc8")), true)).toBe("#AABBCC88");
  expect(colorToHex(required(parseHexColor("#FF008080")), true)).toBe(
    "#FF008080",
  );
  for (const value of [
    "",
    "#ab",
    "#12345",
    "#zzzzzz",
    "red",
    "#123456789",
    "#fffffg",
  ])
    expect(parseHexColor(value)).toBeNull();
  for (let r = 0; r <= 255; r += 17)
    for (let g = 0; g <= 255; g += 51)
      for (let b = 0; b <= 255; b += 85) {
        const hex = `#${[r, g, b]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()}`;
        expect(colorToHex(required(parseHexColor(hex)))).toBe(hex);
      }
  expect(colorToCSS({ h: 0, s: 1, v: 1, a: 0.5 })).toBe("rgba(255, 0, 0, 0.5)");
  expect(colorToRGB({ h: -120, s: 1, v: 1, a: 1 })).toEqual([0, 0, 255]);
});

test("editable RGB/HSL/HSB validate ranges and retain opacity", () => {
  expect(
    colorToHex(required(parseColor("rgb(0 122 255 / 50%)", "rgb")), true),
  ).toBe("#007AFF80");
  expect(colorToHex(required(parseColor("hsl(0 100% 50%)", "hsl")))).toBe(
    "#FF0000",
  );
  expect(
    colorToHex(required(parseColor("hsb(120 100% 100% / 0.25)", "hsb")), true),
  ).toBe("#00FF0040");
  for (const [input, format] of [
    ["rgb(256 0 0)", "rgb"],
    ["hsl(0 150% 20%)", "hsl"],
    ["hsl(0 50 20)", "hsl"],
    ["rgb(0 0 0 / 2)", "rgb"],
    ["hsb(0 0% NaN%)", "hsb"],
    ["rgb(0 0 0)", "hsl"],
  ] as const)
    expect(parseColor(input, format)).toBeNull();
  for (const format of ["hex", "rgb", "hsl", "hsb"] as const) {
    const result = parseColor(
      formatColor({ h: 120, s: 1, v: 1, a: 0.5 }, format, true),
      format,
    );
    expect(result).not.toBeNull();
    expect(colorToHex(required(result), true)).toBe("#00FF0080");
  }
});

test("ColorPicker actual DOM handles controlled and local values, validation, keyboard, pointers and popup focus", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/color-picker-runtime.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "ColorPicker DOM passed",
  );
}, 20_000);

test("OKLCH known primaries, neutral endpoints and alpha match sRGB", () => {
  const vectors = [
    ["#FF0000", 0.62795536, 0.25768331, 29.233885],
    ["#00FF00", 0.86643961, 0.29482724, 142.495339],
    ["#0000FF", 0.45201372, 0.31321437, 264.052021],
  ] as const;
  for (const [hex, l, c, h] of vectors) {
    const formatted = formatColor(required(parseHexColor(hex)), "oklch");
    const coordinates = formatted.match(
      /^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)$/,
    );
    expect(Number(coordinates?.[1]) / 100).toBeCloseTo(l, 6);
    expect(Number(coordinates?.[2])).toBeCloseTo(c, 6);
    expect(Number(coordinates?.[3])).toBeCloseTo(h, 4);
    expect(colorToHex(required(parseColor(formatted, "oklch")))).toBe(hex);
  }
  expect(colorToHex(required(parseColor("oklch(0% 0 0)", "oklch")))).toBe(
    "#000000",
  );
  expect(colorToHex(required(parseColor("oklch(1 0 280)", "oklch")))).toBe(
    "#FFFFFF",
  );
  expect(colorToHex(required(parseColor("oklch(50% 0 100)", "oklch")))).toBe(
    "#636363",
  );
  for (const hex of ["#000000", "#FFFFFF", "#808080"]) {
    const formatted = formatColor(required(parseHexColor(hex)), "oklch");
    expect(formatted).toMatch(/% 0 0\)$/);
    expect(colorToHex(required(parseColor(formatted, "oklch")))).toBe(hex);
  }
  for (let alpha = 0; alpha <= 255; alpha++) {
    const hex = `#007AFF${alpha.toString(16).padStart(2, "0").toUpperCase()}`;
    expect(
      colorToHex(
        required(
          parseColor(
            formatColor(required(parseHexColor(hex)), "oklch", true),
            "oklch",
          ),
        ),
        true,
      ),
    ).toBe(hex);
  }
});

test("OKLCH units, invalid syntax and gamut mapping are finite and predictable", () => {
  const base = required(parseColor("oklch(0.65 0.1 180 / 0.5)", "oklch"));
  for (const hue of [
    "180deg",
    `${Math.PI}rad`,
    "200grad",
    "0.5turn",
    "-180",
    "540DEG",
  ]) {
    expect(
      colorToHex(
        required(parseColor(`oklch(65% 25% ${hue} / 50%)`, "oklch")),
        true,
      ),
    ).toBe(colorToHex(base, true));
  }
  expect(
    colorToHex(required(parseColor("oklch(6.5e-1 1e-1 1.8e2)", "oklch"))),
  ).toBe(colorToHex(base));
  for (const input of [
    "oklch(101% 0 0)",
    "oklch(-0.1 0 0)",
    "oklch(50% -1 0)",
    "oklch(50% .1 0 / 101%)",
    "oklch(50% .1 0 / -1)",
    "oklch(50%, .1, 0)",
    "oklch(50% .1 NaN)",
    "oklch(50% 1e999 0)",
    "oklch(none .1 0)",
    "oklch(calc(.5) .1 0)",
    "oklch(50% .1 0xyz)",
  ])
    expect(parseColor(input, "oklch")).toBeNull();
  for (const input of [
    "oklch(65% .4 180)",
    "oklch(65% 1e308 180)",
    "oklch(0 1000 45)",
    "oklch(1 1000 45)",
  ]) {
    const color = required(parseColor(input, "oklch"));
    expect(Object.values(color).every(Number.isFinite)).toBe(true);
    expect(colorToHex(color)).toMatch(/^#[\dA-F]{6}$/);
  }
  const mapped = formatColor(
    required(parseColor("oklch(65% .4 180)", "oklch")),
    "oklch",
  );
  const values = mapped.match(/^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)$/);
  expect(Number(values?.[1]) / 100).toBeCloseTo(0.65, 2);
  expect(Number(values?.[2])).toBeLessThan(0.4);
  expect(Number(values?.[3])).toBeCloseTo(180, 0);
});

test("OKLCH conversion round trips the sRGB grid within one byte", () => {
  for (let r = 0; r <= 255; r += 51)
    for (let g = 0; g <= 255; g += 51)
      for (let b = 0; b <= 255; b += 51) {
        const hex = [r, g, b]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("");
        const actual = colorToRGB(
          required(
            parseColor(
              formatColor(required(parseHexColor(hex)), "oklch"),
              "oklch",
            ),
          ),
        );
        expect(
          Math.max(
            ...actual.map((channel, index) =>
              Math.abs(channel - ([r, g, b][index] ?? 0)),
            ),
          ),
        ).toBeLessThanOrEqual(1);
      }
});
