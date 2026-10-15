"use client";
import { Button } from "@workspace/ui/components/button";
import {
  type GlassMaterial,
  GlassSurface,
} from "@workspace/ui/components/glass";
import type { ExampleProps } from "../types";

const materials: GlassMaterial[] = ["clear", "regular"];

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const copy = {
    clear: {
      title: zh ? "清透" : "Clear",
      body: zh
        ? "着色 12%，模糊 4px：背景仍可辨认，适合媒体之上。"
        : "12% tint, 4px blur: the backdrop stays recognizable, for media.",
    },
    regular: {
      title: zh ? "常规" : "Regular",
      body: zh
        ? "着色 30%，模糊 14px：磨砂背景，文字在繁杂内容上依然清晰。"
        : "30% tint, 14px blur: frosted, so text stays legible over busy content.",
    },
  };
  return (
    <div className="grid w-full gap-4 overflow-hidden rounded-2xl bg-[url(/playground/backgrounds/coast-poster.jpg)] bg-center bg-cover p-6 sm:grid-cols-2">
      {materials.map((material) => (
        <GlassSurface
          key={material}
          glassConfig={{ material }}
          className="grid content-start gap-4 rounded-3xl p-5 text-foreground"
        >
          <div className="grid gap-1">
            <p className="font-semibold">{copy[material].title}</p>
            <p className="text-muted-foreground text-sm">
              {copy[material].body}
            </p>
          </div>
          <Button size="sm" className="justify-self-start">
            {zh ? "打开" : "Open"}
          </Button>
        </GlassSurface>
      ))}
    </div>
  );
}
