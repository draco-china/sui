"use client";
import { GlassSurface } from "@workspace/ui/components/glass";
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

type Material = "clear" | "frosted";
type Rendering = "svg" | "css" | "frosted" | "loading";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [material, setMaterial] = useState<Material>("clear");
  const scene = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState<Rendering>("loading");
  const labels = chinese
    ? {
        svg: "当前渲染：SVG 折射 + CSS 材质 + SVG 高光",
        css: "当前渲染：CSS 模糊 + SVG 高光（浏览器不支持 SVG 背景滤镜）",
        frosted: "当前渲染：CSS 模糊（磨砂玻璃无折射与边缘光）",
        loading: "当前渲染：CSS + SVG（等待折射）",
      }
    : {
        svg: "Rendering: SVG refraction + CSS material + SVG highlights",
        css: "Rendering: CSS blur + SVG highlights (no SVG backdrop filters)",
        frosted:
          "Rendering: CSS blur (frosted glass has no refraction or edge light)",
        loading: "Rendering: CSS + SVG (awaiting refraction)",
      };
  const surfaceCopy = chinese
    ? {
        clear: "背景折射、材质着色与柔和的边缘高光",
        frosted: "磨砂背景与材质着色",
      }
    : {
        clear:
          "Background refraction, a material tint and a soft edge highlight.",
        frosted: "A frosted backdrop and a material tint.",
      };
  useEffect(() => {
    const target = scene.current;
    if (!target) return;
    const update = () => {
      const surface = target.querySelector('[data-glass="true"]');
      const state = surface?.getAttribute("data-glass-state");
      if (target.querySelector('[data-frosted="true"]'))
        setRendering("frosted");
      else if (state === "ready") setRendering("svg");
      else if (state === "css" || state === "fallback") setRendering("css");
      else setRendering("loading");
    };
    const observer = new MutationObserver(update);
    observer.observe(target, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-glass-state", "data-frosted"],
    });
    update();
    return () => observer.disconnect();
  }, []);
  return (
    <Tabs
      value={material}
      onValueChange={(value) => setMaterial(value as Material)}
      className="w-full gap-3"
    >
      <TabsList
        aria-label={chinese ? "玻璃材质" : "Glass material"}
        wrapperClassName="w-full sm:w-fit"
      >
        <TabsTrigger value="clear">{chinese ? "清透" : "Clear"}</TabsTrigger>
        <TabsTrigger value="frosted">
          {chinese ? "磨砂" : "Frosted"}
        </TabsTrigger>
      </TabsList>
      <TabsContent value={material} keepMounted className="grid gap-3">
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
          <div className="rounded-2xl border bg-background p-6 text-foreground">
            <h3>{chinese ? "普通表面" : "Standard surface"}</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              {chinese
                ? "不透出背景，保持默认外观"
                : "Keeps the default appearance without showing the background."}
            </p>
          </div>
          <GlassSurface
            frosted={material === "frosted"}
            className="rounded-2xl bg-background p-6 text-foreground"
          >
            <h3>{chinese ? "玻璃表面" : "Glass surface"}</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              {surfaceCopy[material]}
            </p>
          </GlassSurface>
        </div>
      </TabsContent>
    </Tabs>
  );
}
