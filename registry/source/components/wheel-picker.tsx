"use client";

import { cn } from "cn";
import {
  type ComponentProps,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { type GlassProps, withGlass } from "@/lib/glass/with-glass";

export type WheelPickerOption = string | { label: string; value: string };
export interface WheelPickerProps
  extends GlassProps,
    Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  options: readonly WheelPickerOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** An odd number of visible rows, from 3 to 11. */
  visibleCount?: number;
  itemHeight?: number;
  disabled?: boolean;
  /** Optional synthesized tick; never plays before user interaction. */
  sound?: boolean;
  /** Includes the selected value in native form submission. */
  name?: string;
}

const optionValue = (option: WheelPickerOption) =>
  typeof option === "string" ? option : option.value;
const optionLabel = (option: WheelPickerOption) =>
  typeof option === "string" ? option : option.label;
const clamp = (value: number, last: number) =>
  Math.max(0, Math.min(last, value));

function WheelPickerImplementation({
  options,
  value,
  defaultValue,
  onValueChange,
  visibleCount = 5,
  itemHeight = 36,
  disabled = false,
  sound = false,
  name,
  className,
  style,
  ref: forwardedRef,
  onKeyDown,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  "aria-label": ariaLabel = "Options",
  ...props
}: WheelPickerProps) {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const selectedValue = controlled ? value : internal;
  const index = Math.max(
    0,
    options.findIndex((option) => optionValue(option) === selectedValue),
  );
  const selected = options[index];
  const unavailable = disabled || !options.length;
  const rowHeight = Number.isFinite(itemHeight) ? Math.max(24, itemHeight) : 36;
  const rows = Number.isFinite(visibleCount)
    ? Math.min(11, Math.max(3, Math.floor(visibleCount / 2) * 2 + 1))
    : 5;
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0);
  const audio = useRef<AudioContext | undefined>(undefined);
  const gesture = useRef<
    | { pointer: number; y: number; top: number; time: number; option?: number }
    | undefined
  >(undefined);
  const live = useRef({
    options,
    index,
    controlled,
    unavailable,
    reducedMotion,
    rowHeight,
    rows,
    onValueChange,
    sound,
  });
  useLayoutEffect(() => {
    live.current = {
      options,
      index,
      controlled,
      unavailable,
      reducedMotion,
      rowHeight,
      rows,
      onValueChange,
      sound,
    };
  });

  const paint = useCallback(() => {
    const view = viewport.current;
    if (!view) return;
    const { rowHeight, rows, reducedMotion } = live.current;
    const position = view.scrollTop / rowHeight;
    const half = (rows - 1) / 2;
    const step = 90 / (half + 1);
    const radius = rowHeight / Math.tan((step * Math.PI) / 180);
    for (const element of view.querySelectorAll<HTMLElement>(
      "[data-wheel-item]",
    )) {
      const distance = Number(element.dataset.wheelItem) - position;
      const angle = Math.max(-90, Math.min(90, distance * step));
      const radians = (angle * Math.PI) / 180;
      element.style.transform = reducedMotion
        ? "none"
        : `translateY(${Math.sin(radians) * radius - distance * rowHeight}px) rotateX(${-angle}deg)`;
      element.style.visibility =
        !reducedMotion && Math.abs(distance) > half + 0.5
          ? "hidden"
          : "visible";
    }
  }, []);

  const tick = useCallback(() => {
    if (!live.current.sound) return;
    try {
      audio.current ??= new AudioContext();
      const context = audio.current;
      void context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 900;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.025,
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.03);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      // Audio support and autoplay permissions never block selection.
    }
  }, []);

  const align = useCallback(
    (target: number, smooth = false) => {
      const view = viewport.current;
      if (!view) return;
      view.scrollTo({
        top: target * live.current.rowHeight,
        behavior: smooth && !live.current.reducedMotion ? "smooth" : "instant",
      });
      paint();
    },
    [paint],
  );

  const choose = useCallback(
    (target: number) => {
      const state = live.current;
      const option = state.options[clamp(target, state.options.length - 1)];
      if (state.unavailable || !option) return;
      if (target !== state.index) {
        if (!state.controlled) setInternal(optionValue(option));
        state.onValueChange?.(optionValue(option));
        tick();
      }
      // The parent owns controlled selection, including rejecting a change.
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => align(live.current.index));
    },
    [align, tick],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Geometry and preference changes repaint the same selection through the live refs.
  useLayoutEffect(() => {
    if (!gesture.current) align(index);
  }, [index, options, align, rowHeight, rows, reducedMotion]);

  useEffect(() => {
    const form = input.current?.form;
    if (!form || controlled) return;
    const reset = () => {
      setInternal(defaultValue);
      const target = Math.max(
        0,
        options.findIndex((option) => optionValue(option) === defaultValue),
      );
      align(target);
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, defaultValue, options, align]);

  const cancelGesture = useCallback(() => {
    const active = gesture.current;
    gesture.current = undefined;
    if (active && root.current?.hasPointerCapture(active.pointer))
      root.current.releasePointerCapture(active.pointer);
    clearTimeout(timer.current);
    if (viewport.current) viewport.current.style.scrollSnapType = "";
    align(live.current.index);
  }, [align]);

  useEffect(() => {
    if (unavailable) cancelGesture();
    window.addEventListener("blur", cancelGesture);
    return () => window.removeEventListener("blur", cancelGesture);
  }, [unavailable, cancelGesture]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
      void audio.current?.close().catch(() => {});
    },
    [],
  );

  const endPointer = (
    event: PointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const active = gesture.current;
    if (!active || active.pointer !== event.pointerId) return;
    if (cancelled) {
      cancelGesture();
      return;
    }
    gesture.current = undefined;
    if (root.current?.hasPointerCapture(active.pointer))
      root.current.releasePointerCapture(active.pointer);
    const top = viewport.current?.scrollTop ?? 0;
    if (viewport.current) viewport.current.style.scrollSnapType = "";
    if (Math.abs(event.clientY - active.y) < 4 && active.option !== undefined) {
      choose(active.option);
      return;
    }
    const velocity =
      (top - active.top) / Math.max(1, performance.now() - active.time);
    align(
      clamp(
        Math.round((top + (reducedMotion ? 0 : velocity * 100)) / rowHeight),
        options.length - 1,
      ),
      true,
    );
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => choose(Math.round((viewport.current?.scrollTop ?? 0) / rowHeight)),
      160,
    );
  };

  return (
    <div
      {...props}
      ref={(node) => {
        root.current = node;
        if (typeof forwardedRef === "function") {
          const cleanup = forwardedRef(node);
          if (cleanup)
            return () => {
              root.current = null;
              cleanup();
            };
        } else if (forwardedRef) forwardedRef.current = node;
      }}
      data-slot="wheel-picker"
      role="listbox"
      aria-label={ariaLabel}
      aria-disabled={unavailable || undefined}
      aria-activedescendant={selected ? `${id}-${index}` : undefined}
      tabIndex={unavailable ? -1 : 0}
      className={cn(
        "relative isolate w-40 min-w-0 rounded-3xl bg-card text-foreground text-sm outline-none ring-1 ring-foreground/10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-3",
        unavailable && "opacity-50",
        className,
      )}
      style={{ ...style, height: rowHeight * rows }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || unavailable || gesture.current) return;
        const option = (event.target as Element).closest<HTMLElement>(
          "[data-wheel-option]",
        );
        if (option) choose(Number(option.dataset.wheelOption));
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || unavailable) return;
        const targets: Record<string, number> = {
          ArrowUp: index - 1,
          ArrowDown: index + 1,
          Home: 0,
          End: options.length - 1,
          PageUp: index - rows,
          PageDown: index + rows,
        };
        const target = targets[event.key];
        if (target === undefined) return;
        event.preventDefault();
        clearTimeout(timer.current);
        choose(clamp(target, options.length - 1));
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (
          event.defaultPrevented ||
          unavailable ||
          event.pointerType === "touch" ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        root.current?.focus({ preventScroll: true });
        if (viewport.current) viewport.current.style.scrollSnapType = "none";
        const optionElement = (event.target as Element).closest<HTMLElement>(
          "[data-wheel-option]",
        );
        gesture.current = {
          option: optionElement
            ? Number(optionElement.dataset.wheelOption)
            : undefined,
          pointer: event.pointerId,
          y: event.clientY,
          top: viewport.current?.scrollTop ?? 0,
          time: performance.now(),
        };
        root.current?.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (
          event.defaultPrevented ||
          unavailable ||
          gesture.current?.pointer !== event.pointerId ||
          !viewport.current
        )
          return;
        viewport.current.scrollTop =
          gesture.current.top + gesture.current.y - event.clientY;
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        endPointer(event, false);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        endPointer(event, true);
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        if (gesture.current?.pointer === event.pointerId) cancelGesture();
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-foreground/5"
        style={{ height: rowHeight }}
      />
      <div
        ref={viewport}
        data-slot="wheel-picker-viewport"
        className={cn(
          "h-full touch-pan-y select-none snap-y snap-mandatory overscroll-contain rounded-[inherit] [-webkit-touch-callout:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          unavailable ? "overflow-hidden" : "overflow-y-auto",
        )}
        style={{ perspective: reducedMotion ? undefined : 1000 }}
        onScroll={() => {
          paint();
          clearTimeout(timer.current);
          if (!gesture.current)
            timer.current = setTimeout(
              () =>
                choose(
                  Math.round((viewport.current?.scrollTop ?? 0) / rowHeight),
                ),
              140,
            );
        }}
      >
        <div
          role="presentation"
          style={{ paddingBlock: (rowHeight * (rows - 1)) / 2 }}
        >
          {options.map((option, position) => (
            <div
              id={`${id}-${position}`}
              key={optionValue(option)}
              role="option"
              tabIndex={-1}
              data-wheel-option={position}
              aria-label={optionLabel(option)}
              aria-selected={index === position}
              className="snap-center"
              style={{ height: rowHeight }}
            >
              <span
                aria-hidden="true"
                data-wheel-item={position}
                className={cn(
                  "flex h-full items-center justify-center truncate px-3 font-medium [backface-visibility:hidden]",
                  index === position
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {optionLabel(option)}
              </span>
            </div>
          ))}
        </div>
      </div>
      {name && (
        <input
          ref={input}
          type="hidden"
          name={name}
          value={selected ? optionValue(selected) : ""}
          disabled={disabled}
        />
      )}
    </div>
  );
}

const WheelPicker = withGlass(WheelPickerImplementation);

export { WheelPicker };
