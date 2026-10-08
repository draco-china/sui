import { createThemeTokens as computeThemeTokens } from "./palette";

export type ThemeMode = "light" | "dark" | "system";

export const themePresets = [
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
] as const;

export function createThemeTokens(
  seed: string | null,
  dark: boolean,
): Record<string, string> {
  return computeThemeTokens(
    seed,
    dark,
    themePresets.find((preset) => preset.color === seed)?.palette,
  );
}

export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  return `#${(hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex).toUpperCase()}`;
}

export function contrastRatio(first: string, second: string): number {
  const luminance = (color: string) => {
    const oklch = color.match(
      /^oklch\(\s*([.\d+-]+)\s+([.\d+-]+)\s+([.\d+-]+)\s*\)$/,
    );
    let channels: number[];
    if (oklch) {
      const lightness = Number(oklch[1]);
      const chroma = Number(oklch[2]);
      const hue = (Number(oklch[3]) * Math.PI) / 180;
      const a = chroma * Math.cos(hue);
      const b = chroma * Math.sin(hue);
      const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
      channels = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
      ].map((channel) => Math.max(0, Math.min(1, channel)));
    } else {
      const hex = normalizeHex(color) ?? color;
      channels = [1, 3, 5].map((offset) => {
        const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
    }
    return (
      (channels[0] ?? 0) * 0.2126 +
      (channels[1] ?? 0) * 0.7152 +
      (channels[2] ?? 0) * 0.0722
    );
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export type ThemePresetId = (typeof themePresets)[number]["id"];
export type ThemeId = "default" | ThemePresetId | "custom";
export function getThemeId(seed: string | null): ThemeId {
  return seed === null
    ? "default"
    : (themePresets.find((preset) => preset.color === seed)?.id ?? "custom");
}
export const themeTokenNames = Object.keys(createThemeTokens(null, false));
