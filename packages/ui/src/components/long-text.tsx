"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "cn";
import { type ReactNode, useEffect, useRef, useState } from "react";

export interface LongTextProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  label?: string;
}

/** Reveals truncated text on hover/focus, or on tap for coarse pointers. */
export function LongText({
  children,
  className,
  contentClassName,
  label,
}: LongTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setTouch(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Content, width classes, and trigger mode can replace or resize the measured DOM node.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let disposed = false;
    const measure = () => {
      if (!disposed)
        setOverflow(
          element.scrollWidth > element.clientWidth ||
            element.scrollHeight > element.clientHeight,
        );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [children, className, overflow, touch]);
  const text = (
    <span ref={ref} data-slot="long-text-content" className="block truncate">
      {children}
    </span>
  );
  const trigger = (
    <button
      type="button"
      aria-label={label}
      className="block w-full min-w-0 rounded-sm text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {text}
    </button>
  );
  let content = text;
  if (overflow) {
    if (touch)
      content = (
        <Popover>
          <PopoverTrigger render={trigger} />
          <PopoverContent
            className={cn("wrap-anywhere w-fit max-w-xs", contentClassName)}
          >
            {children}
          </PopoverContent>
        </Popover>
      );
    else
      content = (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent className={cn("wrap-anywhere", contentClassName)}>
            {children}
          </TooltipContent>
        </Tooltip>
      );
  }
  return (
    <div
      data-slot="long-text"
      data-overflow={overflow}
      className={cn("min-w-0 max-w-full", className)}
    >
      {content}
    </div>
  );
}
