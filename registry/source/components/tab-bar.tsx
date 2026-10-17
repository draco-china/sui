"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { gsap } from "gsap";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type GlassProps, withGlass } from "@/lib/glass/with-glass";
import { Button } from "@/components/ui/button";

export type TabBarItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

const tabBarVariants = cva(
  // Equal tracks: every item takes the width (or height) of the largest one.
  "group/tab-bar relative isolate grid w-fit max-w-full touch-pan-y select-none auto-cols-fr grid-flow-col gap-1 overflow-auto rounded-full bg-muted p-1 text-foreground glass:ring-1 glass:ring-foreground/5 data-[orientation=vertical]:touch-pan-x data-[orientation=vertical]:grid-flow-row data-[orientation=vertical]:auto-rows-fr data-[pressed=true]:overflow-visible glass:dark:ring-foreground/10",
  {
    variants: { size: { sm: "text-xs", default: "text-sm", lg: "text-sm" } },
    defaultVariants: { size: "default" },
  },
);
// As on iOS, items show no hover fill: the selection pill alone marks one, so
// the ghost button's hover is cleared.
const tabBarItemVariants = cva(
  "relative z-10 min-w-0 shrink-0 flex-col rounded-full font-medium transition-[background-color,box-shadow] hover:bg-transparent focus-visible:z-20 group-glass/tab-bar:active:translate-y-0 data-[active=true]:bg-foreground/8 data-[active=true]:text-primary data-[active=true]:hover:text-primary group-data-[lens=true]/tab-bar:data-[active=true]:bg-transparent dark:data-[active=true]:bg-foreground/12 dark:hover:bg-transparent",
  {
    variants: {
      size: {
        sm: "h-12 min-w-20 gap-1 px-3 text-xs [&_svg]:size-4",
        default: "h-14 min-w-22 gap-1 px-4 text-xs [&_svg]:size-5",
        lg: "h-16 min-w-26 gap-1.5 px-5 text-sm [&_svg]:size-6",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export type TabBarProps = Omit<ComponentProps<"nav">, "children" | "onChange"> &
  VariantProps<typeof tabBarVariants> & {
    items: readonly TabBarItem[];
    value: string;
    onValueChange: (value: string) => void;
    onItemActivate?: (value: string) => void;
    orientation?: "horizontal" | "vertical";
  } & GlassProps;

const Track = withGlass((props: ComponentProps<"div">) => <div {...props} />);
// The lens is Clear glass over the bar, with the bar's own Clear settings.
const Lens = withGlass((props: ComponentProps<"div">) => (
  <div data-glass-lens="" {...props} />
));
const indicatorVariants = cva(
  "pointer-events-none absolute top-0 left-0 z-0 rounded-full data-[pressed=true]:shadow-lg",
  {
    // A neutral selection pill, as on iOS; only the icon and label take the
    // theme color.
    variants: {
      glass: {
        false: "bg-foreground/8 dark:bg-foreground/12",
        true: "bg-foreground/8 backdrop-blur-[7px] dark:bg-foreground/12",
      },
    },
    defaultVariants: { glass: false },
  },
);

export function TabBar({
  items,
  value,
  onValueChange,
  onItemActivate,
  orientation = "horizontal",
  size = "default",
  glass: settings = false,
  frosted = false,
  className,
  ref,
  ...props
}: TabBarProps) {
  const track = useRef<HTMLDivElement>(null);
  const glass = settings !== false || frosted;
  const [heldValue, setHeldValue] = useState<string | null>(null);
  const selection = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);
  const selectionMotion = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const lensMotion = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const initialized = useRef(false);
  const moveLens = useRef<(duration?: number) => void>(() => {});
  const hold = useRef<{
    pointerId: number;
    capture: boolean;
    value: string;
    timer: ReturnType<typeof setTimeout> | null;
    active: boolean;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const cancelHold = useCallback(() => {
    const pending = hold.current;
    if (pending?.timer) clearTimeout(pending.timer);
    hold.current = null;
    setHeldValue(null);
    if (
      pending?.capture &&
      track.current?.hasPointerCapture?.(pending.pointerId)
    )
      track.current.releasePointerCapture(pending.pointerId);
  }, []);
  useEffect(() => {
    window.addEventListener("blur", cancelHold);
    return () => {
      window.removeEventListener("blur", cancelHold);
      if (hold.current?.timer) clearTimeout(hold.current.timer);
    };
  }, [cancelHold]);
  /**
   * The item under the pointer. While held, a pointer past either end of the
   * bar, within a short distance of it, keeps the nearest end item.
   */
  function heldItem(x: number, y: number, held: boolean) {
    const element = track.current;
    const hit = document
      .elementFromPoint(x, y)
      ?.closest<HTMLButtonElement>("button[data-tab-bar-item]");
    if (!element || (hit && element.contains(hit))) return hit ?? null;
    if (!held) return null;
    const rect = element.getBoundingClientRect();
    const horizontal = orientation === "horizontal";
    const tolerance = 24;
    const along = horizontal ? x : y;
    const across = horizontal ? y : x;
    const [start, end] = horizontal
      ? [rect.left, rect.right]
      : [rect.top, rect.bottom];
    const [near, far] = horizontal
      ? [rect.top, rect.bottom]
      : [rect.left, rect.right];
    if (
      (along >= start && along <= end) ||
      across < near - tolerance ||
      across > far + tolerance
    )
      return null;
    // Past either end, one of the end items is nearest; comparing positions
    // also covers right-to-left layouts.
    const items = element.querySelectorAll<HTMLButtonElement>(
      "button[data-tab-bar-item]",
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return null;
    const distance = (button: HTMLButtonElement) => {
      const bounds = button.getBoundingClientRect();
      const center = horizontal
        ? bounds.left + bounds.width / 2
        : bounds.top + bounds.height / 2;
      return Math.abs(center - along);
    };
    return distance(first) <= distance(last) ? first : last;
  }
  function activateHold() {
    const pending = hold.current;
    const element = track.current;
    if (!pending || !element) return;
    if (pending.timer) clearTimeout(pending.timer);
    pending.timer = null;
    pending.active = true;
    if (pending.capture) element.setPointerCapture?.(pending.pointerId);
    moveLens.current();
    setHeldValue(pending.value);
  }
  const [bounds, setBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const activeIndex = items.findIndex(
    (item) => item.value === value && !item.disabled,
  );
  const firstEnabled = items.findIndex((item) => !item.disabled);
  const [focused, setFocused] = useState<string | null>(null);
  const focusIndex = items.findIndex(
    (item) => item.value === focused && !item.disabled,
  );
  let tabIndex = firstEnabled;
  if (activeIndex >= 0) tabIndex = activeIndex;
  if (focusIndex >= 0) tabIndex = focusIndex;
  const signature = items
    .map((item) => `${item.value}:${Boolean(item.disabled)}`)
    .join("\0");
  const measure = useCallback(() => {
    const button = track.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    const next = button
      ? {
          x: button.offsetLeft,
          y: button.offsetTop,
          width: button.offsetWidth,
          height: button.offsetHeight,
        }
      : null;
    setBounds((previous) =>
      previous?.x === next?.x &&
      previous?.y === next?.y &&
      previous?.width === next?.width &&
      previous?.height === next?.height
        ? previous
        : next,
    );
  }, []);

  useLayoutEffect(() => {
    void value;
    void orientation;
    void size;
    void signature;
    measure();
    const element = track.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const button of element.querySelectorAll("button"))
      observer.observe(button);
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [value, orientation, size, signature, measure]);

  const pressed = heldValue !== null;
  const animateIndicator = useCallback(
    (
      element: HTMLDivElement | null,
      state: { x: number; y: number; width: number; height: number },
      target: typeof state,
      duration: number,
      ease: string,
    ) => {
      if (!element) return;
      gsap.killTweensOf(state);
      if (element === lens.current)
        element.dataset.glassMotion = String(
          Boolean(hold.current?.active) &&
            !reducedMotion.current &&
            duration > 0,
        );
      const finish = () => {
        if (element === lens.current) element.dataset.glassMotion = "false";
      };
      gsap.to(state, {
        ...target,
        duration: reducedMotion.current ? 0 : duration,
        ease,
        overwrite: true,
        onComplete: finish,
        onInterrupt: finish,
        onUpdate: () => {
          element.style.translate = `${state.x}px ${state.y}px`;
          element.style.width = `${state.width}px`;
          element.style.height = `${state.height}px`;
        },
      });
    },
    [],
  );
  useLayoutEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = preference.matches;
    const update = () => {
      reducedMotion.current = preference.matches;
      if (preference.matches) {
        for (const state of [selectionMotion.current, lensMotion.current])
          for (const tween of gsap.getTweensOf(state)) tween.progress(1).kill();
      }
      for (const element of track.current?.querySelectorAll<HTMLElement>(
        "[data-tab-bar-content]",
      ) ?? []) {
        gsap.killTweensOf(element);
        gsap.set(element, {
          scale:
            !preference.matches &&
            element.parentElement?.dataset.held === "true"
              ? 1.2
              : 1,
        });
      }
    };
    preference.addEventListener("change", update);
    const selectionState = selectionMotion.current;
    const lensState = lensMotion.current;
    const element = track.current;
    return () => {
      preference.removeEventListener("change", update);
      gsap.killTweensOf(selectionState);
      gsap.killTweensOf(lensState);
      if (element)
        gsap.killTweensOf(element.querySelectorAll("[data-tab-bar-content]"));
      if (lens.current) lens.current.dataset.glassMotion = "false";
    };
  }, []);
  useLayoutEffect(() => {
    if (!bounds) return;
    // Past either end the lens keeps following with rubber-band resistance,
    // like iOS, and its edge passes the bar by at most half its held size.
    // Held, it grows 5px on each side from 4px inside the bar, so it already
    // sits 1px past the edge at rest.
    const rubberBand = (value: number, max: number, size: number) => {
      const min = 4;
      const range = (size + 10) / 2 - 1;
      const resist = (distance: number) =>
        range * (1 - 1 / ((distance * 0.55) / range + 1));
      if (value < min) return min - resist(min - value);
      if (value > max) return max + resist(value - max);
      return value;
    };
    moveLens.current = (duration = 0.08) => {
      const pending = hold.current;
      const element = track.current;
      const target = { ...bounds };
      // The held bar lets the lens overflow, which would grow scrollWidth
      // with the lens itself, so the content ends at the last item.
      const items =
        element?.querySelectorAll<HTMLElement>("[data-tab-bar-item]") ?? [];
      const last = items[items.length - 1];
      if (pending?.active && element) {
        const rect = element.getBoundingClientRect();
        if (orientation === "horizontal") {
          const position =
            ((pending.x - rect.left) * element.offsetWidth) / rect.width +
            element.scrollLeft;
          target.x = rubberBand(
            position - bounds.width / 2,
            (last ? last.offsetLeft + last.offsetWidth : element.scrollWidth) -
              bounds.width,
            bounds.width,
          );
        } else {
          const position =
            ((pending.y - rect.top) * element.offsetHeight) / rect.height +
            element.scrollTop;
          target.y = rubberBand(
            position - bounds.height / 2,
            (last ? last.offsetTop + last.offsetHeight : element.scrollHeight) -
              bounds.height,
            bounds.height,
          );
        }
        target.x -= 5;
        target.y -= 9;
        target.width += 10;
        target.height += 18;
      }
      animateIndicator(
        lens.current,
        lensMotion.current,
        target,
        duration,
        "power2.out",
      );
    };
    animateIndicator(
      selection.current,
      selectionMotion.current,
      bounds,
      initialized.current ? 0.5 : 0,
      "elastic.out(1,0.68)",
    );
    initialized.current = true;
    moveLens.current();
  }, [bounds, orientation, animateIndicator]);
  useLayoutEffect(() => {
    moveLens.current(0.18);
    for (const button of track.current?.querySelectorAll<HTMLButtonElement>(
      "[data-tab-bar-item]",
    ) ?? []) {
      const content = button.querySelector("[data-tab-bar-content]");
      if (!content) continue;
      gsap.to(content, {
        scale:
          heldValue !== null &&
          button.dataset.held === "true" &&
          !reducedMotion.current
            ? 1.2
            : 1,
        duration: reducedMotion.current ? 0 : 0.18,
        ease: "power3.out",
        overwrite: true,
      });
    }
  }, [heldValue]);

  if (!items.length) return null;
  return (
    <nav
      ref={ref}
      data-slot="tab-bar"
      {...props}
      className={cn("w-fit max-w-full", className)}
    >
      <Track
        ref={track}
        data-slot="tab-bar-list"
        data-orientation={orientation}
        data-lens={Boolean(bounds)}
        data-pressed={pressed}
        data-glass-frozen={pressed}
        glass={settings}
        frosted={frosted}
        className={tabBarVariants({ size })}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || hold.current) return;
          const button = (
            event.target as HTMLElement
          ).closest<HTMLButtonElement>("button[data-tab-bar-item]");
          if (!button || button.disabled) return;
          const item = items[Number(button.dataset.tabBarItem)];
          if (!item) return;
          event.preventDefault();
          if (event.isTrusted)
            button.focus({ preventScroll: true, focusVisible: false });
          suppressClick.current = false;
          const pending = {
            pointerId: event.pointerId,
            capture: event.isTrusted,
            value: item.value,
            active: false,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
            timer: null as ReturnType<typeof setTimeout> | null,
          };
          hold.current = pending;
          pending.timer = setTimeout(() => {
            if (hold.current !== pending) return;
            activateHold();
          }, 250);
        }}
        onPointerMove={(event) => {
          const pending = hold.current;
          if (!pending || pending.pointerId !== event.pointerId) return;
          pending.x = event.clientX;
          pending.y = event.clientY;
          if (
            !pending.active &&
            Math.hypot(
              pending.x - pending.startX,
              pending.y - pending.startY,
            ) >= 6
          )
            activateHold();
          if (pending.active) moveLens.current();
          const button = heldItem(event.clientX, event.clientY, pending.active);
          if (!button || !track.current?.contains(button) || button.disabled) {
            if (!pending.active) cancelHold();
            return;
          }
          const item = items[Number(button.dataset.tabBarItem)];
          if (!item) return;
          if (!pending.active && item.value !== pending.value) {
            cancelHold();
            return;
          }
          pending.value = item.value;
          if (pending.active) setHeldValue(item.value);
        }}
        onPointerUp={(event) => {
          const pending = hold.current;
          if (!pending || pending.pointerId !== event.pointerId) return;
          if (pending.active) {
            suppressClick.current = true;
            const button = heldItem(event.clientX, event.clientY, true);
            const item = button && items[Number(button.dataset.tabBarItem)];
            if (
              button &&
              track.current?.contains(button) &&
              item &&
              !item.disabled
            ) {
              onItemActivate?.(item.value);
              if (item.value !== value) onValueChange(item.value);
            }
          }
          cancelHold();
        }}
        onPointerCancel={cancelHold}
        onDragStart={(event) => event.preventDefault()}
        onLostPointerCapture={(event) => {
          if (event.target === track.current) cancelHold();
        }}
        onContextMenu={(event) => {
          if (hold.current?.active) event.preventDefault();
        }}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail > 0) {
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
            return;
          const button = (
            event.target as HTMLElement
          ).closest<HTMLButtonElement>("button[data-tab-bar-item]");
          if (!button || !track.current?.contains(button)) return;
          const current = Number(button.dataset.tabBarItem);
          const enabled = items
            .map((item, index) => (item.disabled ? -1 : index))
            .filter((index) => index >= 0);
          let next: number | undefined;
          const rtl = getComputedStyle(track.current).direction === "rtl";
          const horizontalKeys = rtl
            ? ["ArrowRight", "ArrowLeft"]
            : ["ArrowLeft", "ArrowRight"];
          const [previousKey, nextKey] =
            orientation === "vertical"
              ? ["ArrowUp", "ArrowDown"]
              : horizontalKeys;
          if (event.key === "Home") next = enabled[0];
          else if (event.key === "End") next = enabled.at(-1);
          else if (event.key === previousKey || event.key === nextKey) {
            const direction = event.key === nextKey ? 1 : -1;
            const position = enabled.indexOf(current);
            next =
              enabled[(position + direction + enabled.length) % enabled.length];
          }
          if (next === undefined) return;
          event.preventDefault();
          const destination = track.current.querySelector<HTMLButtonElement>(
            `button[data-tab-bar-item="${next}"]`,
          );
          destination?.focus();
          destination?.scrollIntoView?.({
            block: "nearest",
            inline: "nearest",
          });
        }}
      >
        {items.map((item, index) => (
          <Button
            key={item.value}
            type="button"
            variant="ghost"
            disabled={item.disabled}
            data-tab-bar-item={index}
            data-active={item.value === (heldValue ?? value) && !item.disabled}
            aria-current={
              item.value === value && !item.disabled ? "page" : undefined
            }
            tabIndex={index === tabIndex ? 0 : -1}
            className={tabBarItemVariants({ size })}
            data-held={heldValue === item.value}
            onFocus={() => setFocused(item.value)}
            onClick={() => {
              if (item.disabled) return;
              onItemActivate?.(item.value);
              if (item.value !== value) onValueChange(item.value);
            }}
          >
            <span
              data-tab-bar-content=""
              className="pointer-events-none flex select-none flex-col items-center gap-1"
            >
              {item.icon ? (
                <span aria-hidden="true" className="inline-flex">
                  {item.icon}
                </span>
              ) : null}
              <span className="max-w-28 truncate">{item.label}</span>
            </span>
          </Button>
        ))}
        <div
          ref={selection}
          data-slot="tab-bar-selection"
          data-glass-decoration=""
          aria-hidden="true"
          className={indicatorVariants({ glass })}
          style={{
            translate: "0px 0px",
            width: 0,
            height: 0,
            visibility: bounds && !pressed ? "visible" : "hidden",
          }}
        />
        <Lens
          ref={lens}
          glass={glass && pressed && (settings || true)}
          data-slot="tab-bar-indicator"
          data-pressed={pressed}
          aria-hidden="true"
          className={indicatorVariants({ glass })}
          style={{
            translate: "0px 0px",
            width: 0,
            height: 0,
            visibility: bounds && pressed ? "visible" : "hidden",
          }}
        />
      </Track>
    </nav>
  );
}
