import { Button } from "@workspace/ui/components/button";
import { InlineCopyText } from "@workspace/ui/components/inline-copy-text";
import { themePresets } from "@workspace/ui/lib/theme/theme";
import { cn } from "cn";
import { useState } from "react";
import { ThemePreview } from "../support/theming-preview";
import {
  previewStyle,
  previewTokens,
  tokenValue,
} from "../support/theming-tokens";
import type { ExampleProps } from "../types";

const palettes = [
  { id: "default" as const, en: "Default", zh: "默认" },
  ...themePresets,
];

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [dark, setDark] = useState(false);
  const mode = zh
    ? { dark: "深色预览", light: "浅色预览" }
    : { dark: "Dark preview", light: "Light preview" };
  return (
    <div className="w-full space-y-6 text-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground">
          {zh
            ? "每套配色包含五个协调色"
            : "Each palette contains five coordinated colors"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={dark}
          onClick={() => setDark(!dark)}
        >
          {dark ? mode.dark : mode.light}
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {palettes.map((preset) => {
          const tokens = previewTokens(preset.id, dark);
          const colors =
            "palette" in preset
              ? preset.palette
              : [1, 2, 3, 4, 5].map((index) =>
                  tokenValue(tokens, `--chart-${index}`),
                );
          return (
            <section
              key={preset.id}
              data-color={preset.id}
              aria-label={zh ? preset.zh : preset.en}
              className={cn(
                "grid content-start gap-5 rounded-2xl border border-border bg-background p-4 text-foreground",
                dark && "dark",
              )}
              style={previewStyle(preset.id, dark)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-base">
                  {zh ? preset.zh : preset.en}
                </h3>
                {"color" in preset && (
                  <InlineCopyText
                    className="text-muted-foreground text-xs"
                    aria-label={
                      zh
                        ? `复制主色 ${preset.color}`
                        : `Copy primary color ${preset.color}`
                    }
                  >
                    {preset.color}
                  </InlineCopyText>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color, index) => (
                  <div key={color} className="grid min-w-0 gap-2">
                    <span
                      aria-hidden="true"
                      className="h-10 rounded-lg"
                      style={{ background: `var(--chart-${index + 1})` }}
                    />
                    <InlineCopyText
                      value={color}
                      truncate={false}
                      className="justify-center gap-1 text-[10px]"
                      aria-label={
                        zh ? `复制配色 ${color}` : `Copy color ${color}`
                      }
                    >
                      {"palette" in preset ? color : `chart-${index + 1}`}
                    </InlineCopyText>
                  </div>
                ))}
              </div>
              <ThemePreview locale={locale} />
            </section>
          );
        })}
      </div>
      <p className="text-muted-foreground">
        {zh
          ? "明暗切换仅作用于这些预览，不改变整站主题或浏览器存储"
          : "Appearance switches affect these previews without changing the site theme or browser storage."}
      </p>
    </div>
  );
}
