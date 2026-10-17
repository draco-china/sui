"use client";
import { Button } from "@workspace/ui/components/button";
import { type GlassEdge, GlassSurface } from "@workspace/ui/components/glass";
import type { ExampleProps } from "../types";

const edges: GlassEdge[] = ["diagonal", "vertical"];

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const labels = {
    diagonal: zh ? "对角：左上与右下角照亮" : "Diagonal: lit from the corners",
    vertical: zh ? "上下：上下边缘反光" : "Vertical: lit from top and bottom",
  };
  return (
    // Edge light belongs to Clear. A calm, dark backdrop with soft color
    // makes it easy to compare.
    <div className="grid w-full gap-6 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_20%_30%,#3b82f680,transparent_45%),radial-gradient(circle_at_80%_70%,#f9731670,transparent_45%),linear-gradient(135deg,#27272a,#18181b)] p-6 sm:grid-cols-2">
      {edges.map((edge) => (
        <div key={edge} className="grid justify-items-center gap-4">
          <p className="font-medium text-sm text-white drop-shadow">
            {labels[edge]}
          </p>
          <div className="flex items-center gap-4">
            <GlassSurface glass={{ edge }} className="size-16 rounded-2xl" />
            <Button glass={{ edge }} variant="outline">
              {zh ? "按钮" : "Button"}
            </Button>
          </div>
          <GlassSurface
            glass={{ edge }}
            className="h-20 w-full max-w-60 rounded-3xl"
          />
        </div>
      ))}
    </div>
  );
}
