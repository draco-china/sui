"use client";
import { ColorPicker } from "@workspace/ui/components/color-picker";
import { useState } from "react";
import type { ExampleProps } from "../types";

export const chineseLabels = {
  trigger: "选择颜色",
  saturation: "饱和度和亮度",
  hue: "色相",
  alpha: "不透明度",
  hex: "HEX 颜色",
  format: "颜色格式",
  color: "颜色值",
  invalid: "请输入有效的颜色值",
  eyeDropper: "拾取屏幕颜色",
  eyeDropperFailed: "无法拾取屏幕颜色",
  swatches: "预设颜色",
};
export default function Example({ locale }: ExampleProps) {
  const [value, setValue] = useState("#007AFF");
  return (
    <div className="grid justify-items-start gap-4">
      <ColorPicker
        value={value}
        onValueChange={setValue}
        labels={locale === "zh-CN" ? chineseLabels : undefined}
      />
      <output className="text-muted-foreground text-sm">{value}</output>
      <ColorPicker
        disabled
        defaultValue="#70866A"
        labels={locale === "zh-CN" ? chineseLabels : undefined}
      />
    </div>
  );
}
