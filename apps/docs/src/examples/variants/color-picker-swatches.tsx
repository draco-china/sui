"use client";
import { ColorPicker } from "@workspace/ui/components/color-picker";
import type { ExampleProps } from "../types";
import { chineseLabels } from "./color-picker-demo";

const swatches = [
  "#007AFF",
  "#70866A",
  "#8D739C",
  "#648493",
  "#AE916B",
  "#3E806E",
  "#BC6C73",
];
export default function Example({ locale }: ExampleProps) {
  return (
    <div className="flex gap-4">
      <ColorPicker
        defaultValue="#70866A"
        swatches={swatches}
        labels={locale === "zh-CN" ? chineseLabels : undefined}
      />
      <ColorPicker
        glass
        defaultValue="#8D739C"
        swatches={swatches}
        labels={
          locale === "zh-CN"
            ? { ...chineseLabels, trigger: "玻璃颜色选择器" }
            : { trigger: "Glass color picker" }
        }
      />
    </div>
  );
}
