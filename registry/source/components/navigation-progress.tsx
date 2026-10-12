"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "cn";
import { useEffect, useState } from "react";

export interface NavigationProgressProps {
  active: boolean;
  delay?: number;
  finishDelay?: number;
  label?: string;
  position?: "fixed" | "absolute";
  className?: string;
}

/** Router-independent navigation feedback with delayed start and completion. */
export function NavigationProgress({
  active,
  delay = 120,
  finishDelay = 180,
  label = "Loading page",
  position = "fixed",
  className,
}: NavigationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let timer: ReturnType<typeof setTimeout>;
    if (active) {
      setProgress((value) => (value === 100 ? 12 : value));
      timer = setTimeout(
        () => {
          setProgress(12);
          setVisible(true);
          interval = setInterval(
            () =>
              setProgress((value) => Math.min(90, value + (90 - value) * 0.12)),
            250,
          );
        },
        Math.max(0, delay),
      );
    } else {
      setProgress(100);
      timer = setTimeout(
        () => {
          setVisible(false);
          setProgress(0);
        },
        Math.max(0, finishDelay),
      );
    }
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [active, delay, finishDelay]);
  let state = "idle";
  if (visible) state = active ? "loading" : "complete";
  return (
    <ProgressPrimitive.Root
      value={active ? null : 100}
      aria-label={label}
      hidden={!visible}
      data-slot="navigation-progress"
      data-state={state}
      className={cn(
        "pointer-events-none inset-x-0 top-0 z-50",
        position === "fixed" ? "fixed" : "absolute",
        className,
      )}
    >
      <ProgressPrimitive.Track
        data-slot="navigation-progress-track"
        className="h-0.5 w-full overflow-hidden"
      >
        <div
          aria-hidden="true"
          data-slot="navigation-progress-indicator"
          className="h-full origin-left bg-primary transition-[transform] duration-200 ease-out motion-reduce:transition-none rtl:origin-right"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
