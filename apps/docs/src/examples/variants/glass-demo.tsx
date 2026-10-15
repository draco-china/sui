"use client";
import { type GlassMode, GlassSurface } from "@workspace/ui/components/glass";
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
        <div
          ref={scene}
          className="relative isolate grid min-h-80 w-full items-center gap-4 overflow-hidden rounded-2xl p-6 lg:grid-cols-2"
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
            glassConfig={{ mode: activeMode, captureTarget: scene }}
            className="rounded-2xl bg-background p-6 text-foreground"
          >
            <h3>{chinese ? "玻璃表面" : "Glass surface"}</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              {chinese
                ? "统一的清透材质，保留背景折射与柔和高光"
                : "Shared clear material with background refraction and soft highlights."}
            </p>
          </GlassSurface>
        </div>
      </TabsContent>
    </Tabs>
  );
}
