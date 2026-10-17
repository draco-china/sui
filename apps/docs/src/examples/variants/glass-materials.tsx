"use client";
import { Button } from "@workspace/ui/components/button";
import { GlassSurface } from "@workspace/ui/components/glass";
import type { ExampleProps } from "../types";

const materials = ["clear", "frosted"] as const;

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const copy = {
    clear: {
      title: zh ? "清透" : "Clear",
      body: zh
        ? "着色 12%，模糊 4px：背景仍可辨认，适合媒体之上。"
        : "12% tint, 4px blur: the backdrop stays recognizable, for media.",
    },
    frosted: {
      title: zh ? "磨砂" : "Frosted",
      body: zh
        ? "着色 65%，CSS 模糊 24px，无折射：磨砂背景，文字在繁杂内容上依然清晰。"
        : "65% tint, 24px CSS blur, no refraction: frosted, so text stays legible over busy content.",
    },
  };
  return (
    <div className="grid w-full gap-4 overflow-hidden rounded-2xl bg-[url(/playground/backgrounds/coast-poster.jpg)] bg-center bg-cover p-6 sm:grid-cols-2">
      {materials.map((material) => (
        <GlassSurface
          key={material}
          frosted={material === "frosted"}
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
