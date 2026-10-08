import { cn } from "cn";
import { ThemePreview } from "../support/theming-preview";
import { previewStyle } from "../support/theming-tokens";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        dark: "深色",
        light: "浅色",
      }
    : {
        dark: "Dark",
        light: "Light",
      };
  return (
    <div className="grid w-full gap-4 text-sm sm:grid-cols-2">
      {[false, true].map((dark) => (
        <section
          key={String(dark)}
          data-color="default"
          className={cn(
            "space-y-3 rounded-2xl border border-border bg-background p-4 text-foreground",
            dark && "dark",
          )}
          style={previewStyle("default", dark)}
        >
          <h3 className="font-semibold">
            {dark ? stateLabels.dark : stateLabels.light}
          </h3>
          <ThemePreview locale={locale} />
        </section>
      ))}
    </div>
  );
}
