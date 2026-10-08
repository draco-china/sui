"use client";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { applyAccent, normalizeHex, themePresets } from "../../lib/theme";
import type { ExampleProps } from "../types";

const variants = ["rectangle", "circle", "circle-blur", "blinds"] as const;
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
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
      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-background p-5 text-foreground sm:grid-cols-4">
        {variants.map((variant) => (
          <div key={variant} className="grid justify-items-center gap-2">
            <ThemeToggle
              theme={theme}
              onThemeChange={changeTheme}
              disabled={!mounted}
              variant={variant}
              start="button"
              lightLabel={chinese ? "切换为浅色模式" : "Switch to light mode"}
              darkLabel={chinese ? "切换为深色模式" : "Switch to dark mode"}
            />
            <span className="text-muted-foreground text-xs">{variant}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
