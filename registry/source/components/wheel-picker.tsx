"use client";

import { cn } from "cn";
import {
  type AnimationPlaybackControls,
  animate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
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
import { type GlassProps, withGlass } from "@/lib/glass/with-glass";
import { createTickPlayer } from "@/lib/tick-sound";
import {
  type FeedbackOption,
  useFeedback,
  useFeedbackSettings,
} from "@/components/ui/feedback";

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
  /**
   * Selection haptic and tick per row crossed; follows `FeedbackProvider` when
   * unset. The tick never plays before user interaction.
   */
  feedback?: FeedbackOption;
  /** Includes the selected value in native form submission. */
  name?: string;
}

// Physics tuned for an iOS-like flick: the wheel coasts in whole-row units,
// then settles on a row with a small bounce.
/** Rows per ms², how fast a flick bleeds off; lower coasts further. */
const deceleration = 0.00042;
/** Rows per ms; caps a hard fling. */
const maxVelocity = 0.18;
/** Recent drag, in ms, averaged into a release velocity. */
const velocityWindow = 90;
/** Rows per pixel of wheel delta. */
const wheelSensitivity = 0.012;
/** Wheel idle time, in ms, before snapping to a row. */
const wheelSettle = 110;
/** Movement, in px, below which a press is a tap on its option. */
const tapSlop = 4;
// Overshoots the row by a few percent, then settles: the detent's bounce.
const back = 1.35;
const easeOutBack = (progress: number) =>
  1 + (back + 1) * (progress - 1) ** 3 + back * (progress - 1) ** 2;

const optionValue = (option: WheelPickerOption) =>
  typeof option === "string" ? option : option.value;
const optionLabel = (option: WheelPickerOption) =>
  typeof option === "string" ? option : option.label;
const clamp = (value: number, last: number) =>
  Math.max(0, Math.min(last, value));

type Drag = {
  pointer: number | "touch";
  y: number;
  position: number;
  option?: number;
  moved: boolean;
  samples: [y: number, time: number][];
};

function WheelPickerImplementation({
  options,
  value,
  defaultValue,
  onValueChange,
  visibleCount = 7,
  itemHeight = 36,
  disabled = false,
  feedback,
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
    : 7;
  // The outer rows tilt away and fill only the middle of a row-per-slot box,
  // so the drum is as tall as its projection: two radii, plus a little for
  // the edge rows' own height. A flat, reduced-motion list needs every slot.
  const drumRadius = rowHeight / Math.tan(Math.PI / (rows + 1));
  const [grabbing, setGrabbing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // The drum's position in rows: a float index both layers are painted from.
  const position = useMotionValue(index);
  const glide = useRef<AnimationPlaybackControls | undefined>(undefined);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const tickPlayer = useRef<ReturnType<typeof createTickPlayer> | undefined>(
    undefined,
  );
  const lastTick = useRef(index);
  const trigger = useFeedback(feedback);
  const { sound } = useFeedbackSettings(feedback);
  const drag = useRef<Drag | undefined>(undefined);
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
    const element = root.current;
    if (!element) return;
    const { rowHeight, rows, reducedMotion } = live.current;
    const at = position.get();
    const half = (rows - 1) / 2;
    const step = 90 / (half + 1);
    const radius = rowHeight / Math.tan((step * Math.PI) / 180);
    // The crisp band repeats the drum clipped to the centre row, painted with
    // the identical transform so the two copies register exactly.
    for (const item of element.querySelectorAll<HTMLElement>(
      "[data-wheel-item],[data-wheel-band-item]",
    )) {
      const distance =
        Number(item.dataset.wheelItem ?? item.dataset.wheelBandItem) - at;
      const angle = Math.max(-90, Math.min(90, distance * step));
      const radians = (angle * Math.PI) / 180;
      // Reduced motion lays the rows flat: a drum row stays upright and its
      // option slides, a band row slides itself.
      const flat = `translateY(${distance * rowHeight}px)`;
      const drum = `translate3d(0,${Math.sin(radians) * radius}px,${(Math.cos(radians) - 1) * radius}px) rotateX(${-angle}deg)`;
      const band = item.dataset.wheelBandItem !== undefined;
      let transform = drum;
      if (reducedMotion) transform = band ? flat : "none";
      if (item.style.transform !== transform) item.style.transform = transform;
      const slot = band ? undefined : item.parentElement;
      const offset = reducedMotion ? flat : "";
      if (slot && slot.style.transform !== offset)
        slot.style.transform = offset;
      const visibility =
        !reducedMotion && Math.abs(distance) > half + 0.5
          ? "hidden"
          : "visible";
      // Write only on change, so a drag never restyles every row per frame.
      if (item.style.visibility !== visibility)
        item.style.visibility = visibility;
    }
  }, [position]);

  const prepareAudio = useCallback(() => {
    if (!live.current.sound || live.current.unavailable) return;
    tickPlayer.current ??= createTickPlayer();
    tickPlayer.current.prepare();
  }, []);

  // Ticks follow the nearest row as the drum crosses it, independently of the
  // value committed once it settles.
  const tickAt = useCallback(
    (at: number) => {
      const state = live.current;
      const row = clamp(Math.round(at), state.options.length - 1);
      if (row === lastTick.current) return;
      lastTick.current = row;
      if (state.unavailable) return;
      if (state.sound) tickPlayer.current?.play();
      // The picker voices its own tick, so feedback adds only the haptic.
      trigger("selection", false);
    },
    [trigger],
  );

  // A silent glide follows rows without sounding them.
  const silentGlide = useRef(false);
  useEffect(
    () =>
      position.on("change", (at) => {
        paint();
        if (silentGlide.current)
          lastTick.current = clamp(
            Math.round(at),
            live.current.options.length - 1,
          );
        else tickAt(at);
      }),
    [position, paint, tickAt],
  );

  const stop = useCallback(() => {
    glide.current?.stop();
    glide.current = undefined;
    silentGlide.current = false;
  }, []);

  /** Moves the drum to a row; a silent move never ticks on the way. */
  const settle = useCallback(
    (
      target: number,
      {
        duration = 0.3,
        silent = false,
        onSettle,
      }: { duration?: number; silent?: boolean; onSettle?: () => void } = {},
    ) => {
      stop();
      if (live.current.reducedMotion || position.get() === target) {
        silentGlide.current = silent;
        position.jump(target);
        silentGlide.current = false;
        paint();
        onSettle?.();
        return;
      }
      silentGlide.current = silent;
      const controls = animate(position, target, {
        duration,
        ease: easeOutBack,
      });
      glide.current = controls;
      controls.then(() => {
        if (glide.current !== controls) return;
        glide.current = undefined;
        silentGlide.current = false;
        onSettle?.();
      });
    },
    [position, paint, stop],
  );

  /** Returns a resting drum to the selection the parent keeps. */
  const realign = useCallback(() => {
    if (drag.current || glide.current) return;
    if (Math.round(position.get()) !== live.current.index)
      settle(live.current.index, { silent: true });
  }, [position, settle]);

  /** Commits a row; the parent owns controlled selection, including a refusal. */
  const choose = useCallback(
    (target: number) => {
      const state = live.current;
      const option = state.options[clamp(target, state.options.length - 1)];
      if (state.unavailable || !option) return;
      if (target !== state.index) {
        if (!state.controlled) setInternal(optionValue(option));
        state.onValueChange?.(optionValue(option));
      }
      requestAnimationFrame(realign);
    },
    [realign],
  );

  /** A keyboard or tap selection ticks once, then glides silently. */
  const select = useCallback(
    (target: number) => {
      const state = live.current;
      const row = clamp(target, state.options.length - 1);
      if (row !== state.index) tickAt(row);
      settle(row, { silent: true, onSettle: realign });
      choose(row);
    },
    [choose, realign, settle, tickAt],
  );

  // Follow the selection, geometry and preference unless a gesture runs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Geometry and preference changes repaint the same selection through the live refs.
  useLayoutEffect(() => {
    if (drag.current || glide.current) {
      paint();
      return;
    }
    if (Math.round(position.get()) === index) {
      paint();
      return;
    }
    settle(index, { duration: 0.26, silent: true });
  }, [index, options, settle, rowHeight, rows, reducedMotion]);

  useEffect(() => {
    const form = input.current?.form;
    if (!form || controlled) return;
    const reset = () => {
      setInternal(defaultValue);
      const target = Math.max(
        0,
        options.findIndex((option) => optionValue(option) === defaultValue),
      );
      settle(target, { silent: true });
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, defaultValue, options, settle]);

  const beginDrag = useCallback(
    (pointer: Drag["pointer"], y: number, option?: number) => {
      stop();
      clearTimeout(wheelTimer.current);
      prepareAudio();
      drag.current = {
        pointer,
        y,
        position: position.get(),
        option,
        moved: false,
        samples: [[y, performance.now()]],
      };
      setGrabbing(true);
    },
    [position, prepareAudio, stop],
  );

  const moveDrag = useCallback(
    (y: number) => {
      const active = drag.current;
      if (!active) return;
      active.samples.push([y, performance.now()]);
      if (active.samples.length > 8) active.samples.shift();
      if (Math.abs(y - active.y) >= tapSlop) active.moved = true;
      const last = live.current.options.length - 1;
      let next = active.position + (active.y - y) / live.current.rowHeight;
      // Rubber-band past either end.
      if (next < 0) next *= 0.3;
      else if (next > last) next = last + (next - last) * 0.3;
      position.set(next);
    },
    [position],
  );

  const endDrag = useCallback(
    (cancelled: boolean) => {
      const active = drag.current;
      if (!active) return;
      drag.current = undefined;
      setGrabbing(false);
      const { options, rowHeight, index } = live.current;
      const last = options.length - 1;
      if (cancelled) {
        settle(index, { silent: true });
        return;
      }
      if (!active.moved && active.option !== undefined) {
        select(active.option);
        return;
      }
      // Average velocity over the last moments of the drag, so a single noisy
      // frame cannot make an even flick catch or slip.
      let velocity = 0;
      const samples = active.samples;
      const latest = samples[samples.length - 1];
      const reference =
        samples.find(([, time]) => latest[1] - time <= velocityWindow) ??
        samples[0];
      const elapsed = latest[1] - reference[1];
      if (elapsed > 0)
        velocity = Math.max(
          -maxVelocity,
          Math.min(
            maxVelocity,
            (reference[0] - latest[0]) / rowHeight / elapsed,
          ),
        );
      const from = position.get();
      if (from < 0 || from > last) {
        const target = clamp(Math.round(from), last);
        settle(target, { duration: 0.26, onSettle: () => choose(target) });
        return;
      }
      const coast =
        ((velocity * velocity) / (2 * deceleration)) * Math.sign(velocity);
      const target = clamp(Math.round(from + coast), last);
      // A long, bounce-tipped settle reads as momentum coasting to rest.
      const duration =
        Math.max(
          280,
          Math.min(1700, Math.sqrt(Math.abs(target - from)) * 300 + 240),
        ) / 1000;
      settle(target, { duration, onSettle: () => choose(target) });
    },
    [choose, position, select, settle],
  );

  useEffect(() => {
    const cancel = () => endDrag(true);
    if (unavailable) cancel();
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, [unavailable, endDrag]);

  // Touch and wheel bind natively and non-passively, so the drum can keep the
  // page from scrolling while it spins.
  useEffect(() => {
    const element = root.current;
    if (!element || unavailable) return;
    const optionAt = (target: EventTarget | null) => {
      const option =
        target instanceof Element
          ? target.closest<HTMLElement>("[data-wheel-option]")
          : null;
      return option ? Number(option.dataset.wheelOption) : undefined;
    };
    const touchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch && event.touches.length === 1)
        beginDrag("touch", touch.clientY, optionAt(event.target));
    };
    const touchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || drag.current?.pointer !== "touch") return;
      event.preventDefault();
      moveDrag(touch.clientY);
    };
    const touchEnd = (event: TouchEvent) => {
      if (drag.current?.pointer !== "touch") return;
      endDrag(event.type === "touchcancel");
    };
    // The wheel drives the drum continuously, then snaps once it goes idle.
    const wheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      prepareAudio();
      stop();
      const last = live.current.options.length - 1;
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      position.set(clamp(position.get() + pixels * wheelSensitivity, last));
      clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        const target = clamp(Math.round(position.get()), last);
        settle(target, { duration: 0.24, onSettle: () => choose(target) });
      }, wheelSettle);
    };
    element.addEventListener("touchstart", touchStart, { passive: true });
    element.addEventListener("touchmove", touchMove, { passive: false });
    element.addEventListener("touchend", touchEnd);
    element.addEventListener("touchcancel", touchEnd);
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchmove", touchMove);
      element.removeEventListener("touchend", touchEnd);
      element.removeEventListener("touchcancel", touchEnd);
      element.removeEventListener("wheel", wheel);
    };
  }, [
    unavailable,
    beginDrag,
    moveDrag,
    endDrag,
    prepareAudio,
    stop,
    position,
    settle,
    choose,
  ]);

  useEffect(
    () => () => {
      glide.current?.stop();
      clearTimeout(wheelTimer.current);
      tickPlayer.current?.dispose();
      tickPlayer.current = undefined;
    },
    [],
  );

  useEffect(() => {
    if (sound && !unavailable) return;
    tickPlayer.current?.dispose();
    tickPlayer.current = undefined;
  }, [sound, unavailable]);

  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (root.current?.hasPointerCapture(event.pointerId))
      root.current.releasePointerCapture(event.pointerId);
  };

  const rowClassName =
    "flex h-full items-center justify-center truncate px-3 font-medium [backface-visibility:hidden]";

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
      // The drum owns vertical drags, so a bottom sheet around it stays put.
      data-bottom-sheet-no-drag=""
      role="listbox"
      aria-label={ariaLabel}
      aria-disabled={unavailable || undefined}
      aria-activedescendant={selected ? `${id}-${index}` : undefined}
      tabIndex={unavailable ? -1 : 0}
      className={cn(
        "relative isolate w-40 min-w-0 touch-none select-none overflow-hidden rounded-3xl bg-card text-foreground text-sm outline-none ring-1 ring-foreground/10 [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-3",
        !unavailable && (grabbing ? "cursor-grabbing" : "cursor-grab"),
        unavailable && "opacity-50",
        className,
      )}
      style={{
        ...style,
        height: reducedMotion
          ? rowHeight * rows
          : Math.ceil(2 * drumRadius + rowHeight / 4),
        perspective: reducedMotion ? undefined : 1000,
      }}
      onClick={(event) => {
        onClick?.(event);
        // Mouse and touch taps select on release; this is the keyboardless
        // path for assistive technology activating an option.
        if (
          event.defaultPrevented ||
          unavailable ||
          event.detail !== 0 ||
          drag.current
        )
          return;
        const option = (event.target as Element).closest<HTMLElement>(
          "[data-wheel-option]",
        );
        if (option) {
          prepareAudio();
          select(Number(option.dataset.wheelOption));
        }
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
        prepareAudio();
        clearTimeout(wheelTimer.current);
        select(clamp(target, options.length - 1));
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
        const option = (event.target as Element).closest<HTMLElement>(
          "[data-wheel-option]",
        );
        beginDrag(
          event.pointerId,
          event.clientY,
          option ? Number(option.dataset.wheelOption) : undefined,
        );
        root.current?.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (event.defaultPrevented || drag.current?.pointer !== event.pointerId)
          return;
        moveDrag(event.clientY);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        if (drag.current?.pointer !== event.pointerId) return;
        releasePointer(event);
        endDrag(false);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        if (drag.current?.pointer !== event.pointerId) return;
        releasePointer(event);
        endDrag(true);
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        if (drag.current?.pointer === event.pointerId) endDrag(true);
      }}
    >
      {/* Dimmed rows on the drum; each sits on its accessible option. */}
      <div
        role="presentation"
        className="absolute inset-x-0 top-1/2 [transform-style:preserve-3d]"
        style={{ marginTop: -rowHeight / 2 }}
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
            className="absolute inset-x-0 top-0 [transform-style:preserve-3d]"
            style={{ height: rowHeight }}
          >
            <span
              aria-hidden="true"
              data-wheel-item={position}
              className={cn(rowClassName, "text-muted-foreground")}
            >
              {optionLabel(option)}
            </span>
          </div>
        ))}
      </div>
      {/* The centre row drawn crisp: the same drum clipped to one row, with a
          perspective centred where the main drum's is. */}
      <div
        aria-hidden="true"
        data-slot="wheel-picker-band"
        className="pointer-events-none absolute inset-x-1 top-1/2 z-10 -translate-y-1/2 overflow-hidden rounded-xl bg-foreground/5"
        style={{
          height: rowHeight,
          perspective: reducedMotion ? undefined : 1000,
        }}
      >
        <div className="absolute inset-x-[-0.25rem] top-0 [transform-style:preserve-3d]">
          {options.map((option, position) => (
            <span
              key={optionValue(option)}
              data-wheel-band-item={position}
              className={cn(
                rowClassName,
                "absolute inset-x-0 top-0 text-foreground",
              )}
              style={{ height: rowHeight }}
            >
              {optionLabel(option)}
            </span>
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
