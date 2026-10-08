"use client";
import { ColorPicker } from "@workspace/ui/components/color-picker";
import { useState } from "react";
import type { ExampleProps } from "../types";
import { chineseLabels } from "./color-picker-demo";

export default function Example({ locale }: ExampleProps) {
  const [value, setValue] = useState("#007AFF80");
  return (
    <div className="grid w-full max-w-72 gap-4">
      <ColorPicker
        inline
        alpha
        value={value}
        onValueChange={setValue}
        labels={locale === "zh-CN" ? chineseLabels : undefined}
      />
      <output className="text-muted-foreground text-sm">{value}</output>
    </div>
  );
}
