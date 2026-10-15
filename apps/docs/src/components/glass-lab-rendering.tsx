"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

function useRenderingStatus(
  scene: RefObject<HTMLDivElement | null>,
  root: RefObject<HTMLDivElement | null>,
  gpuSurface: RefObject<HTMLElement | null>,
) {
  const [counts, setCounts] = useState({
    vgpu: 0,
    svg: 0,
    css: 0,
    loading: 0,
    fallback: 0,
  });
  useEffect(() => {
    const intersections = new Map<Element, boolean>();
    let frame = 0;
    const schedule = () => {
      if (!document.hidden && !frame)
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          update();
        });
    };
    // The browser accounts for every overflow ancestor, including carousel
    // tracks and nested scroll areas, without repeatedly measuring that chain.
    const intersection = new IntersectionObserver((entries) => {
      for (const entry of entries)
        if (intersections.has(entry.target))
          intersections.set(entry.target, entry.isIntersecting);
      schedule();
    });
    const update = () => {
      const next = {
        vgpu: 0,
        svg: 0,
        css: 0,
        loading: 0,
        fallback: 0,
      };
      const tracked = new Set<Element>();
      let selectedGpu: HTMLElement | null = null;
      // Portals own independent requests outside the scene's DOM subtree.
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-glass="true"][data-glass-scope]',
      )) {
        if (element.closest("[data-glass-decoration]")) continue;
        tracked.add(element);
        if (!intersections.has(element)) {
          intersections.set(element, false);
          intersection.observe(element);
        }
        if (!intersections.get(element)) continue;
        const state = element.getAttribute("data-glass-state");
        if (
          state === "content" ||
          !element.getClientRects().length ||
          element.closest("[hidden],[inert]") ||
          getComputedStyle(element).visibility === "hidden"
        )
          continue;
        const bounds = element.getBoundingClientRect();
        if (
          bounds.width <= 0 ||
          bounds.height <= 0 ||
          bounds.bottom <= 0 ||
          bounds.top >= window.innerHeight ||
          bounds.right <= 0 ||
          bounds.left >= window.innerWidth
        )
          continue;
        const stage = scene.current;
        if (stage?.contains(element)) {
          const clipping = stage.getBoundingClientRect();
          if (
            bounds.bottom <= clipping.top ||
            bounds.top >= clipping.bottom ||
            bounds.right <= clipping.left ||
            bounds.left >= clipping.right
          )
            continue;
        }
        const renderer = element.getAttribute("data-glass-renderer");
        if (state === "ready" && renderer === "vgpu") {
          next.vgpu++;
          if (!selectedGpu || element.dataset.slot === "glass-refraction-probe")
            selectedGpu = element;
        } else if (state === "ready" && renderer === "svg") next.svg++;
        else if (state === "css") next.css++;
        else if (state === "fallback") {
          next.css++;
          next.fallback++;
        } else next.loading++;
      }
      for (const element of intersections.keys())
        if (!tracked.has(element)) {
          intersection.unobserve(element);
          intersections.delete(element);
        }
      gpuSurface.current = selectedGpu;
      setCounts((previous) => {
        if (
          Object.keys(next).every(
            (key) =>
              previous[key as keyof typeof next] ===
              next[key as keyof typeof next],
          )
        )
          return previous;
        return next;
      });
    };
    const observer = new MutationObserver((records) => {
      if (records.some((record) => !root.current?.contains(record.target)))
        schedule();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-glass-state", "data-glass-renderer"],
    });
    const resize = new ResizeObserver(schedule);
    if (scene.current) resize.observe(scene.current);
    document.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);
    const visibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    update();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      gpuSurface.current = null;
      observer.disconnect();
      intersection.disconnect();
      intersections.clear();
      resize.disconnect();
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [scene, root, gpuSurface]);
  return counts;
}

function useFrameRates(gpuSurface: RefObject<HTMLElement | null>) {
  const [rates, setRates] = useState<{
    browser: number | null;
    gpu: number | null;
  }>({ browser: null, gpu: null });
  useEffect(() => {
    let frame = 0;
    let start = 0;
    let browserFrames = 0;
    let selected: HTMLElement | null = null;
    let lastUrl = "";
    let gpuStart = 0;
    let gpuFrames = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      browserFrames++;
      const candidate = gpuSurface.current;
      let current: HTMLElement | null = null;
      if (candidate?.isConnected && candidate.dataset.glassRenderer === "vgpu")
        current = candidate;
      if (current !== selected) {
        selected = current;
        lastUrl = current?.style.getPropertyValue("--glass-frame") ?? "";
        gpuFrames = 0;
        gpuStart = now;
        setRates((previous) =>
          previous.gpu === null ? previous : { ...previous, gpu: null },
        );
      } else if (current) {
        const url = current.style.getPropertyValue("--glass-frame");
        if (url && url !== lastUrl) gpuFrames++;
        lastUrl = url;
      }
      const elapsed = now - start;
      if (elapsed >= 1000) {
        let gpu: number | null = null;
        if (selected && now > gpuStart)
          gpu = Math.round((gpuFrames * 1000) / (now - gpuStart));
        setRates({
          browser: Math.round(((browserFrames - 1) * 1000) / elapsed),
          gpu,
        });
        start = now;
        browserFrames = 1;
        gpuStart = now;
        gpuFrames = 0;
      }
      frame = window.requestAnimationFrame(tick);
    };
    const visibility = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      start = 0;
      browserFrames = 0;
      selected = null;
      lastUrl = "";
      gpuStart = 0;
      gpuFrames = 0;
      if (document.hidden) setRates({ browser: null, gpu: null });
      else frame = window.requestAnimationFrame(tick);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [gpuSurface]);
  return rates;
}

export function RenderingStatus({
  scene,
  zh,
}: {
  scene: RefObject<HTMLDivElement | null>;
  zh: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const gpuSurface = useRef<HTMLElement | null>(null);
  const counts = useRenderingStatus(scene, root, gpuSurface);
  const rates = useFrameRates(gpuSurface);
  return (
    <div
      ref={root}
      data-slot="glass-lab-rendering"
      data-glass-decoration="true"
      className="space-y-3 text-xs"
    >
      <p className="sr-only">{zh ? "当前可见组件" : "Visible components"}</p>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["WebGPU", counts.vgpu],
            ["SVG", counts.svg],
            ["CSS", counts.css],
          ] as const
        ).map(([label, count]) => (
          <div
            key={label}
            className="rounded-lg bg-muted/50 px-2 py-2 text-center"
          >
            <span className="block text-muted-foreground">{label}</span>
            <span className="mt-1 block font-semibold text-base tabular-nums">
              {count}
            </span>
          </div>
        ))}
      </div>
      {(counts.loading > 0 || counts.fallback > 0) && (
        <div
          className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground"
          role="status"
        >
          {counts.loading > 0 && (
            <span>
              {zh ? "准备中" : "Preparing"}{" "}
              <strong className="font-medium text-foreground tabular-nums">
                {counts.loading}
              </strong>
            </span>
          )}
          {counts.fallback > 0 && (
            <span>
              {zh ? "已回退" : "Fallback"}{" "}
              <strong className="font-medium text-foreground tabular-nums">
                {counts.fallback}
              </strong>
            </span>
          )}
        </div>
      )}
      <div className="space-y-1.5 border-t pt-3" aria-live="off">
        <div
          className="flex items-center justify-between gap-2"
          title={
            zh
              ? "根据约一秒内的 requestAnimationFrame 回调估算，不代表物理显示器刷新率。"
              : "Estimated from requestAnimationFrame callbacks over about one second; this does not certify the display refresh rate."
          }
        >
          <span className="text-muted-foreground">
            {zh ? "页面帧率" : "Page frame rate"}
          </span>
          <output aria-live="off" className="font-medium tabular-nums">
            {rates.browser ?? "—"}{" "}
            <span className="text-[10px] text-muted-foreground">FPS</span>
          </output>
        </div>
        {counts.vgpu > 0 && (
          <div
            className="flex items-center justify-between gap-2"
            title={
              zh
                ? "优先统计折射镜片，否则统计首个可见 GPU 表面已提交的新画面；不累加多个组件，也不代表实际显示帧数。"
                : "New frames committed by the refraction lens, or the first visible GPU surface; surfaces are not added together, and this is not a count of displayed frames."
            }
          >
            <span className="text-muted-foreground">
              {zh ? "玻璃更新" : "Glass updates"}
            </span>
            <output aria-live="off" className="font-medium tabular-nums">
              {rates.gpu ?? "—"}{" "}
              <span className="text-[10px] text-muted-foreground">FPS</span>
            </output>
          </div>
        )}
      </div>
    </div>
  );
}
