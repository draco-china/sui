import { Button } from "@workspace/ui/components/button";
import { ColorPicker } from "@workspace/ui/components/color-picker";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { normalizeHex } from "@workspace/ui/lib/theme/theme";
import { cn } from "cn";
import { useId, useState } from "react";
import { colorPickerLabels } from "../../lib/color-picker-labels";
import { ThemePreview } from "../support/theming-preview";
import { previewStyle } from "../support/theming-tokens";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const id = useId();
  const [dark, setDark] = useState(false);
  const [input, setInput] = useState("#0066CC");
  const [custom, setCustom] = useState<string | null>("#0066CC");
  const [invalid, setInvalid] = useState(false);
  const mode = zh
    ? { dark: "深色预览", light: "浅色预览" }
    : { dark: "Dark preview", light: "Light preview" };
  return (
    <div className="w-full space-y-4 text-sm">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = normalizeHex(input);
          setInvalid(next === null);
          if (next) {
            setCustom(next);
            setInput(next);
          }
        }}
      >
        <div className="grid min-w-36 flex-1 gap-2">
          <Label htmlFor={id}>{zh ? "自定义 HEX" : "Custom HEX"}</Label>
          <Input
            id={id}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
          />
        </div>
        <Button type="submit" variant="secondary">
          {zh ? "应用" : "Apply"}
        </Button>
        <ColorPicker
          value={custom ?? "#0066CC"}
          onValueChange={(next) => {
            setCustom(next);
            setInput(next);
            setInvalid(false);
          }}
          labels={colorPickerLabels(locale)}
        />
        <Button
          type="button"
          variant="outline"
          aria-pressed={dark}
          onClick={() => setDark(!dark)}
        >
          {dark ? mode.dark : mode.light}
        </Button>
      </form>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="text-destructive">
          {zh
            ? "输入三位或六位 HEX；当前有效配色保持不变"
            : "Enter a three- or six-digit HEX. The current valid palette is unchanged."}
        </p>
      )}
      <section
        data-color="custom"
        className={cn(
          "rounded-2xl border border-border bg-background p-4 text-foreground",
          dark && "dark",
        )}
        style={previewStyle("default", dark, custom)}
      >
        <ThemePreview locale={locale} />
      </section>
    </div>
  );
}
