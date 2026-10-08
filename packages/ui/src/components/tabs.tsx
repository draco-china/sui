"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { Button } from "@workspace/ui/components/button";
import { useReducedMotion } from "@workspace/ui/hooks/use-reduced-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";
import * as React from "react";
import { withGlass } from "../lib/glass/context";

const TabsContext =
  React.createContext<TabsPrimitive.Root.Orientation>("horizontal");

function TabsImplementation({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsContext.Provider value={orientation}>
      <TabsPrimitive.Root
        data-slot="tabs"
        orientation={orientation}
        className={(state) =>
          cn(
            "group/tabs flex min-h-0 min-w-0 gap-2 data-horizontal:flex-col",
            typeof className === "function" ? className(state) : className,
          )
        }
        {...props}
      />
    </TabsContext.Provider>
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit min-w-full shrink-0 items-center justify-center p-1 text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-full bg-muted group-data-vertical/tabs:rounded-2xl",
        line: "gap-1 rounded-none bg-transparent",
        segment: "rounded-lg bg-muted p-0.5",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function TabsListImplementation({
  className,
  wrapperClassName,
  indicatorClassName,
  variant = "default",
  children,
  ref,
  ...props
}: TabsPrimitive.List.Props &
  VariantProps<typeof tabsListVariants> & {
    wrapperClassName?: string;
    indicatorClassName?: string;
  }) {
  const orientation = React.useContext(TabsContext);
  const vertical = orientation === "vertical";
  const reducedMotion = useReducedMotion();
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
    let frame = 0;
    let revealSelection = false;
    const update = (selectionChanged = false) => {
      revealSelection ||= selectionChanged;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
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
    const resize = new ResizeObserver(() => update());
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
      update(records.some((record) => record.attributeName === "data-active"));
    });
    observeSizes();
    mutation.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-active", "data-orientation", "dir", "disabled"],
    });
    viewport.addEventListener("scroll", measure, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      viewport.removeEventListener("scroll", measure);
    };
  }, [list, measure, reveal]);

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
        edges.overflow && variant !== "line" && "bg-muted",
        wrapperClassName,
      )}
    >
      <div
        ref={viewportRef}
        id={viewportId}
        data-slot="tabs-list-viewport"
        className={cn(
          "min-h-0 w-full min-w-0 rounded-[inherit] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
          <TabsPrimitive.Indicator
            data-slot="tabs-indicator"
            className={cn(
              "pointer-events-none absolute top-0 left-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-full border border-transparent bg-primary transition-[translate,width,height] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              "group-data-[variant=segment]/tabs-list:rounded-md group-data-vertical/tabs:rounded-2xl",
              "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:bg-ring",
              "group-data-[variant=line]/tabs-list:data-horizontal:top-auto group-data-[variant=line]/tabs-list:data-horizontal:bottom-0 group-data-[variant=line]/tabs-list:data-horizontal:h-0.5 group-data-[variant=line]/tabs-list:data-horizontal:translate-y-0",
              "group-data-[variant=line]/tabs-list:data-vertical:end-0 group-data-[variant=line]/tabs-list:data-vertical:left-auto group-data-[variant=line]/tabs-list:data-vertical:w-0.5 group-data-[variant=line]/tabs-list:data-vertical:translate-x-0",
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
            aria-label={vertical ? "Scroll tabs up" : "Scroll tabs left"}
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
            aria-label={vertical ? "Scroll tabs down" : "Scroll tabs right"}
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

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={(state) =>
        cn(
          "relative z-10 inline-flex h-full flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent px-3 py-1 font-medium text-muted-foreground text-sm transition-colors not-data-active:hover:text-foreground focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-start]:ps-2 has-data-[icon=inline-end]:pe-2 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-vertical/tabs:h-auto group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:rounded-2xl group-data-vertical/tabs:px-3 group-data-vertical/tabs:py-1.5 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          "data-active:text-primary-foreground group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=segment]/tabs-list:rounded-md group-data-[variant=line]/tabs-list:data-active:text-accent-foreground motion-reduce:transition-none",
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    />
  );
}

function TabsContentImplementation({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={(state) =>
        cn(
          "flex-1 text-sm outline-none data-[ending-style]:hidden data-[hidden]:hidden data-[ending-style]:transition-none motion-safe:data-[starting-style]:data-[activation-direction=left]:-translate-x-2 motion-safe:data-[starting-style]:data-[activation-direction=right]:translate-x-2 motion-safe:data-[starting-style]:data-[activation-direction=down]:translate-y-2 motion-safe:data-[starting-style]:data-[activation-direction=up]:-translate-y-2 motion-safe:transition-[opacity,translate] motion-safe:duration-250 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:data-[starting-style]:not-data-[activation-direction=none]:opacity-0 motion-reduce:transition-none",
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    />
  );
}

const Tabs = withGlass(TabsImplementation, "scope");
const TabsList = withGlass(TabsListImplementation);
const TabsContent = withGlass(TabsContentImplementation);

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
