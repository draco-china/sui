"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { Button } from "@workspace/ui/components/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";
import {
  cancelFrame,
  frame,
  motion,
  useReducedMotion,
  useSpring,
} from "motion/react";
import * as React from "react";
import { withGlass } from "../lib/glass/with-glass";
import { type FeedbackOption, useFeedback } from "./feedback";

/** Whether trigger icons show on every tab or only on the selected one. */
type TabsIconDisplay = "always" | "selected";

const TabsContext = React.createContext<{
  orientation: TabsPrimitive.Root.Orientation;
  icons: TabsIconDisplay;
}>({ orientation: "horizontal", icons: "always" });

// Critically damped, so a scrollable list never gains a transient scroll
// range while the indicator glides to an edge tab.
const indicatorSpring = { stiffness: 500, damping: 45, mass: 1 };
// Icons trading places beside a label as the selection moves.
const iconSpring = {
  type: "spring",
  stiffness: 460,
  damping: 30,
  mass: 0.55,
} as const;
const closedClip = "inset(0 100% 0 0)";

function Tabs({
  className,
  orientation = "horizontal",
  icons = "always",
  feedback,
  onValueChange,
  ...props
}: TabsPrimitive.Root.Props & {
  feedback?: FeedbackOption;
  /**
   * With "selected", a trigger's `icon` springs open only on the selected tab
   * and folds away when another is chosen.
   */
  icons?: TabsIconDisplay;
}) {
  const context = React.useMemo(
    () => ({ orientation, icons }),
    [orientation, icons],
  );
  const trigger = useFeedback(feedback);
  return (
    <TabsContext.Provider value={context}>
      <TabsPrimitive.Root
        data-slot="tabs"
        orientation={orientation}
        className={(state) =>
          cn(
            "group/tabs flex min-h-0 min-w-0 gap-2 data-horizontal:flex-col",
            typeof className === "function" ? className(state) : className,
          )
        }
        onValueChange={(value, eventDetails) => {
          onValueChange?.(value, eventDetails);
          trigger("selection");
        }}
        {...props}
      />
    </TabsContext.Provider>
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit min-w-full shrink-0 items-center justify-center p-1 text-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-full bg-muted group-data-vertical/tabs:rounded-2xl",
        line: "gap-1 rounded-none bg-transparent",
        segment: "rounded-lg bg-muted p-0.5",
        /** The pill indicator without the muted track, for side menus. */
        ghost:
          "gap-1.5 rounded-full bg-transparent group-data-vertical/tabs:rounded-2xl",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/** Cancels the trigger's flex gap while a selected-only icon is folded. */
const iconCollapse = "-0.5rem";

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

type IndicatorTrack = Record<
  "x" | "y" | "width" | "height",
  ReturnType<typeof useSpring>
>;

/** The line indicator keeps its CSS thickness and follows one axis. */
function indicatorStyle(
  variant: VariantProps<typeof tabsListVariants>["variant"],
  vertical: boolean,
  { x, y, width, height }: IndicatorTrack,
) {
  if (variant !== "line") return { x, y, width, height };
  if (vertical) return { y, height };
  return { x, width };
}

function TabsListImplementation({
  className,
  wrapperClassName,
  indicatorClassName,
  variant = "default",
  scrollLabels,
  children,
  ref,
  ...props
}: TabsPrimitive.List.Props &
  VariantProps<typeof tabsListVariants> & {
    wrapperClassName?: string;
    indicatorClassName?: string;
    /** Accessible names for the overflow scroll buttons. */
    scrollLabels?: {
      up?: string;
      down?: string;
      left?: string;
      right?: string;
    };
  }) {
  const { orientation } = React.useContext(TabsContext);
  const vertical = orientation === "vertical";
  const reducedMotion = useReducedMotion();
  const x = useSpring(0, indicatorSpring);
  const y = useSpring(0, indicatorSpring);
  const width = useSpring(0, indicatorSpring);
  const height = useSpring(0, indicatorSpring);
  const [placed, setPlaced] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [list, setList] = React.useState<HTMLDivElement | null>(null);
  const viewportId = React.useId();
  // Edges are physical: left/right in either text direction, or top/bottom.
  const [edges, setEdges] = React.useState({
    overflow: false,
    start: false,
    end: false,
  });

  const listRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setList(node);
      const cleanup = typeof ref === "function" ? ref(node) : undefined;
      if (ref && typeof ref !== "function") ref.current = node;
      return () => {
        setList(null);
        if (typeof cleanup === "function") cleanup();
        else if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    },
    [ref],
  );

  const getScrollState = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const size = vertical ? viewport.clientHeight : viewport.clientWidth;
    const max = Math.max(
      0,
      (vertical ? viewport.scrollHeight : viewport.scrollWidth) - size,
    );
    const rtl = !vertical && getComputedStyle(viewport).direction === "rtl";
    let position = viewport.scrollLeft;
    if (vertical) position = viewport.scrollTop;
    else if (rtl) position += max;
    return {
      viewport,
      size,
      max,
      position: Math.max(0, Math.min(max, position)),
    };
  }, [vertical]);

  const measure = React.useCallback(() => {
    const state = getScrollState();
    if (!state) return;
    const next = {
      overflow: state.max > 1,
      start: state.position > 1,
      end: state.position < state.max - 1,
    };
    setEdges((previous) =>
      previous.overflow === next.overflow &&
      previous.start === next.start &&
      previous.end === next.end
        ? previous
        : next,
    );
  }, [getScrollState]);

  const reveal = React.useCallback(
    (tab: HTMLElement | null) => {
      const state = getScrollState();
      if (!state || !tab || state.max <= 1) return;
      const bounds = state.viewport.getBoundingClientRect();
      const item = tab.getBoundingClientRect();
      const start =
        (vertical ? bounds.top : bounds.left) + (state.position > 1 ? 36 : 0);
      const end =
        (vertical ? bounds.bottom : bounds.right) -
        (state.position < state.max - 1 ? 36 : 0);
      const itemStart = vertical ? item.top : item.left;
      const itemEnd = vertical ? item.bottom : item.right;
      // A label wider than the usable viewport is aligned at its leading edge.
      let delta = 0;
      if (itemStart < start || itemEnd - itemStart > end - start)
        delta = itemStart - start;
      else if (itemEnd > end) delta = itemEnd - end;
      if (Math.abs(delta) > 1)
        state.viewport.scrollBy({
          [vertical ? "top" : "left"]: delta,
          behavior: reducedMotion ? "instant" : "smooth",
        });
    },
    [getScrollState, reducedMotion, vertical],
  );

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    const viewport = viewportRef.current;
    if (!wrapper || !viewport || !list) return;
    let pending = 0;
    let revealSelection = false;
    // Label overlays in list coordinates, cached so clip syncing never reads
    // layout while the indicator glides.
    type Box = Record<"left" | "top" | "width" | "height", number> & {
      right: number;
      bottom: number;
    };
    let labels: { element: HTMLElement; box: Box }[] = [];
    const syncClips = () => {
      const pill = {
        left: x.get(),
        top: y.get(),
        right: x.get() + width.get(),
        bottom: y.get() + height.get(),
      };
      for (const { element, box } of labels) {
        const left = clamp(pill.left - box.left, box.width);
        const right = clamp(box.right - pill.right, box.width);
        const top = clamp(pill.top - box.top, box.height);
        const bottom = clamp(box.bottom - pill.bottom, box.height);
        const clip =
          left + right >= box.width || top + bottom >= box.height
            ? closedClip
            : `inset(${top}px ${right}px ${bottom}px ${left}px)`;
        if (element.style.clipPath !== clip) element.style.clipPath = clip;
      }
    };
    const scheduleClips = () => frame.render(syncClips);
    const place = () => {
      const selected = list.querySelector<HTMLElement>(
        '[role="tab"][data-active]',
      );
      if (!selected) {
        setPlaced(false);
        return;
      }
      const origin = list.getBoundingClientRect();
      const relative = (element: Element): Box => {
        const rect = element.getBoundingClientRect();
        const left = rect.left - origin.left - list.clientLeft;
        const top = rect.top - origin.top - list.clientTop;
        return {
          left,
          top,
          width: rect.width,
          height: rect.height,
          right: left + rect.width,
          bottom: top + rect.height,
        };
      };
      // A selected-only icon grows its tab as it opens. Measure where the tabs
      // settle, every icon open or folded, so the indicator springs straight
      // there instead of squeezing along with the icon.
      const icons = Array.from(
        list.querySelectorAll<HTMLElement>(
          '[data-slot="tabs-trigger-icon"][data-display="selected"]',
        ),
      );
      const saved = icons.map((icon) => [
        icon.style.width,
        icon.style.marginInlineEnd,
      ]);
      for (const icon of icons) {
        const open = icon.closest('[role="tab"]') === selected;
        icon.style.width = open ? "auto" : "0px";
        icon.style.marginInlineEnd = open ? "0px" : iconCollapse;
      }
      const box = relative(selected);
      labels = Array.from(
        list.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger-label"]'),
        (element) => ({ element, box: relative(element) }),
      );
      icons.forEach((icon, index) => {
        [icon.style.width, icon.style.marginInlineEnd] = saved[index];
      });
      // A hidden list has nothing to measure; it is placed once it has a size.
      if (box.width === 0 && box.height === 0) return;
      // The first placement, or one after the list was hidden, lands in place.
      const instant = Boolean(reducedMotion) || width.get() === 0;
      const target = {
        x: box.left,
        y: box.top,
        width: box.width,
        height: box.height,
      };
      for (const [value, next] of [
        [x, target.x],
        [y, target.y],
        [width, target.width],
        [height, target.height],
      ] as const) {
        if (instant) value.jump(next);
        else value.set(next);
      }
      setPlaced(true);
      scheduleClips();
    };
    const unsubscribe = [x, y, width, height].map((value) =>
      value.on("change", scheduleClips),
    );
    const update = (selectionChanged = false) => {
      revealSelection ||= selectionChanged;
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        measure();
        const selected = list.querySelector<HTMLElement>(
          '[role="tab"][data-active]',
        );
        const focused = list.ownerDocument.activeElement;
        const focusedTab =
          focused instanceof HTMLElement &&
          list.contains(focused) &&
          focused.getAttribute("role") === "tab"
            ? focused
            : null;
        reveal(revealSelection ? selected : (focusedTab ?? selected));
        revealSelection = false;
      });
    };
    const resize = new ResizeObserver(() => {
      place();
      update();
    });
    const observeSizes = () => {
      resize.disconnect();
      resize.observe(wrapper);
      resize.observe(viewport);
      resize.observe(list);
      for (const tab of list.querySelectorAll('[role="tab"]'))
        resize.observe(tab);
    };
    const mutation = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList")) observeSizes();
      // Observers run before paint, so the glide starts in the same frame.
      place();
      update(records.some((record) => record.attributeName === "data-active"));
    });
    observeSizes();
    place();
    mutation.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-active", "data-orientation", "dir", "disabled"],
    });
    viewport.addEventListener("scroll", measure, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(pending);
      cancelFrame(syncClips);
      for (const stop of unsubscribe) stop();
      resize.disconnect();
      mutation.disconnect();
      viewport.removeEventListener("scroll", measure);
    };
  }, [list, measure, reveal, reducedMotion, x, y, width, height]);

  function scroll(direction: number) {
    const state = getScrollState();
    if (!state) return;
    state.viewport.scrollBy({
      [vertical ? "top" : "left"]: direction * state.size * 0.8,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  const StartIcon = vertical ? ChevronUpIcon : ChevronLeftIcon;
  const EndIcon = vertical ? ChevronDownIcon : ChevronRightIcon;
  const controlClassName =
    "absolute z-20 rounded-[inherit] transition-opacity disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none";
  const maskStyle: React.CSSProperties = {};
  if (edges.overflow)
    maskStyle.maskImage = `linear-gradient(${vertical ? "to bottom" : "to right"}, ${edges.start ? "transparent, black 36px" : "black, black 0px"}, ${edges.end ? "black calc(100% - 36px), transparent" : "black 100%"})`;

  return (
    <div
      ref={wrapperRef}
      dir={props.dir}
      data-slot="tabs-list-wrapper"
      data-orientation={orientation}
      data-overflow={edges.overflow || undefined}
      className={cn(
        "relative isolate flex w-fit min-w-0 max-w-full shrink-0 self-start rounded-full data-vertical:max-h-full data-vertical:min-h-0 data-vertical:shrink data-vertical:rounded-2xl",
        variant === "segment" && "rounded-lg",
        variant === "line" && "rounded-none",
        edges.overflow &&
          variant !== "line" &&
          variant !== "ghost" &&
          "bg-muted",
        wrapperClassName,
      )}
    >
      <div
        ref={viewportRef}
        id={viewportId}
        data-slot="tabs-list-viewport"
        className={cn(
          "scrollbar-none min-h-0 w-full min-w-0 rounded-[inherit] [&::-webkit-scrollbar]:hidden",
          vertical ? "overflow-y-auto" : "overflow-x-auto",
        )}
        style={maskStyle}
        onFocusCapture={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.getAttribute("role") === "tab"
          )
            reveal(event.target);
        }}
      >
        <TabsPrimitive.List
          data-slot="tabs-list"
          data-variant={variant}
          ref={listRef}
          className={(state) =>
            cn(
              tabsListVariants({ variant }),
              typeof className === "function" ? className(state) : className,
            )
          }
          {...props}
        >
          {children}
          <motion.span
            aria-hidden="true"
            data-slot="tabs-indicator"
            data-orientation={orientation}
            data-horizontal={vertical ? undefined : ""}
            data-vertical={vertical ? "" : undefined}
            data-placed={placed || undefined}
            style={indicatorStyle(variant, vertical, { x, y, width, height })}
            className={cn(
              "pointer-events-none absolute top-0 left-0 rounded-full border border-transparent bg-primary not-data-placed:opacity-0",
              "group-data-[variant=segment]/tabs-list:rounded-md group-data-vertical/tabs:rounded-2xl",
              "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:bg-ring",
              "group-data-[variant=line]/tabs-list:data-horizontal:top-auto group-data-[variant=line]/tabs-list:data-horizontal:bottom-0 group-data-[variant=line]/tabs-list:data-horizontal:h-0.5 group-data-[variant=line]/tabs-list:data-horizontal:translate-y-0",
              "group-data-[variant=line]/tabs-list:data-vertical:inset-e-0 group-data-[variant=line]/tabs-list:data-vertical:left-auto group-data-[variant=line]/tabs-list:data-vertical:w-0.5 group-data-[variant=line]/tabs-list:data-vertical:translate-x-0",
              indicatorClassName,
            )}
          />
        </TabsPrimitive.List>
      </div>
      {edges.overflow && (
        <>
          <Button
            data-slot="tabs-scroll-start"
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              controlClassName,
              vertical ? "inset-x-0 top-0 w-full" : "inset-y-0 left-0 h-full",
            )}
            aria-label={
              vertical
                ? (scrollLabels?.up ?? "Scroll tabs up")
                : (scrollLabels?.left ?? "Scroll tabs left")
            }
            aria-controls={viewportId}
            disabled={!edges.start}
            onClick={() => scroll(-1)}
          >
            <StartIcon aria-hidden="true" />
          </Button>
          <Button
            data-slot="tabs-scroll-end"
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              controlClassName,
              vertical
                ? "inset-x-0 bottom-0 w-full"
                : "inset-y-0 right-0 h-full",
            )}
            aria-label={
              vertical
                ? (scrollLabels?.down ?? "Scroll tabs down")
                : (scrollLabels?.right ?? "Scroll tabs right")
            }
            aria-controls={viewportId}
            disabled={!edges.end}
            onClick={() => scroll(1)}
          >
            <EndIcon aria-hidden="true" />
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * A trigger's icon before its label. With `icons="selected"` it springs open
 * on the selected tab only.
 */
function TabsTriggerIcon({
  icon,
  active,
}: {
  icon: React.ReactNode;
  active: boolean;
}) {
  const { icons } = React.useContext(TabsContext);
  const reducedMotion = useReducedMotion();
  if (icons === "always")
    return (
      <span
        aria-hidden="true"
        data-slot="tabs-trigger-icon"
        data-display="always"
        className="inline-flex shrink-0 items-center"
      >
        {icon}
      </span>
    );
  return (
    <motion.span
      aria-hidden="true"
      data-slot="tabs-trigger-icon"
      data-display="selected"
      initial={false}
      animate={{
        width: active ? "auto" : 0,
        marginInlineEnd: active ? 0 : iconCollapse,
        opacity: active ? 1 : 0,
        scale: active ? 1 : 0.6,
      }}
      transition={reducedMotion ? { duration: 0 } : iconSpring}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
    >
      {icon}
    </motion.span>
  );
}

/** The label again in the indicator's colour, clipped to where they overlap. */
function TabsTriggerLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      inert
      data-slot="tabs-trigger-label"
      className="pointer-events-none absolute inset-0 inline-flex text-primary-foreground [align-items:inherit] [clip-path:inset(0_100%_0_0)] [gap:inherit] [justify-content:inherit] [padding:inherit] group-data-[variant=line]/tabs-list:hidden"
    >
      {children}
    </span>
  );
}

function TabsTrigger({
  className,
  icon,
  children,
  ...props
}: Omit<TabsPrimitive.Tab.Props, "children"> & {
  /** An icon before the label. Required for `icons="selected"` on `Tabs`. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const content = (active: boolean) => (
    <>
      {icon !== undefined && <TabsTriggerIcon icon={icon} active={active} />}
      {children}
    </>
  );
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={(state) =>
        cn(
          "relative z-10 inline-flex h-full flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent px-3 py-1 font-medium text-foreground text-sm transition-colors focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-start]:ps-2 has-data-[icon=inline-end]:pe-2 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-vertical/tabs:h-auto group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:rounded-2xl group-data-vertical/tabs:px-3 group-data-vertical/tabs:py-1.5 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=segment]/tabs-list:rounded-md group-data-[variant=line]/tabs-list:data-active:text-accent-foreground motion-reduce:transition-none",
          typeof className === "function" ? className(state) : className,
        )
      }
      render={(tabProps, state) => (
        <button {...tabProps} type="button">
          {content(state.active)}
          <TabsTriggerLabel>{content(state.active)}</TabsTriggerLabel>
        </button>
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={(state) =>
        cn(
          "flex-1 text-sm outline-none data-ending-style:hidden data-hidden:hidden data-ending-style:transition-none motion-safe:data-starting-style:data-[activation-direction=left]:-translate-x-2 motion-safe:data-starting-style:data-[activation-direction=right]:translate-x-2 motion-safe:data-starting-style:data-[activation-direction=down]:translate-y-2 motion-safe:data-starting-style:data-[activation-direction=up]:-translate-y-2 motion-safe:transition-[opacity,translate] motion-safe:duration-250 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:data-starting-style:not-data-[activation-direction=none]:opacity-0 motion-reduce:transition-none",
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    />
  );
}

const TabsList = withGlass(TabsListImplementation);

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
