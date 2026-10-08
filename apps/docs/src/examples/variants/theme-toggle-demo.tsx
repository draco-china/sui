"use client";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { applyAccent, normalizeHex, themePresets } from "../../lib/theme";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const themeLabels = chinese
    ? { light: "浅色", dark: "深色" }
    : { light: "Light", dark: "Dark" };
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const changeTheme = (next: "light" | "dark") => {
    const root = document.documentElement;
    const accent =
      root.dataset.color === "custom"
        ? normalizeHex(root.dataset.colorSeed ?? "")
        : (themePresets.find((preset) => preset.id === root.dataset.color)
            ?.color ?? null);
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    applyAccent(accent, next === "dark");
    setTheme(next);
  };
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-6 text-foreground">
        <div className="grid gap-1">
          <p>{chinese ? "文档站主题" : "Documentation appearance"}</p>
          <output className="text-muted-foreground text-sm" aria-live="polite">
            {themeLabels[theme]}
          </output>
        </div>
        <ThemeToggle
          theme={theme}
          onThemeChange={changeTheme}
          disabled={!mounted}
          lightLabel={chinese ? "切换为浅色模式" : "Switch to light mode"}
          darkLabel={chinese ? "切换为深色模式" : "Switch to dark mode"}
        />
      </div>
      <p className="mt-3 text-muted-foreground text-sm">
        {chinese
          ? "此示例切换文档站主题并保存偏好，可在顶栏选择跟随系统或调整配色"
          : "This example switches the documentation theme and saves the preference. The header provides System mode and accent settings."}
      </p>
    </div>
  );
}
