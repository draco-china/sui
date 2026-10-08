import globalsSource from "@workspace/ui/globals.css?raw";
import {
  createThemeTokens,
  type ThemePresetId,
  themePresets,
} from "@workspace/ui/lib/theme/theme";
import type { CSSProperties } from "react";

export type PreviewTheme = "default" | ThemePresetId;

function readTokens(selector: RegExp): Record<string, string> {
  return Object.fromEntries(
    [
      ...(globalsSource.match(selector)?.[1] ?? "").matchAll(
        /(--[\w-]+):\s*([^;]+);/g,
      ),
    ].map((entry) => [entry[1], entry[2]?.trim() ?? ""]),
  );
}

const lightTokens = readTokens(/^:root \{([^}]+)\}/m);
const darkTokens = { ...lightTokens, ...readTokens(/^\.dark \{([^}]+)\}/m) };

export function previewTokens(theme: PreviewTheme, dark: boolean) {
  const base = dark ? darkTokens : lightTokens;
  const preset = themePresets.find((item) => item.id === theme);
  return {
    ...base,
    ...(preset ? createThemeTokens(preset.color, dark) : {}),
  };
}

export function tokenValue(
  tokens: Record<string, string>,
  name: string,
): string {
  const value = tokens[name] ?? "";
  const alias = value.match(/^var\((--[\w-]+)\)$/)?.[1];
  return alias ? tokenValue(tokens, alias) : value;
}

export function previewStyle(
  theme: PreviewTheme,
  dark: boolean,
  custom: string | null = null,
): CSSProperties {
  return {
    ...previewTokens(theme, dark),
    ...(custom ? createThemeTokens(custom, dark) : {}),
    colorScheme: dark ? "dark" : "light",
  } as CSSProperties;
}
