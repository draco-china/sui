"use client";
import {
  type GlassMode,
  GlassProvider,
  GlassSurface,
} from "@workspace/ui/components/glass";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useEffect, useRef, useState } from "react";
import type { ExampleProps } from "../types";

const tiles = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-400",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
];
export default function Example({
  locale,
  mode: forcedMode,
}: ExampleProps & { mode?: GlassMode }) {
  const chinese = locale === "zh-CN";
  const [mode, setMode] = useState<GlassMode>("auto");
  const activeMode = forcedMode ?? mode;
  const scene = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState<
    "vgpu" | "svg" | "css" | "fallback" | "loading"
  >("loading");
  const labels = chinese
    ? {
        css: "当前渲染：CSS 模糊 + SVG 高光",
        vgpu: "当前渲染：vgpu + WGSL 折射 + SVG 高光",
        svg: "当前渲染：SVG 折射 + CSS 材质 + SVG 高光",
        fallback: "当前渲染：CSS + SVG（增强不可用）",
        loading: "当前渲染：CSS + SVG（等待增强）",
      }
    : {
        css: "Rendering: CSS blur + SVG highlights",
        vgpu: "Rendering: vgpu + WGSL refraction + SVG highlights",
        svg: "Rendering: SVG refraction + CSS material + SVG highlights",
        fallback: "Rendering: CSS + SVG (enhancement unavailable)",
        loading: "Rendering: CSS + SVG (awaiting enhancement)",
      };
  useEffect(() => {
    const target = scene.current;
    if (!target) return;
    const update = () => {
      const surfaces = [...target.querySelectorAll('[data-glass="true"]')];
      const ready = surfaces.filter(
        (surface) => surface.getAttribute("data-glass-state") === "ready",
      );
      let next: "vgpu" | "svg" | "css" | "fallback" | "loading" = "loading";
      if (activeMode === "css") next = "css";
      else if (ready.length)
        next = ready.every(
          (surface) => surface.getAttribute("data-glass-renderer") === "vgpu",
        )
          ? "vgpu"
          : "svg";
      else if (
        surfaces.some(
          (surface) => surface.getAttribute("data-glass-state") === "fallback",
        )
      )
        next = "fallback";
      setRendering(next);
    };
    const observer = new MutationObserver(update);
    observer.observe(target, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-glass-state", "data-glass-renderer"],
    });
    update();
    return () => observer.disconnect();
  }, [activeMode]);
  return (
    <Tabs
      value={activeMode}
      onValueChange={(value) => setMode(value as GlassMode)}
      className="w-full gap-3"
    >
      {!forcedMode && (
        <TabsList
          aria-label={chinese ? "玻璃渲染方案" : "Glass rendering mode"}
          wrapperClassName="w-full sm:w-fit"
        >
          <TabsTrigger value="css">CSS + SVG</TabsTrigger>
          <TabsTrigger value="svg">
            {chinese ? "SVG 折射" : "SVG refraction"}
          </TabsTrigger>
          <TabsTrigger value="auto">vgpu + WGSL</TabsTrigger>
        </TabsList>
      )}
      <TabsContent value={activeMode} keepMounted className="grid gap-3">
        <p role="status" className="text-muted-foreground text-sm">
          {labels[rendering]}
        </p>
        <GlassProvider mode={activeMode} captureTarget={scene}>
          <div
            ref={scene}
            className="relative isolate grid min-h-80 w-full items-center gap-4 overflow-hidden rounded-2xl p-6 lg:grid-cols-2 xl:grid-cols-4"
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
              data-glass-exclude=""
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
              intensity="sm"
              className="rounded-2xl bg-background p-6 text-foreground"
            >
              <h3>{chinese ? "低强度" : "Low intensity"}</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                {chinese
                  ? "轻度模糊与柔和边缘高光，保持背景可辨"
                  : "A light blur and soft edge highlights keep the background recognizable."}
              </p>
            </GlassSurface>
            <GlassSurface
              intensity="default"
              className="rounded-2xl bg-background p-6 text-foreground"
            >
              <h3>{chinese ? "默认强度" : "Default intensity"}</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                {chinese
                  ? "更强的模糊和色调遮罩，适合承载正文"
                  : "A stronger blur and tint support readable content."}
              </p>
            </GlassSurface>
            <GlassSurface
              intensity="lg"
              className="rounded-2xl bg-background p-6 text-foreground"
            >
              <h3>{chinese ? "高强度" : "High intensity"}</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                {chinese
                  ? "更浓的磨砂与底色，适合复杂背景上的内容"
                  : "A denser blur and tint for content over busy backgrounds."}
              </p>
            </GlassSurface>
          </div>
        </GlassProvider>
      </TabsContent>
    </Tabs>
  );
}
