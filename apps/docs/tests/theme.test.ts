import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { createThemeTokens as computeThemeTokens } from "@workspace/ui/lib/theme/palette";
import { getThemeId, themeTokenNames } from "@workspace/ui/lib/theme/theme";
import {
  applyAccent,
  contrastRatio,
  createThemeTokens,
  normalizeHex,
  themeBootstrapScript,
  themePresets,
} from "../src/lib/theme";

function colorToHex(color: string) {
  const hex = normalizeHex(color);
  if (hex) return hex;
  const match = /^oklch\(([.\d]+) ([.\d]+) ([.\d]+)\)$/.exec(color);
  if (!match) throw new Error(`Unsupported test color: ${color}`);
  const lightness = Number(match[1]);
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${channels
    .map((linear) => {
      const clamped = Math.max(0, Math.min(1, linear));
      const encoded =
        clamped <= 0.0031308
          ? 12.92 * clamped
          : 1.055 * clamped ** (1 / 2.4) - 0.055;
      return Math.round(encoded * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")
    .toUpperCase()}`;
}

describe("theme colors", () => {
  test("presets retain the agreed bilingual names and exact seed colors", () => {
    expect(themePresets).toEqual([
      {
        id: "lime",
        en: "Lime",
        zh: "青柠",
        color: "#D5F267",
        palette: ["#34451A", "#7A9627", "#D5F267", "#EAF6BC", "#A2B8AA"],
      },
      {
        id: "bamboo",
        en: "Bamboo",
        zh: "竹青",
        color: "#727F65",
        palette: ["#353D26", "#727F65", "#BDCBB1", "#CCBC81", "#B5B3A6"],
      },
      {
        id: "mauve",
        en: "Mauve",
        zh: "烟紫",
        color: "#77608E",
        palette: ["#423458", "#77608E", "#A18EAE", "#D8C6B2", "#CFD0B1"],
      },
      {
        id: "mist",
        en: "Mist",
        zh: "雾蓝",
        color: "#4A5A69",
        palette: ["#233342", "#4A5A69", "#A7AEBE", "#B8A49D", "#B5B3A6"],
      },
      {
        id: "sand",
        en: "Sand",
        zh: "沙金",
        color: "#B8967A",
        palette: ["#543C30", "#978473", "#B8967A", "#DDBDA4", "#A7C9B9"],
      },
      {
        id: "pine",
        en: "Pine",
        zh: "松绿",
        color: "#527A71",
        palette: ["#496D63", "#527A71", "#99BFB2", "#7D81A4", "#CFC8DA"],
      },
      {
        id: "rose",
        en: "Rose",
        zh: "绯红",
        color: "#D35C7C",
        palette: ["#C73A64", "#D35C7C", "#ED80A7", "#EAD4E0", "#A8B7DE"],
      },
    ]);
    for (const preset of themePresets) {
      for (const dark of [false, true]) {
        const tokens = createThemeTokens(preset.color, dark);
        expect(colorToHex(tokens["--primary"] ?? "")).toBe(preset.color);
        expect(
          [1, 2, 3, 4, 5].map((index) =>
            colorToHex(tokens[`--chart-${index}`] ?? ""),
          ),
        ).toEqual([...preset.palette]);
      }
    }
  });

  test("first paint chooses shared CSS presets and only computes custom inline colors", () => {
    const bootstrap = new Function(
      "document",
      "localStorage",
      "matchMedia",
      themeBootstrapScript,
    );
    for (const mode of ["light", "dark", "system"]) {
      for (const blocked of [false, true]) {
        for (const seed of [
          null,
          ...themePresets.map((preset) => preset.color),
          "#123456",
        ]) {
          const properties: Record<string, string> = { "--primary": "stale" };
          let dark = false;
          const root = {
            dataset: {} as Record<string, string>,
            style: {
              setProperty: (name: string, value: string) => {
                properties[name] = value;
              },
              removeProperty: (name: string) => {
                delete properties[name];
              },
            },
            classList: {
              toggle: (_name: string, value: boolean) => {
                dark = value;
              },
            },
          };
          const storage = {
            getItem: (key: string) => {
              if (blocked) throw new Error("Storage is blocked");
              return key === "theme" ? mode : seed;
            },
          };
          bootstrap({ documentElement: root }, storage, () => ({
            matches: true,
          }));
          const activeSeed = blocked ? null : seed;
          expect(dark).toBe(blocked || mode !== "light");
          expect(root.dataset.color).toBe(getThemeId(activeSeed));
          expect(properties).toEqual(
            getThemeId(activeSeed) === "custom"
              ? createThemeTokens(activeSeed, dark)
              : {},
          );
        }
      }
    }
  });

  test("custom inline tokens clear when returning to a static preset or default", () => {
    const properties: Record<string, string> = {};
    const root = {
      dataset: {} as Record<string, string>,
      style: {
        setProperty: (name: string, value: string) => {
          properties[name] = value;
        },
        removeProperty: (name: string) => {
          delete properties[name];
        },
      },
    };
    const original = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", {
      value: { documentElement: root },
      configurable: true,
    });
    try {
      applyAccent("#FFFFFF", false);
      expect(root.dataset.color).toBe("custom");
      expect(properties).toEqual(createThemeTokens("#FFFFFF", false));
      applyAccent(themePresets[0].color, false);
      expect(root.dataset.color).toBe("lime");
      expect(properties).toEqual({});
      applyAccent("#000000", true);
      expect(properties).toEqual(createThemeTokens("#000000", true));
      applyAccent(null, true);
      expect(root.dataset.color).toBe("default");
      expect(properties).toEqual({});
    } finally {
      if (original) Object.defineProperty(globalThis, "document", original);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });

  test("all shared CSS themes match the palette algorithm in both modes", async () => {
    const themes = themePresets;
    const globals = await readFile(
      new URL("../../../packages/ui/src/styles/globals.css", import.meta.url),
      "utf8",
    );
    const parseTokens = (body: string) =>
      Object.fromEntries(
        [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((entry) => [
          entry[1],
          entry[2]?.trim(),
        ]),
      );
    const light = parseTokens(globals.match(/^:root \{([^}]+)\}/m)?.[1] ?? "");
    const dark = {
      ...light,
      ...parseTokens(globals.match(/^\.dark \{([^}]+)\}/m)?.[1] ?? ""),
    };
    const defaults = [light, dark];
    const sheets = await Promise.all(
      themes.map(({ id }) =>
        readFile(
          new URL(
            `../../../packages/ui/src/styles/themes/${id}.css`,
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
    const blocks = sheets.map((css) =>
      [...css.matchAll(/\{([^}]+)\}/g)].map((match) =>
        Object.fromEntries(
          [...(match[1] ?? "").matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
            (entry) => [entry[1], entry[2]?.trim()],
          ),
        ),
      ),
    );
    for (const [index, theme] of themes.entries()) {
      expect(blocks[index]?.length).toBe(2);
      expect(sheets[index]).toContain(`[data-color="${theme.id}"]`);
      for (const dark of [false, true]) {
        const css = blocks[index]?.[Number(dark)] ?? {};
        for (const [name, value] of Object.entries(
          createThemeTokens(theme.color, dark),
        ))
          expect(css[name]).toBe(value.toLowerCase());
        for (const name of [
          "--background",
          "--foreground",
          "--card",
          "--card-foreground",
          "--popover",
          "--popover-foreground",
          "--secondary",
          "--secondary-foreground",
          "--muted",
          "--muted-foreground",
          "--border",
          "--input",
          "--destructive",
          "--sidebar",
          "--sidebar-foreground",
          "--sidebar-border",
        ])
          expect(css[name]).toBe(defaults[Number(dark)]?.[name]);
      }
    }
    const files = await readdir(
      new URL("../../../packages/ui/src/styles/themes/", import.meta.url),
    );
    expect(files.filter((file) => file.endsWith(".css")).sort()).toEqual(
      themes.map((theme) => `${theme.id}.css`).sort(),
    );
    expect(globals).not.toContain("./themes/default.css");
    expect(globals).not.toContain("./themes/neutral.css");
    expect(getThemeId(null)).toBe("default");
    expect(colorToHex(light["--primary"] ?? "")).toBe("#0066CC");
    expect(colorToHex(dark["--primary"] ?? "")).toBe("#0A84FF");
    expect(colorToHex(light["--background"] ?? "")).toBe("#F5F5F7");
    expect(colorToHex(dark["--background"] ?? "")).toBe("#161617");
    expect(colorToHex(light["--chart-1"] ?? "")).toBe("#0066CC");
    expect(colorToHex(dark["--chart-1"] ?? "")).toBe("#0A84FF");
    for (const tokens of defaults) {
      const resolve = (name: string): string => {
        const value = tokens[name] ?? "";
        const alias = value.match(/^var\((--[\w-]+)\)$/)?.[1];
        return alias ? resolve(alias) : (normalizeHex(value) ?? value);
      };
      for (const [foreground, background] of [
        ["--foreground", "--background"],
        ["--card-foreground", "--card"],
        ["--popover-foreground", "--popover"],
        ["--primary-foreground", "--primary"],
        ["--secondary-foreground", "--secondary"],
        ["--muted-foreground", "--muted"],
        ["--accent-foreground", "--accent"],
        ["--sidebar-foreground", "--sidebar"],
        ["--sidebar-accent-foreground", "--sidebar-accent"],
      ] as const) {
        expect(
          contrastRatio(resolve(foreground), resolve(background)),
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const background of [
        "--background",
        "--card",
        "--secondary",
        "--muted",
        "--accent",
      ]) {
        expect(
          contrastRatio(resolve("--accent-foreground"), resolve(background)),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(resolve("--ring"), resolve(background)),
        ).toBeGreaterThanOrEqual(3);
      }
    }
    for (const theme of themes)
      expect(globals).toContain(`@import "./themes/${theme.id}.css";`);
  });

  test("shared output uses equivalent OKLCH without documentation-specific tokens", async () => {
    const serialized = new Function(
      `return (${computeThemeTokens.toString()})`,
    )() as typeof computeThemeTokens;
    for (const dark of [false, true]) {
      for (const seed of [
        "#000000",
        "#FFFFFF",
        "#123456",
        ...themePresets.map((preset) => preset.color),
      ]) {
        const palette = themePresets.find(
          (preset) => preset.color === seed,
        )?.palette;
        const tokens = createThemeTokens(seed, dark);
        expect(serialized(seed, dark, palette)).toEqual(tokens);
        expect(colorToHex(tokens["--primary"] ?? "")).toBe(seed);
        for (const [name, value] of Object.entries(tokens)) {
          expect(value).toMatch(/^oklch\(/);
          expect(name).not.toMatch(/^--(?:docs-|color-fd-)/);
          expect(contrastRatio(value, "#FFFFFF")).toBeCloseTo(
            contrastRatio(colorToHex(value), "#FFFFFF"),
            5,
          );
        }
      }
    }
    expect(
      themeTokenNames.some((name) => /^--(?:docs-|color-fd-)/.test(name)),
    ).toBe(false);
    const globals = await readFile(
      new URL("../../../packages/ui/src/styles/globals.css", import.meta.url),
      "utf8",
    );
    expect(globals).not.toMatch(/--(?:docs-|color-fd-)/);
    expect(globals).not.toMatch(/#[\da-f]{3,8}\b/i);
    for (const { id } of themePresets) {
      const css = await readFile(
        new URL(
          `../../../packages/ui/src/styles/themes/${id}.css`,
          import.meta.url,
        ),
        "utf8",
      );
      expect(css).not.toMatch(/--(?:docs-|color-fd-)/);
      expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
    }
    const appStyles = await readFile(
      new URL("../src/styles/app.css", import.meta.url),
      "utf8",
    );
    expect(appStyles).not.toMatch(/--docs-(?:link|focus)/);
    expect(appStyles).toMatch(
      /--color-fd-primary:\s*var\(--accent-foreground\)/,
    );
    expect(appStyles).toMatch(/--color-fd-ring:\s*var\(--ring\)/);
  });

  test("normalizes shorthand and optional hash without accepting invalid values", () => {
    expect(normalizeHex(" abc ")).toBe("#AABBCC");
    expect(normalizeHex("#Bc6c73")).toBe("#BC6C73");
    for (const invalid of [
      "",
      "#ab",
      "#abcd",
      "#12345678",
      "red",
      "#ggg",
      "abc; color:red",
    ])
      expect(normalizeHex(invalid)).toBeNull();
  });

  test("presets and extreme custom colors remain legible in both modes", () => {
    const seeds = [
      null,
      "#000000",
      "#FFFFFF",
      "#777777",
      "#FFFF00",
      ...themePresets.map((preset) => preset.color),
    ];
    for (const dark of [false, true]) {
      const background = dark ? "#0A0A0A" : "#FFFFFF";
      const surface = dark ? "#171717" : "#F5F5F5";
      for (const seed of seeds) {
        const tokens = createThemeTokens(seed, dark);
        expect(
          contrastRatio(
            tokens["--primary"] ?? "",
            tokens["--primary-foreground"] ?? "",
          ),
        ).toBeGreaterThanOrEqual(4.5);
        for (const bg of [
          background,
          surface,
          ...(dark
            ? ["#2E2E2E", "#161617", "#1D1D1F", "#2C2C2E"]
            : ["#EEEEEE", "#F5F5F7", "#E8E8ED"]),
        ]) {
          expect(
            contrastRatio(tokens["--accent-foreground"] ?? "", bg),
          ).toBeGreaterThanOrEqual(4.5);
          expect(
            contrastRatio(tokens["--ring"] ?? "", bg),
          ).toBeGreaterThanOrEqual(3);
        }
        expect(tokens).not.toHaveProperty("--destructive");
        expect(
          contrastRatio(
            tokens["--accent"] ?? "",
            tokens["--accent-foreground"] ?? "",
          ),
        ).toBeGreaterThanOrEqual(4.5);
        expect(tokens).not.toHaveProperty("--background");
      }
    }
  });
});
