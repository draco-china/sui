"use client";
import { LocaleToggle } from "@workspace/ui/components/locale-toggle";
import { useState } from "react";
import type { ExampleProps } from "../types";

const options = [
  { value: "en-US", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "ja-JP", label: "日本語" },
];
export default function Example({ locale }: ExampleProps) {
  const [value, setValue] = useState<string>(locale ?? "en-US");
  const chinese = locale === "zh-CN";
  return (
    <div className="flex flex-wrap items-center gap-4">
      <LocaleToggle
        value={value}
        onValueChange={setValue}
        options={options}
        mode="select"
        label={chinese ? "选择示例语言" : "Choose example language"}
      />
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {value}
      </output>
      <LocaleToggle
        value={value}
        onValueChange={setValue}
        options={options}
        mode="select"
        disabled
        label={chinese ? "禁用的语言选择器" : "Disabled language selector"}
      />
    </div>
  );
}
