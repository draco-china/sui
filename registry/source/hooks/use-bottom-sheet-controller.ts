"use client";

import * as React from "react";
import {
  type BottomSheetDetents,
  type BottomSheetLayout,
  type BottomSheetSize,
  bottomSheetDefaults,
  bottomSheetFrame,
  bottomSheetLayout,
  createVelocityTracker,
  resolveBottomSheetRelease,
} from "@/lib/bottom-sheet";

type BottomSheetControllerOptions = {
  open: boolean;
  size: BottomSheetSize;
  expandable: boolean;
  setSize: (size: BottomSheetSize) => void;
  setShape: (shape: Pick<BottomSheetLayout, "expandable" | "full">) => void;
  close: () => void;
  isOpen: () => boolean;
  detents: BottomSheetDetents;
  keyboard: "resize" | "lift";
  footerMode: "adaptive" | "fixed";
  expandOnInputFocus: boolean;
  contentKey: React.Key | undefined;
};

type Drag = {
  source: "handle" | "body";
  pointerId: number | null;
  startX: number;
  startY: number;
  startExtent: number;
  extent: number;
  from: BottomSheetSize;
  /** Pending until the press moves far enough to tell a drag from a scroll. */
  mode: "pending" | "drag" | "native";
};

/** Heights read once per measurement, so drag frames never read layout. */
type Chrome = { header: number; footer: number; natural: number };

const textField =
  'input:not([type="checkbox"],[type="radio"],[type="range"],[type="button"],[type="submit"],[type="reset"],[type="file"],[type="color"]),textarea,select,[contenteditable=""],[contenteditable="true"]';
// Fields, sliders, the footer and marked regions keep their own gestures.
const ownGesture = `${textField},input[type="range"],[role="slider"],[data-slot="bottom-sheet-footer"],[data-bottom-sheet-no-drag]`;
const handle =
  '[data-slot="bottom-sheet-header"],[data-slot="bottom-sheet-grabber"]';
const settleDelay = 450;

let progressRegistered = false;

/** Registers the progress variable as a number so it can animate. */
function registerProgress() {
  if (progressRegistered || typeof CSS === "undefined") return;
  progressRegistered = true;
  try {
    CSS.registerProperty?.({
      name: "--bottom-sheet-progress",
      syntax: "<number>",
      inherits: true,
      initialValue: "0",
    });
  } catch {
    // Already registered by another copy of the component.
  }
}

function part(container: HTMLElement, slot: "header" | "body" | "footer") {
  return container.querySelector<HTMLElement>(
    `:scope > [data-slot="bottom-sheet-${slot}"]`,
  );
}

/** The body scrolls, unless the whole container does when space is short. */
function scrollElement(container: HTMLElement) {
  if (container.dataset.scroll === "container") return container;
  return part(container, "body") ?? container;
}

function resetScroll(container: HTMLElement) {
  container.scrollTop = 0;
  const body = part(container, "body");
  if (body) body.scrollTop = 0;
}

// A collapsed header still reserves its full height in the layout.
function headerHeight(header: HTMLElement | null) {
  if (!header) return 0;
  if (header.hasAttribute("data-collapsed") && header.dataset.naturalHeight)
    return Number(header.dataset.naturalHeight);
  return header.offsetHeight;
}

function measureChrome(popup: HTMLElement, container: HTMLElement): Chrome {
  const styles = getComputedStyle(container);
  let natural =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0) +
    popup.offsetHeight -
    popup.clientHeight;
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const slot = child.dataset.slot;
    if (slot === "bottom-sheet-header") natural += headerHeight(child);
    // The body may be scrolling, so its content height is its scroll height.
    else if (slot === "bottom-sheet-body") natural += child.scrollHeight;
    else natural += child.offsetHeight;
  }
  return {
    header: headerHeight(part(container, "header")),
    footer: part(container, "footer")?.offsetHeight ?? 0,
    natural,
  };
}

// Keeps a drag going outside the sheet; the pointer may already be gone.
function capture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Released before the drag began.
  }
}

function keyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const hidden = window.innerHeight - viewport.height - viewport.offsetTop;
  return Math.max(0, Math.round(hidden));
}

/** Coalesces calls into one per animation frame. */
function perFrame(callback: () => void) {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      callback();
    });
  };
  schedule.cancel = () => cancelAnimationFrame(frame);
  return schedule;
}

/**
 * Measures the sheet into sizes, paints its frame through CSS variables
 * and runs its drag, wheel and focus gestures.
 */
export function useBottomSheetController(
  options: BottomSheetControllerOptions,
) {
  const { open, size, expandable, setSize, setShape, contentKey } = options;
  const [popup, setPopup] = React.useState<HTMLDivElement | null>(null);
  const [settled, setSettled] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const probeRef = React.useRef<HTMLDivElement>(null);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  const layoutRef = React.useRef<BottomSheetLayout>({
    heights: { default: 0, lg: 0 },
    expandable: false,
    full: false,
  });
  const chromeRef = React.useRef<Chrome>({ header: 0, footer: 0, natural: 0 });
  const dragRef = React.useRef<Drag | null>(null);

  const extentOf = React.useCallback(
    (target: BottomSheetSize) => layoutRef.current.heights[target],
    [],
  );

  // Only writes CSS variables, so it can run on every pointer move.
  const paint = React.useCallback(
    (extent: number) => {
      if (!popup) return;
      const frame = bottomSheetFrame(extent, layoutRef.current);
      const dismiss = Math.min(1, frame.offset / Math.max(1, frame.height));
      popup.style.setProperty("--bottom-sheet-height", `${frame.height}px`);
      popup.style.setProperty("--bottom-sheet-offset", `${frame.offset}px`);
      popup.style.setProperty("--bottom-sheet-progress", `${frame.progress}`);
      const overlay = overlayRef.current?.style;
      overlay?.setProperty("--bottom-sheet-progress", `${frame.progress}`);
      overlay?.setProperty("--bottom-sheet-dismiss", `${dismiss}`);
    },
    [popup],
  );

  // Chooses what scrolls: nothing until the sheet may scroll, then the body,
  // or the whole container when an adaptive footer leaves too little room.
  const scrollableRef = React.useRef(false);
  const flowsRef = React.useRef(false);
  const applyScroll = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    let scroll = "none";
    if (scrollableRef.current) scroll = "body";
    if (scrollableRef.current && (flowsRef.current || !part(container, "body")))
      scroll = "container";
    container.dataset.scroll = scroll;
  }, []);

  // Rests at a size: paints it, then lets the footer flow if it must.
  const rest = React.useCallback(
    (target: BottomSheetSize) => {
      const height = extentOf(target);
      paint(height);
      const { header, footer } = chromeRef.current;
      flowsRef.current =
        optionsRef.current.footerMode === "adaptive" &&
        footer > 0 &&
        height - header - footer < bottomSheetDefaults.minimumBody;
      applyScroll();
    },
    [paint, extentOf, applyScroll],
  );

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const { isOpen, keyboard, detents } = optionsRef.current;
    if (!popup || !container || !isOpen()) return;
    const viewportHeight =
      popup.parentElement?.clientHeight ?? window.innerHeight;
    const room = viewportHeight - (probeRef.current?.offsetHeight ?? 0);
    const inset = keyboardInset();
    popup.style.setProperty("--bottom-sheet-keyboard", `${inset}px`);
    const chrome = measureChrome(popup, container);
    chromeRef.current = chrome;
    const layout = bottomSheetLayout({
      available: keyboard === "lift" ? room : room - inset,
      natural: chrome.natural,
      chrome: chrome.header + chrome.footer,
      detents,
    });
    // Lifting keeps the height, but never past the space above the keyboard.
    const limit = Math.max(0, room - inset);
    layoutRef.current = {
      ...layout,
      heights: {
        default: Math.min(layout.heights.default, limit),
        lg: Math.min(layout.heights.lg, limit),
      },
    };
    setShape({ expandable: layout.expandable, full: layout.full });
    if (dragRef.current?.mode !== "drag") rest(optionsRef.current.size);
  }, [popup, rest, setShape]);

  // Measure before the first paint, then once per frame after content,
  // viewport or keyboard changes.
  React.useLayoutEffect(() => {
    registerProgress();
    const container = containerRef.current;
    if (!popup || !container || !open) return;
    measure();
    const schedule = perFrame(measure);
    // Widening the sheet resizes every child; only height changes matter.
    const heights = new WeakMap<Element, number>();
    const resize = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (heights.get(entry.target) !== height) changed = true;
        heights.set(entry.target, height);
      }
      if (changed) schedule();
    });
    const observe = () => {
      resize.disconnect();
      for (const child of Array.from(container.children)) resize.observe(child);
      if (popup.parentElement) resize.observe(popup.parentElement);
    };
    observe();
    const mutation = new MutationObserver(() => {
      observe();
      schedule();
    });
    mutation.observe(container, { childList: true });
    const events = new AbortController();
    const { signal } = events;
    window.visualViewport?.addEventListener("resize", schedule, { signal });
    window.visualViewport?.addEventListener("scroll", schedule, { signal });
    return () => {
      schedule.cancel();
      resize.disconnect();
      mutation.disconnect();
      events.abort();
    };
  }, [popup, open, measure]);

  // A new detent policy needs a fresh layout.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the policy props trigger a measurement.
  React.useLayoutEffect(measure, [
    measure,
    options.detents,
    options.keyboard,
    options.footerMode,
  ]);

  // Settle at the size; the body scrolls only once expansion finishes.
  React.useLayoutEffect(() => {
    if (dragRef.current?.mode !== "drag") rest(size);
    if (size === "default" && containerRef.current)
      resetScroll(containerRef.current);
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), settleDelay);
    return () => window.clearTimeout(timer);
  }, [size, rest]);

  // A new content key starts over at the default size, at the top.
  const contentKeyRef = React.useRef(contentKey);
  React.useEffect(() => {
    if (Object.is(contentKeyRef.current, contentKey)) return;
    contentKeyRef.current = contentKey;
    if (containerRef.current) resetScroll(containerRef.current);
    setSize("default");
  }, [contentKey, setSize]);

  const scrollable = !expandable || (size === "lg" && settled);
  React.useLayoutEffect(() => {
    scrollableRef.current = scrollable;
    applyScroll();
  }, [scrollable, applyScroll]);

  // Keep a focused field in view once the body can scroll.
  React.useEffect(() => {
    const active = document.activeElement;
    if (
      scrollable &&
      active instanceof HTMLElement &&
      active.matches(textField) &&
      containerRef.current?.contains(active)
    )
      active.scrollIntoView({ block: "nearest" });
  }, [scrollable]);

  // Drags: the header and grabber move the sheet with any pointer. Touch on
  // the body moves it while the body cannot scroll, or pulls it down from the
  // top of a scrolled body.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!popup || !container) return;
    const tracker = createVelocityTracker();
    const events = new AbortController();
    const { signal } = events;
    let suppressClickUntil = 0;

    function begin(
      source: Drag["source"],
      x: number,
      y: number,
      pointerId: number | null,
    ) {
      const from = optionsRef.current.size;
      const extent = extentOf(from);
      dragRef.current = {
        source,
        pointerId,
        startX: x,
        startY: y,
        startExtent: extent,
        extent,
        from,
        mode: "pending",
      };
      tracker.reset();
      tracker.add(-y, performance.now());
    }
    // Vertical movement past the threshold drags the sheet, unless it starts
    // a scroll in a body that can scroll.
    function decide(drag: Drag, dx: number, dy: number): Drag["mode"] {
      const threshold = bottomSheetDefaults.dragThreshold;
      if (Math.abs(dy) < threshold || Math.abs(dy) <= Math.abs(dx))
        return Math.abs(dx) > threshold ? "native" : "pending";
      if (drag.source === "handle") return "drag";
      if (!container || container.dataset.scroll === "none") return "drag";
      const pullsFromTop = scrollElement(container).scrollTop <= 0 && dy > 0;
      return pullsFromTop ? "drag" : "native";
    }
    function move(drag: Drag, x: number, y: number, time: number) {
      tracker.add(-y, time);
      const dy = y - drag.startY;
      if (drag.mode === "pending") {
        drag.mode = decide(drag, x - drag.startX, dy);
        if (drag.mode !== "drag") return false;
        popup?.setAttribute("data-dragging", "");
        overlayRef.current?.setAttribute("data-dragging", "");
      }
      drag.extent = Math.min(
        drag.startExtent - dy,
        layoutRef.current.heights.lg,
      );
      paint(drag.extent);
      return true;
    }
    function target(drag: Drag, velocity: number) {
      const layout = layoutRef.current;
      // An upward swipe on the body at the default size expands even when it
      // is short.
      const swipedUp =
        drag.source === "body" &&
        drag.from === "default" &&
        layout.expandable &&
        drag.extent - layout.heights.default > 16 &&
        velocity > -bottomSheetDefaults.flickVelocity;
      if (swipedUp) return "lg";
      return resolveBottomSheetRelease({
        extent: drag.extent,
        velocity,
        layout,
        from: drag.from,
      });
    }
    function end(drag: Drag, time: number, cancelled: boolean) {
      dragRef.current = null;
      if (drag.mode !== "drag") return;
      popup?.removeAttribute("data-dragging");
      overlayRef.current?.removeAttribute("data-dragging");
      suppressClickUntil = performance.now() + 80;
      const next = target(drag, cancelled ? 0 : tracker.velocity(time));
      if (next !== "closed") {
        rest(next);
        if (next !== optionsRef.current.size) setSize(next);
        return;
      }
      optionsRef.current.close();
      // A parent that keeps the sheet open gets it back at its size.
      requestAnimationFrame(() => {
        if (optionsRef.current.isOpen()) rest(optionsRef.current.size);
      });
    }

    popup.addEventListener(
      "pointerdown",
      (event) => {
        const element = event.target as Element | null;
        if (event.button !== 0 || dragRef.current) return;
        if (!element?.closest(handle) || element.closest(textField)) return;
        begin("handle", event.clientX, event.clientY, event.pointerId);
      },
      { signal },
    );
    popup.addEventListener(
      "pointermove",
      (event) => {
        const drag = dragRef.current;
        if (drag?.pointerId !== event.pointerId || drag.mode === "native")
          return;
        const pending = drag.mode === "pending";
        const dragging = move(
          drag,
          event.clientX,
          event.clientY,
          event.timeStamp,
        );
        if (dragging && pending) capture(popup, event.pointerId);
      },
      { signal },
    );
    const release = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag?.pointerId === event.pointerId)
        end(drag, event.timeStamp, event.type === "pointercancel");
    };
    popup.addEventListener("pointerup", release, { signal });
    popup.addEventListener("pointercancel", release, { signal });
    // A finished drag must not also press what it started on.
    popup.addEventListener(
      "click",
      (event) => {
        if (performance.now() > suppressClickUntil) return;
        event.preventDefault();
        event.stopPropagation();
      },
      { capture: true, signal },
    );
    container.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        const element = event.target as Element | null;
        if (event.touches.length !== 1 || !touch || dragRef.current) return;
        if (!element || element.closest(handle) || element.closest(ownGesture))
          return;
        begin("body", touch.clientX, touch.clientY, null);
      },
      { passive: true, signal },
    );
    container.addEventListener(
      "touchmove",
      (event) => {
        const drag = dragRef.current;
        const touch = event.touches[0];
        if (drag?.source !== "body" || drag.mode === "native" || !touch) return;
        const dragging = move(
          drag,
          touch.clientX,
          touch.clientY,
          event.timeStamp,
        );
        if (dragging && event.cancelable) event.preventDefault();
      },
      { passive: false, signal },
    );
    const touchEnd = (event: TouchEvent) => {
      const drag = dragRef.current;
      if (drag?.source === "body")
        end(drag, event.timeStamp, event.type === "touchcancel");
    };
    container.addEventListener("touchend", touchEnd, { signal });
    container.addEventListener("touchcancel", touchEnd, { signal });
    return () => events.abort();
  }, [popup, paint, rest, extentOf, setSize]);

  // Wheel, focus and header state while the body scrolls.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!popup || !container) return;
    const events = new AbortController();
    const { signal } = events;
    let wheelUntil = 0;
    const canExpand = () =>
      layoutRef.current.expandable && optionsRef.current.size === "default";

    // An expandable sheet at the default size expands on the first scroll down
    // and absorbs the rest of that wheel gesture.
    container.addEventListener(
      "wheel",
      (event) => {
        const now = performance.now();
        const expands = canExpand() && event.deltaY > 0;
        if (now >= wheelUntil && !expands) return;
        wheelUntil = now + 250;
        if (event.cancelable) event.preventDefault();
        if (expands) setSize("lg");
      },
      { passive: false, signal },
    );
    container.addEventListener(
      "focusin",
      (event) => {
        const element = event.target as Element | null;
        if (
          optionsRef.current.expandOnInputFocus &&
          canExpand() &&
          element?.matches(textField)
        )
          setSize("lg");
      },
      { signal },
    );
    const updateHeader = perFrame(() => {
      const header = part(container, "header");
      if (header?.dataset.collapseOnScroll !== "true") return;
      const scroller = scrollElement(container);
      const top = scroller.scrollTop;
      const collapsed = header.hasAttribute("data-collapsed");
      // Hysteresis keeps a short scroll range from toggling back and forth.
      const range = scroller.scrollHeight - scroller.clientHeight;
      if (!collapsed && top > 24 && range > 48) {
        header.dataset.naturalHeight = `${header.offsetHeight}`;
        header.setAttribute("data-collapsed", "");
      }
      if (collapsed && top < 4) header.removeAttribute("data-collapsed");
    });
    // Scroll events do not bubble, so listen while they pass down to the body.
    container.addEventListener("scroll", updateHeader, {
      capture: true,
      passive: true,
      signal,
    });
    return () => {
      updateHeader.cancel();
      events.abort();
    };
  }, [popup, setSize]);

  return { popupRef: setPopup, containerRef, overlayRef, probeRef };
}
