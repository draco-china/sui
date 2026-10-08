"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useGlassEnabled, withGlass } from "../lib/glass/context";
import { Button } from "./button";

export type TabBarItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

const tabBarVariants = cva(
  "group/tab-bar relative isolate flex w-fit max-w-full gap-1 overflow-auto rounded-full bg-muted p-1 text-muted-foreground transition-[scale] duration-200 ease-out data-[orientation=vertical]:flex-col data-[pressed=true]:overflow-visible motion-reduce:scale-100 motion-reduce:transform-none motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.03]",
  {
    variants: { size: { sm: "text-xs", default: "text-sm", lg: "text-sm" } },
    defaultVariants: { size: "default" },
  },
);
const tabBarItemVariants = cva(
  "relative z-10 min-w-0 shrink-0 flex-col rounded-full font-medium transition-[background-color,box-shadow] hover:bg-accent focus-visible:z-20 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:hover:text-primary group-data-[glass=true]/tab-bar:data-[active=true]:bg-primary/10 group-data-[lens=true]/tab-bar:data-[active=true]:bg-transparent group-data-[glass=true]/tab-bar:active:translate-y-0",
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
    glass?: boolean;
  };

const Track = withGlass((props: ComponentProps<"div">) => <div {...props} />);
const Lens = withGlass((props: ComponentProps<"div">) => <div {...props} />);
const indicatorVariants = cva(
  "pointer-events-none absolute top-0 left-0 z-0 rounded-full transition-[translate,width,height,box-shadow] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-[pressed=true]:shadow-lg motion-reduce:transition-none",
  {
    variants: {
      glass: {
        false: "bg-primary/10",
        true: "bg-primary/10 backdrop-blur-[7px]",
      },
    },
    defaultVariants: { glass: false },
  },
);

function TabBarImplementation({
  items,
  value,
  onValueChange,
  onItemActivate,
  orientation = "horizontal",
  size = "default",
  className,
  ref,
  ...props
}: TabBarProps) {
  const track = useRef<HTMLDivElement>(null);
  const glass = useGlassEnabled();
  const [heldValue, setHeldValue] = useState<string | null>(null);
  const [heldPosition, setHeldPosition] = useState<number | null>(null);
  const hold = useRef<{
    pointerId: number;
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
    setHeldPosition(null);
    if (pending && track.current?.hasPointerCapture?.(pending.pointerId))
      track.current.releasePointerCapture(pending.pointerId);
  }, []);
  useEffect(() => {
    window.addEventListener("blur", cancelHold);
    return () => {
      window.removeEventListener("blur", cancelHold);
      if (hold.current?.timer) clearTimeout(hold.current.timer);
    };
  }, [cancelHold]);
  function activateHold() {
    const pending = hold.current;
    const element = track.current;
    if (!pending || !element) return;
    if (pending.timer) clearTimeout(pending.timer);
    pending.timer = null;
    pending.active = true;
    element.setPointerCapture?.(pending.pointerId);
    const rect = element.getBoundingClientRect();
    setHeldPosition(
      orientation === "vertical"
        ? ((pending.y - rect.top) * element.offsetHeight) / rect.height +
            element.scrollTop
        : ((pending.x - rect.left) * element.offsetWidth) / rect.width +
            element.scrollLeft,
    );
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
      '[data-active="true"]',
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

  if (!items.length) return null;
  const pressed = heldValue !== null;
  const lensPosition = { x: bounds?.x ?? 0, y: bounds?.y ?? 0 };
  if (pressed) {
    lensPosition.x -= 5;
    lensPosition.y -= 9;
  }
  if (bounds && heldPosition !== null) {
    if (orientation === "horizontal")
      lensPosition.x =
        Math.max(
          4,
          Math.min(
            (track.current?.scrollWidth ?? 0) - bounds.width - 4,
            heldPosition - bounds.width / 2,
          ),
        ) - 5;
    else if (orientation === "vertical")
      lensPosition.y =
        Math.max(
          4,
          Math.min(
            (track.current?.scrollHeight ?? 0) - bounds.height - 4,
            heldPosition - bounds.height / 2,
          ),
        ) - 9;
  }
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
        data-glass={glass ? "true" : undefined}
        className={tabBarVariants({ size })}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || hold.current) return;
          const button = (
            event.target as HTMLElement
          ).closest<HTMLButtonElement>("button[data-tab-bar-item]");
          if (!button || button.disabled) return;
          const item = items[Number(button.dataset.tabBarItem)];
          if (!item) return;
          suppressClick.current = false;
          const pending = {
            pointerId: event.pointerId,
            value: item.value,
            active: false,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
            timer: null as ReturnType<typeof setTimeout> | null,
          };
          hold.current = pending;
          track.current?.setPointerCapture?.(pending.pointerId);
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
          if (pending.active && track.current) {
            const rect = track.current.getBoundingClientRect();
            setHeldPosition(
              orientation === "vertical"
                ? ((pending.y - rect.top) * track.current.offsetHeight) /
                    rect.height +
                    track.current.scrollTop
                : ((pending.x - rect.left) * track.current.offsetWidth) /
                    rect.width +
                    track.current.scrollLeft,
            );
          }
          const button = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLButtonElement>("button[data-tab-bar-item]");
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
          {
            suppressClick.current = true;
            const button = document
              .elementFromPoint(event.clientX, event.clientY)
              ?.closest<HTMLButtonElement>("button[data-tab-bar-item]");
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
        onLostPointerCapture={cancelHold}
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
            glass={false}
            type="button"
            variant="ghost"
            disabled={item.disabled}
            data-tab-bar-item={index}
            data-active={item.value === value && !item.disabled}
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
            <span className="pointer-events-none flex flex-col items-center gap-1 transition-transform duration-200 group-data-[held=true]/button:scale-120 motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:group-hover/button:scale-110">
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
          data-slot="tab-bar-selection"
          aria-hidden="true"
          className={indicatorVariants({ glass })}
          style={{
            translate: `${bounds?.x ?? 0}px ${bounds?.y ?? 0}px`,
            width: bounds?.width ?? 0,
            height: bounds?.height ?? 0,
            visibility: bounds && !pressed ? "visible" : "hidden",
          }}
        />
        <Lens
          glass={glass && pressed}
          glassMaterial="clear"
          data-slot="tab-bar-indicator"
          data-pressed={pressed}
          aria-hidden="true"
          className={indicatorVariants({ glass })}
          style={{
            translate: `${lensPosition.x}px ${lensPosition.y}px`,
            width: (bounds?.width ?? 0) + (pressed ? 10 : 0),
            height: (bounds?.height ?? 0) + (pressed ? 18 : 0),
            visibility: bounds && pressed ? "visible" : "hidden",
          }}
        />
      </Track>
    </nav>
  );
}

export const TabBar = withGlass(TabBarImplementation, "scope");
