"use client";
import { Button } from "@workspace/ui/components/button";
import {
  type GlassHandle,
  GlassProvider,
  GlassSurface,
} from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Slider } from "@workspace/ui/components/slider";
import { useEffect, useId, useRef, useState } from "react";
import type { ExampleProps } from "../types";

const illustration =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180" viewBox="0 0 600 180"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="1.5"/></pattern></defs><rect width="600" height="180" fill="#648493"/><circle cx="120" cy="80" r="90" fill="#AE916B"/><circle cx="360" cy="140" r="130" fill="#70866A"/><path d="M0 140L600 20" stroke="#BC6C73" stroke-width="24"/><rect width="600" height="180" fill="url(#grid)"/></svg>',
  );
const rows = Array.from({ length: 16 }, (_, index) => index + 1);
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const stateLabels = chinese
    ? {
        vgpu: "当前渲染：vgpu + WGSL 折射 + SVG 高光",
        svg: "当前渲染：SVG 折射 + SVG 高光",
        fallback: "当前渲染：CSS + SVG（增强不可用）",
        loading: "当前渲染：CSS + SVG（等待增强）",
      }
    : {
        vgpu: "Rendering: vgpu + WGSL refraction + SVG highlights",
        svg: "Rendering: SVG refraction + SVG highlights",
        fallback: "Rendering: CSS + SVG (enhancement unavailable)",
        loading: "Rendering: CSS + SVG (awaiting enhancement)",
      };
  const id = useId();
  const scene = useRef<HTMLDivElement>(null);
  const controller = useRef<GlassHandle>(null);
  const [rendering, setRendering] = useState<
    "vgpu" | "svg" | "fallback" | "loading"
  >("loading");
  useEffect(() => {
    const target = scene.current;
    if (!target) return;
    const update = () => {
      const surfaces = [...target.querySelectorAll('[data-glass="true"]')];
      const ready = surfaces.filter(
        (surface) => surface.getAttribute("data-glass-state") === "ready",
      );
      let next: "vgpu" | "svg" | "fallback" | "loading" = "loading";
      if (ready.length)
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
  }, []);
  const [text, setText] = useState("SUI / REFRACTION");
  const [strength, setStrength] = useState(22);
  const [blur, setBlur] = useState(6);
  const [highlight, setHighlight] = useState(0.3);
  const controls = [
    {
      key: "strength",
      label: chinese ? "折射强度" : "Refraction strength",
      value: strength,
      max: 64,
      step: 1,
      change: setStrength,
    },
    {
      key: "blur",
      label: chinese ? "模糊" : "Blur",
      value: blur,
      max: 24,
      step: 1,
      change: setBlur,
    },
    {
      key: "highlight",
      label: chinese ? "边缘高光" : "Edge highlight",
      value: highlight,
      max: 1,
      step: 0.05,
      change: setHighlight,
    },
  ];
  return (
    <div className="grid w-full gap-4">
      <p role="status" className="text-muted-foreground text-sm">
        {stateLabels[rendering]}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid flex-1 gap-2">
          <Label htmlFor={id}>{chinese ? "背景文字" : "Background text"}</Label>
          <Input
            id={id}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => controller.current?.refresh()}
        >
          {chinese ? "刷新快照" : "Refresh snapshot"}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {controls.map(({ key, label, value, max, step, change }) => (
          <div key={key} className="grid gap-2">
            <Label id={`${id}-${key}-label`} htmlFor={`${id}-${key}`}>
              {label}: <output htmlFor={`${id}-${key}`}>{value}</output>
            </Label>
            <Slider
              id={`${id}-${key}`}
              aria-labelledby={`${id}-${key}-label`}
              min={0}
              max={max}
              step={step}
              value={[value]}
              onValueChange={(values) =>
                change(Array.isArray(values) ? values[0] : values)
              }
            />
          </div>
        ))}
      </div>
      <GlassProvider
        ref={controller}
        captureTarget={scene}
        options={{ strength, blur, highlight }}
      >
        <div
          ref={scene}
          className="relative isolate h-96 overflow-hidden rounded-2xl border bg-muted"
        >
          <ScrollArea
            role="region"
            className="absolute inset-0"
            aria-label={chinese ? "可滚动的背景" : "Scrollable background"}
          >
            <img
              src={illustration}
              alt={
                chinese
                  ? "由圆形和斜线组成的彩色图案"
                  : "Colorful circles and a diagonal stripe"
              }
              className="h-44 w-full object-cover"
            />
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
              {rows.map((row) => (
                <div
                  key={row}
                  className="grid min-h-24 content-center gap-1 rounded-xl bg-background p-3"
                >
                  <p className="text-primary text-sm">{text}</p>
                  <p className="text-muted-foreground text-xs">
                    {chinese ? "网格" : "Grid"} {row}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <GlassSurface
            intensity="default"
            className="absolute top-20 left-6 w-[calc(50%-2rem)] rounded-2xl bg-background p-4 text-foreground"
          >
            <p>{chinese ? "文字与图片背景" : "Text and image background"}</p>
            <p className="mt-2 text-muted-foreground text-sm">
              {chinese
                ? "调整滑块或滚动背景，比较折射与原始快照"
                : "Adjust the sliders or scroll to compare refraction with the original snapshot."}
            </p>
          </GlassSurface>
          <GlassSurface
            intensity="default"
            className="absolute top-20 right-6 w-[calc(50%-2rem)] rounded-2xl bg-background p-4 text-foreground"
          >
            <p>
              {chinese ? "同一场景，独立表面" : "One scene, separate surfaces"}
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              {chinese
                ? "同场景共用截图与纹理，独立更新坐标"
                : "Matching scenes share a snapshot and texture, with separate sampling coordinates."}
            </p>
          </GlassSurface>
        </div>
      </GlassProvider>
    </div>
  );
}
