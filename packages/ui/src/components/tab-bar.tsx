"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { gsap } from "gsap";
import { SearchIcon, XIcon } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type GlassProps, withGlass } from "../lib/glass/with-glass";
import { Button } from "./button";
import { type FeedbackOption, useFeedback } from "./feedback";

export type TabBarItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

const tabBarVariants = cva(
  // Equal tracks: every item takes the width of the largest one. The
  // selection's spring overshoots the last item for a moment, so the bar
  // scrolls without ever showing a scrollbar, as on iOS. Held, the lens may
  // pass the end, so the bar rises above the search button.
  "group/tab-bar relative isolate grid w-fit max-w-full touch-pan-y select-none auto-cols-fr grid-flow-col gap-1 overflow-x-auto overflow-y-hidden rounded-full bg-muted p-1 text-foreground glass:ring-1 glass:ring-foreground/5 [scrollbar-width:none] data-[pressed=true]:z-10 data-[pressed=true]:overflow-visible glass:dark:ring-foreground/10 [&::-webkit-scrollbar]:hidden",
  {
    variants: { size: { sm: "text-xs", default: "text-sm", lg: "text-sm" } },
    defaultVariants: { size: "default" },
  },
);
// As on iOS, items show no hover fill: the selection pill alone marks one, so
// the ghost button's hover is cleared.
const tabBarItemVariants = cva(
  "relative z-10 min-w-0 shrink-0 flex-col rounded-full font-medium transition-[background-color,box-shadow] hover:bg-transparent focus-visible:z-20 group-glass/tab-bar:active:translate-y-0 data-[active=true]:text-accent-foreground data-[active=true]:hover:text-accent-foreground group-data-[lens=false]/tab-bar:data-[active=true]:bg-foreground/8 group-data-[lens=false]/tab-bar:dark:data-[active=true]:bg-foreground/12 dark:hover:bg-transparent",
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

export type TabBarSearch = {
  /** Accessible name of the button and the field's placeholder fallback. */
  label?: string;
  icon?: ReactNode;
  /**
   * `"expand"` turns the button into a search field that takes the place
   * of the hidden bar; `"button"` only calls `onActivate`.
   */
  mode?: "expand" | "button";
  onActivate?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** Accessible name of the close button; `"Close search"` by default. */
  closeLabel?: string;
  /** Replaces the field shown while expanded. */
  render?: (state: { open: boolean; close: () => void }) => ReactNode;
};

export type TabBarProps = Omit<ComponentProps<"nav">, "children" | "onChange"> &
  VariantProps<typeof tabBarVariants> & {
    items: readonly TabBarItem[];
    value: string;
    onValueChange: (value: string) => void;
    onItemActivate?: (value: string) => void;
    feedback?: FeedbackOption;
    search?: TabBarSearch;
  } & GlassProps;

const Track = withGlass((props: ComponentProps<"div">) => <div {...props} />);
// The lens is Clear glass over the bar, with the bar's own Clear settings.
const Lens = withGlass((props: ComponentProps<"div">) => (
  <div data-glass-lens="" {...props} />
));
// A separate round bar on the trailing side, the height of the tab bar.
const searchVariants = cva(
  "relative isolate flex shrink-0 items-center overflow-hidden rounded-full bg-muted p-1 text-foreground glass:ring-1 glass:ring-foreground/5 glass:dark:ring-foreground/10",
  {
    variants: {
      size: { sm: "h-14 text-xs", default: "h-16 text-sm", lg: "h-18 text-sm" },
    },
    defaultVariants: { size: "default" },
  },
);
const searchButtonVariants = cva(
  "shrink-0 rounded-full hover:bg-transparent dark:hover:bg-transparent",
  {
    variants: {
      size: {
        sm: "size-12 [&_svg:not([class*='size-'])]:size-5",
        default: "size-14 [&_svg:not([class*='size-'])]:size-6",
        lg: "size-16 [&_svg:not([class*='size-'])]:size-7",
      },
    },
    defaultVariants: { size: "default" },
  },
);

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
  size = "default",
  glass: settings = false,
  frosted = false,
  feedback,
  className,
  search,
  ref,
  ...props
}: TabBarProps) {
  const trigger = useFeedback(feedback);
  const expandable = search !== undefined && search.mode !== "button";
  const [openState, setOpenState] = useState(search?.defaultOpen ?? false);
  const searchOpen = expandable && (search?.open ?? openState);
  const [queryState, setQueryState] = useState(search?.defaultValue ?? "");
  const query = search?.value ?? queryState;
  const searchBar = useRef<HTMLDivElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  // Closing from inside the field hands focus back to the search button.
  const restoreFocus = useRef(false);
  const setSearchOpen = (open: boolean) => {
    if (open) search?.onActivate?.();
    else {
      restoreFocus.current =
        searchBar.current?.contains(document.activeElement) ?? false;
    }
    const commit = () => {
      setOpenState(open);
      search?.onOpenChange?.(open);
    };
    const field = searchBar.current;
    if (open || !searchOpen || !field || reducedMotion.current) {
      commit();
      return;
    }
    // Closing reverses the reveal: the field folds back into the button
    // before the bar returns.
    const { inset, hidden } = buttonClip(field);
    gsap.to(field.firstElementChild, { opacity: 0, duration: 0.12 });
    gsap.fromTo(
      field,
      { clipPath: inset(0) },
      {
        clipPath: inset(hidden),
        duration: 0.28,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: commit,
      },
    );
  };
  const setQuery = (next: string) => {
    setQueryState(next);
    search?.onValueChange?.(next);
  };
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
    const tolerance = 24;
    if (
      (x >= rect.left && x <= rect.right) ||
      y < rect.top - tolerance ||
      y > rect.bottom + tolerance
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
      return Math.abs(bounds.left + bounds.width / 2 - x);
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
    trigger("medium");
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
  }, [value, size, signature, measure]);

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
        const position =
          ((pending.x - rect.left) * element.offsetWidth) / rect.width +
          element.scrollLeft;
        target.x = rubberBand(
          position - bounds.width / 2,
          (last ? last.offsetLeft + last.offsetWidth : element.scrollWidth) -
            bounds.width,
          bounds.width,
        );
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
  }, [bounds, animateIndicator]);
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

  // Starts closed, so a search open from the first render (defaultOpen or
  // controlled) still takes its width, without animating in.
  const searchShown = useRef(false);
  const searchMounted = useRef(false);
  useLayoutEffect(() => {
    const first = !searchMounted.current;
    searchMounted.current = true;
    if (searchShown.current === searchOpen) return;
    searchShown.current = searchOpen;
    const field = searchBar.current;
    const bar = track.current;
    const duration = reducedMotion.current || first ? 0 : 0.32;
    if (searchOpen && field && bar) {
      // Glass rebuilds its rim only once a resize settles, so the field takes
      // its final width at once and a rounded clip reveals it from the button.
      gsap.set(field, { width: openWidthOf(field, bar) });
      const { inset, hidden } = buttonClip(field);
      gsap.fromTo(
        field,
        { clipPath: inset(hidden) },
        {
          clipPath: inset(0),
          duration,
          ease: "power3.out",
          overwrite: true,
          clearProps: "clipPath",
        },
      );
      gsap.fromTo(
        field.firstElementChild,
        { opacity: 0 },
        { opacity: 1, duration: duration / 2, delay: duration / 4 },
      );
    } else if (bar && field) {
      gsap.killTweensOf(field);
      gsap.set(field, { clearProps: "width,clipPath" });
      if (restoreFocus.current) {
        restoreFocus.current = false;
        searchButton.current?.focus();
      }
      // The field is the button again; the bar fades back in, since fading
      // alone keeps its glass refraction undistorted.
      gsap.fromTo(
        bar,
        { opacity: 0 },
        {
          opacity: 1,
          duration,
          ease: "power3.out",
          overwrite: true,
          clearProps: "opacity",
        },
      );
    }
  }, [searchOpen]);

  // An open field follows the viewport, as when a phone rotates, measuring
  // once per frame however many resize events arrive.
  useEffect(() => {
    if (!searchOpen) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const field = searchBar.current;
      const bar = track.current;
      if (field && bar) gsap.set(field, { width: openWidthOf(field, bar) });
    };
    const resize = () => {
      frame ||= requestAnimationFrame(measure);
    };
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, [searchOpen]);

  if (!items.length) return null;
  return (
    <nav
      ref={ref}
      data-slot="tab-bar"
      {...props}
      className={cn(
        "w-fit max-w-full",
        search && "flex items-center gap-2",
        className,
      )}
    >
      <Track
        hidden={searchOpen}
        ref={track}
        data-slot="tab-bar-list"
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
          if (pending.active && item.value !== pending.value)
            trigger("selection", "tick");
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
              trigger("light");
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
          const [previousKey, nextKey] = rtl
            ? ["ArrowRight", "ArrowLeft"]
            : ["ArrowLeft", "ArrowRight"];
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
              if (item.value === value) return;
              onValueChange(item.value);
              trigger("selection");
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
      {search ? (
        <Track
          ref={searchBar}
          data-slot="tab-bar-search"
          data-open={searchOpen}
          glass={settings}
          frosted={frosted}
          className={searchVariants({ size })}
        >
          {searchOpen ? (
            <SearchField
              search={search}
              query={query}
              setQuery={setQuery}
              close={() => setSearchOpen(false)}
            />
          ) : (
            <Button
              ref={searchButton}
              type="button"
              variant="ghost"
              aria-label={search.label ?? "Search"}
              aria-expanded={expandable ? false : undefined}
              className={searchButtonVariants({ size })}
              onClick={() => {
                trigger("selection");
                if (expandable) setSearchOpen(true);
                else search.onActivate?.();
              }}
            >
              {search.icon ?? <SearchIcon />}
            </Button>
          )}
        </Track>
      ) : null}
    </nav>
  );
}

/**
 * The width the bar and the search button take together, which the open field
 * fills. The bar is hidden while the field is open, so it is shown for the
 * read, beside a field at the button's size, as when closed.
 */
function openWidthOf(field: HTMLElement, bar: HTMLElement) {
  const { hidden } = bar;
  const width = field.style.width;
  // The closed button is round: as wide as the field is tall.
  field.style.width = `${field.offsetHeight}px`;
  bar.hidden = false;
  const barWidth = bar.offsetWidth;
  bar.hidden = hidden;
  field.style.width = width;
  const gap =
    Number.parseFloat(
      getComputedStyle(field.parentElement ?? field).columnGap,
    ) || 0;
  return barWidth + gap + field.offsetHeight;
}

/** A rounded clip that shows only the button's place in the search field. */
function buttonClip(field: HTMLElement) {
  const rtl = getComputedStyle(field).direction === "rtl";
  return {
    hidden: Math.max(field.offsetWidth - field.offsetHeight, 0),
    inset: (amount: number) =>
      rtl
        ? `inset(0px ${amount}px 0px 0px round 9999px)`
        : `inset(0px 0px 0px ${amount}px round 9999px)`,
  };
}

function SearchField({
  search,
  query,
  setQuery,
  close,
}: {
  search: TabBarSearch;
  query: string;
  setQuery: (value: string) => void;
  close: () => void;
}) {
  if (search.render) return search.render({ open: true, close });
  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2 ps-3"
      onSubmit={(event) => {
        event.preventDefault();
        search.onSubmit?.(query);
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex text-muted-foreground [&_svg]:size-5"
      >
        {search.icon ?? <SearchIcon />}
      </span>
      <input
        // biome-ignore lint/a11y/noAutofocus: the field opens on request.
        autoFocus
        type="search"
        aria-label={search.label ?? "Search"}
        placeholder={search.placeholder ?? search.label ?? "Search"}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          close();
        }}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={search.closeLabel ?? "Close search"}
        className="shrink-0 rounded-full"
        onClick={close}
      >
        <XIcon />
      </Button>
    </form>
  );
}
