"use client";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const focusSelector =
  'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex], [contenteditable="true"], iframe';

function frameDocument(frame: HTMLIFrameElement) {
  try {
    return frame.contentDocument;
  } catch {
    return null;
  }
}
function isFocusable(node: HTMLElement) {
  if (node.hasAttribute("tabindex") && node.tabIndex < 0) return false;
  for (
    let current: HTMLElement | null = node;
    current;
    current = current.parentElement
  ) {
    if (current.hidden || current.hasAttribute("inert")) return false;
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style?.display === "none" || style?.visibility === "hidden")
      return false;
  }
  return true;
}
function focusableNodes(
  container: HTMLElement | Document,
  visited = new Set<Document>(),
): HTMLElement[] {
  const owner = container.ownerDocument ?? (container as Document);
  if (visited.has(owner)) return [];
  visited.add(owner);
  return Array.from(
    container.querySelectorAll<HTMLElement>(focusSelector),
  ).flatMap((node) => {
    if (!isFocusable(node)) return [];
    if (node.tagName !== "IFRAME") return [node];
    const child = frameDocument(node as HTMLIFrameElement);
    const inside = child ? focusableNodes(child, visited) : [];
    return inside.length ? inside : [node];
  });
}
function deepActiveElement(owner: Document): HTMLElement | null {
  let active = owner.activeElement as HTMLElement | null;
  const seen = new Set<Element>();
  while (active?.tagName === "IFRAME" && !seen.has(active)) {
    seen.add(active);
    const child = frameDocument(active as HTMLIFrameElement);
    const next = child?.activeElement;
    if (!next || next === child?.body || next === child?.documentElement) break;
    active = next as HTMLElement;
  }
  return active;
}

function bindFullscreenKeyboard(
  element: HTMLElement,
  exit: () => void,
  isTop: () => boolean,
) {
  const owner = element.ownerDocument;
  const documents = new Map<
    Document,
    { observer: MutationObserver; target: Node }
  >();
  const frames = new Map<HTMLIFrameElement, () => void>();
  let frame = 0;
  let disposed = false;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || !isTop()) return;
    // Nested popup portals manage their own focus and Escape handling.
    const target = event.target as Element | null;
    const popup = target?.closest?.(
      '[data-base-ui-portal], [role="dialog"], [role="alertdialog"]',
    );
    if (popup && !popup.contains(element)) return;
    const eventDocument = event.currentTarget as Document;
    if (
      eventDocument !== owner &&
      fixedOverlays.get(eventDocument)?.entries.length
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      exit();
      return;
    }
    if (event.key !== "Tab") return;
    const nodes = focusableNodes(element);
    const first = nodes[0];
    const last = nodes.at(-1);
    const active = deepActiveElement(owner);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (active === first || !nodes.includes(active as HTMLElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !nodes.includes(active as HTMLElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  };
  const schedule = () => {
    if (disposed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      refresh();
    });
  };
  function refresh() {
    if (disposed) return;
    const nextDocuments = new Map<Document, Node>([[owner, element]]);
    const nextFrames = new Set<HTMLIFrameElement>();
    const collect = (container: HTMLElement | Document) => {
      for (const nested of container.querySelectorAll<HTMLIFrameElement>(
        "iframe",
      )) {
        nextFrames.add(nested);
        const child = frameDocument(nested);
        if (!child?.documentElement || nextDocuments.has(child)) continue;
        nextDocuments.set(child, child.documentElement);
        collect(child);
      }
    };
    collect(element);
    for (const [current, binding] of documents) {
      if (nextDocuments.has(current)) continue;
      current.removeEventListener("keydown", onKeyDown);
      binding.observer.disconnect();
      documents.delete(current);
    }
    for (const [current, target] of nextDocuments) {
      if (documents.has(current)) continue;
      const observer = new MutationObserver(schedule);
      observer.observe(target, { childList: true, subtree: true });
      current.addEventListener("keydown", onKeyDown);
      documents.set(current, { observer, target });
    }
    for (const [current, loaded] of frames) {
      if (nextFrames.has(current)) continue;
      current.removeEventListener("load", loaded);
      frames.delete(current);
    }
    for (const current of nextFrames) {
      if (frames.has(current)) continue;
      const loaded = () => refresh();
      current.addEventListener("load", loaded);
      frames.set(current, loaded);
    }
  }
  refresh();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    for (const [current, binding] of documents) {
      current.removeEventListener("keydown", onKeyDown);
      binding.observer.disconnect();
    }
    for (const [current, loaded] of frames)
      current.removeEventListener("load", loaded);
    documents.clear();
    frames.clear();
  };
}

type FixedOverlay = { element: HTMLElement; previousFocus: HTMLElement | null };
type FixedOverlayStack = {
  entries: FixedOverlay[];
  overflow: string;
  overflowPriority: string;
  returnFocus: HTMLElement | null;
};
const fixedOverlays = new WeakMap<Document, FixedOverlayStack>();

function acquireFixedOverlay(element: HTMLElement, exit: () => void) {
  const owner = element.ownerDocument;
  let stack = fixedOverlays.get(owner);
  const previousFocus = deepActiveElement(owner);
  if (!stack) {
    stack = {
      entries: [],
      overflow: owner.body.style.getPropertyValue("overflow"),
      overflowPriority: owner.body.style.getPropertyPriority("overflow"),
      returnFocus: previousFocus,
    };
    fixedOverlays.set(owner, stack);
    owner.body.style.setProperty("overflow", "hidden");
  }
  const entry: FixedOverlay = { element, previousFocus };
  stack.entries.push(entry);
  const activeStack = stack;
  const stop = bindFullscreenKeyboard(
    element,
    exit,
    () => activeStack.entries.at(-1) === entry,
  );
  focusableNodes(element)[0]?.focus();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const wasTop = activeStack.entries.at(-1) === entry;
    stop();
    const index = activeStack.entries.indexOf(entry);
    if (index >= 0) activeStack.entries.splice(index, 1);
    const next = activeStack.entries.at(-1);
    if (!next) {
      fixedOverlays.delete(owner);
      if (activeStack.overflow)
        owner.body.style.setProperty(
          "overflow",
          activeStack.overflow,
          activeStack.overflowPriority,
        );
      else owner.body.style.removeProperty("overflow");
      if (activeStack.returnFocus?.isConnected) activeStack.returnFocus.focus();
    } else if (wasTop) {
      const nodes = focusableNodes(next.element);
      if (entry.previousFocus && nodes.includes(entry.previousFocus))
        entry.previousFocus.focus();
      else nodes[0]?.focus();
    }
  };
}

/** Manages controlled or uncontrolled fixed and browser fullscreen state. */
export function useFullscreen({
  fullscreen: controlledFullscreen,
  defaultFullscreen = false,
  onFullscreenChange,
  mode = "fixed",
  ref,
}: {
  fullscreen?: boolean;
  defaultFullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  mode?: "fixed" | "screen";
  ref?: RefObject<HTMLDivElement | null>;
} = {}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const targetRef = ref ?? internalRef;
  const wasOwnFullscreen = useRef(false);
  const [uncontrolledFullscreen, setUncontrolledFullscreen] =
    useState(defaultFullscreen);
  const fullscreen = controlledFullscreen ?? uncontrolledFullscreen;

  const setFullscreen = useCallback(
    (nextFullscreen: boolean) => {
      if (controlledFullscreen === undefined)
        setUncontrolledFullscreen(nextFullscreen);
      onFullscreenChange?.(nextFullscreen);
    },
    [controlledFullscreen, onFullscreenChange],
  );

  const latestSetFullscreen = useRef(setFullscreen);
  useEffect(() => {
    latestSetFullscreen.current = setFullscreen;
  }, [setFullscreen]);

  useEffect(() => {
    if (mode !== "screen") return;

    function handleFullscreenChange() {
      const isOwnFullscreen = Boolean(
        targetRef.current && document.fullscreenElement === targetRef.current,
      );
      if (wasOwnFullscreen.current && !isOwnFullscreen && fullscreen)
        setFullscreen(false);
      wasOwnFullscreen.current = isOwnFullscreen;
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [fullscreen, mode, setFullscreen, targetRef]);

  useEffect(() => {
    if (mode !== "screen") return;

    const element = targetRef.current;
    if (!element) return;

    if (fullscreen) {
      if (document.fullscreenElement !== element) {
        if (!element.requestFullscreen) {
          setFullscreen(false);
          return;
        }
        element.requestFullscreen().catch(() => setFullscreen(false));
      }
      return;
    }

    if (document.fullscreenElement === element) {
      document.exitFullscreen?.()?.catch(() => setFullscreen(true));
    }
  }, [fullscreen, mode, setFullscreen, targetRef]);

  useEffect(() => {
    if (mode !== "fixed" || !fullscreen) return;
    const element = targetRef.current;
    if (!element) return;
    return acquireFixedOverlay(element, () =>
      latestSetFullscreen.current(false),
    );
  }, [fullscreen, mode, targetRef]);

  return {
    ref: targetRef,
    fullscreen,
    setFullscreen,
  };
}
