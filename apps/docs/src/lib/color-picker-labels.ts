import type { ColorPickerLabels } from "@workspace/ui/components/color-picker";
import type { Locale } from "./i18n";

export function colorPickerLabels(
  locale?: Locale,
): Partial<ColorPickerLabels> | undefined {
  if (locale !== "zh-CN") return undefined;
  return {
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
}
