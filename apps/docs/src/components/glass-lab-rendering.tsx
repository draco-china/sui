"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

function useRenderingStatus(
  scene: RefObject<HTMLDivElement | null>,
  root: RefObject<HTMLDivElement | null>,
) {
  const [counts, setCounts] = useState({
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
        svg: 0,
        css: 0,
        loading: 0,
        fallback: 0,
      };
      const tracked = new Set<Element>();
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
        if (state === "ready" && renderer === "svg") next.svg++;
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
      observer.disconnect();
      intersection.disconnect();
      intersections.clear();
      resize.disconnect();
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [scene, root]);
  return counts;
}

/** Page frame rate from requestAnimationFrame callbacks over about a second. */
function useFrameRate() {
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    let frame = 0;
    let start = 0;
    let frames = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      frames++;
      const elapsed = now - start;
      if (elapsed >= 1000) {
        setRate(Math.round(((frames - 1) * 1000) / elapsed));
        start = now;
        frames = 1;
      }
      frame = window.requestAnimationFrame(tick);
    };
    const visibility = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      start = 0;
      frames = 0;
      if (document.hidden) setRate(null);
      else frame = window.requestAnimationFrame(tick);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return rate;
}

export function RenderingStatus({
  scene,
  zh,
}: {
  scene: RefObject<HTMLDivElement | null>;
  zh: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const counts = useRenderingStatus(scene, root);
  const rate = useFrameRate();
  return (
    <div
      ref={root}
      data-slot="glass-lab-rendering"
      data-glass-decoration="true"
      className="space-y-2 text-xs"
    >
      <p className="sr-only">{zh ? "当前可见组件" : "Visible components"}</p>
      <div className="grid grid-cols-3 divide-x rounded-lg bg-muted/50 py-2 text-center">
        {(
          [
            ["SVG", counts.svg],
            ["CSS", counts.css],
          ] as const
        ).map(([label, count]) => (
          <div key={label}>
            <span className="block font-semibold text-sm tabular-nums">
              {count}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
        <div
          aria-live="off"
          title={
            zh
              ? "根据约一秒内的 requestAnimationFrame 回调估算，不代表物理显示器刷新率。"
              : "Estimated from requestAnimationFrame callbacks over about one second; this does not certify the display refresh rate."
          }
        >
          <output
            aria-live="off"
            className="block font-semibold text-sm tabular-nums"
          >
            {rate ?? "—"}
          </output>
          <span className="block text-[11px] text-muted-foreground">
            {zh ? "帧率" : "FPS"}
          </span>
        </div>
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
    </div>
  );
}
