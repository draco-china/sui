"use client";
import { GlassProvider, GlassSurface } from "@workspace/ui/components/glass";
import { useRef } from "react";
import type { ExampleProps } from "../types";

const tiles = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-400",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
];
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const scene = useRef<HTMLDivElement>(null);
  return (
    <GlassProvider mode="css" captureTarget={scene}>
      <div
        ref={scene}
        className="relative isolate grid min-h-80 w-full items-center gap-4 overflow-hidden rounded-2xl p-6 lg:grid-cols-3"
      >
        <div
          className="absolute inset-0 -z-10 grid grid-cols-3 gap-2 bg-muted p-2"
          aria-hidden="true"
        >
          {tiles.map((tile) => (
            <div key={tile} className={`${tile} rounded-xl`} />
          ))}
        </div>
        <GlassSurface
          glass={false}
          className="rounded-2xl border bg-background p-6 text-foreground"
        >
          <h3>{chinese ? "普通表面" : "Standard surface"}</h3>
          <p className="mt-2 text-muted-foreground text-sm">
            {chinese
              ? "不采样背景，保持默认外观"
              : "Keeps the default appearance without sampling the background."}
          </p>
        </GlassSurface>
        <GlassSurface
          material="clear"
          className="rounded-2xl bg-background p-6 text-foreground"
        >
          <h3>{chinese ? "清透玻璃" : "Clear glass"}</h3>
          <p className="mt-2 text-muted-foreground text-sm">
            {chinese
              ? "轻度模糊与柔和边缘高光，保持背景可辨"
              : "A light blur and soft edge highlights keep the background recognizable."}
          </p>
        </GlassSurface>
        <GlassSurface
          material="frosted"
          className="rounded-2xl bg-background p-6 text-foreground"
        >
          <h3>{chinese ? "磨砂玻璃" : "Frosted glass"}</h3>
          <p className="mt-2 text-muted-foreground text-sm">
            {chinese
              ? "更强的模糊和色调遮罩，适合承载正文。无需截图或 GPU"
              : "A stronger blur and tint support readable content. No snapshot or GPU is needed."}
          </p>
        </GlassSurface>
      </div>
    </GlassProvider>
  );
}
