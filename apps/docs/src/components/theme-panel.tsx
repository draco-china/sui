import { Button } from "@workspace/ui/components/button";
import { ColorPicker } from "@workspace/ui/components/color-picker";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { colorPickerLabels } from "../lib/color-picker-labels";
import type { Locale } from "../lib/i18n";
import {
  applyAccent,
  contrastRatio,
  readAccent,
  saveAccent,
  THEME_STORAGE_KEY,
  themePresets,
} from "../lib/theme";

export function ThemePanel({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  const { resolvedTheme } = useTheme();
  const [accent, setAccent] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const defaultAccent = resolvedTheme === "dark" ? "#0A84FF" : "#0066CC";
  const defaultPalette =
    resolvedTheme === "dark"
      ? ["#002952", "#005BB5", "#0A84FF", "#71B6FF", "#C5E2FF"]
      : ["#003366", "#004C99", "#0066CC", "#66A3E0", "#CCE0F5"];

  useEffect(() => {
    const stored = readAccent();
    setAccent(stored);
    setReady(true);
    const synchronize = (event: Event) => {
      const color = (event as CustomEvent<string | null>).detail;
      setAccent(color);
    };
    const storedChange = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const color = readAccent();
      setAccent(color);
    };
    window.addEventListener("storage", storedChange);
    window.addEventListener("sui-accent-change", synchronize);
    return () => {
      window.removeEventListener("storage", storedChange);
      window.removeEventListener("sui-accent-change", synchronize);
    };
  }, []);

  useEffect(() => {
    if (ready && resolvedTheme) applyAccent(accent, resolvedTheme === "dark");
  }, [accent, ready, resolvedTheme]);

  const chooseAccent = (color: string | null) => {
    setAccent(color);
    saveAccent(color);
    window.dispatchEvent(
      new CustomEvent("sui-accent-change", { detail: color }),
    );
    applyAccent(color, resolvedTheme === "dark");
  };
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={zh ? "强调色" : "Accent color"}
          />
        }
      >
        <Palette />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="theme-panel w-80 rounded-2xl p-5"
      >
        <PopoverHeader>
          <PopoverTitle>{zh ? "强调色" : "Accent color"}</PopoverTitle>
          <PopoverDescription>
            {zh
              ? "选择预设配色或自定义颜色"
              : "Choose a preset palette or a custom color."}
          </PopoverDescription>
        </PopoverHeader>
        <div>
          <p className="theme-label">{zh ? "预设配色" : "Preset palettes"}</p>
          <div className="theme-presets">
            <button
              type="button"
              className="theme-preset"
              aria-pressed={accent === null}
              onClick={() => chooseAccent(null)}
            >
              <span
                className="theme-swatch"
                style={{ backgroundColor: defaultAccent }}
              >
                {accent === null ? <Check size={12} /> : null}
              </span>
              <span className="theme-preset-label">
                <span>{zh ? "湛蓝 Azure" : "Azure"}</span>
                <span className="theme-preset-hex">{defaultAccent}</span>
                <span className="theme-palette-strip" aria-hidden="true">
                  {defaultPalette.map((color) => (
                    <span key={color} style={{ backgroundColor: color }} />
                  ))}
                </span>
              </span>
            </button>
            {themePresets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className="theme-preset"
                aria-pressed={accent === preset.color}
                onClick={() => chooseAccent(preset.color)}
              >
                <span
                  className="theme-swatch"
                  style={{
                    backgroundColor: preset.color,
                    color:
                      contrastRatio(preset.color, "#000000") >=
                      contrastRatio(preset.color, "#FFFFFF")
                        ? "#000000"
                        : "#FFFFFF",
                  }}
                >
                  {accent === preset.color ? <Check size={12} /> : null}
                </span>
                <span className="theme-preset-label">
                  <span>
                    {preset.zh} {preset.en}
                  </span>
                  <span className="theme-preset-hex">{preset.color}</span>
                  <span className="theme-palette-strip" aria-hidden="true">
                    {preset.palette.map((color) => (
                      <span key={color} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="theme-label">{zh ? "自定义颜色" : "Custom color"}</p>
          <p className="mb-3 text-muted-foreground text-xs">
            {zh
              ? "选择颜色，即时应用"
              : "Choose a color to apply it instantly."}
          </p>
          <ColorPicker
            value={accent ?? defaultAccent}
            onValueChange={chooseAccent}
            labels={colorPickerLabels(locale)}
            swatches={themePresets.flatMap((preset) => preset.palette)}
            className="w-full justify-start"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
