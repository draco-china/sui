import {
  failGlassRenderer,
  glassBaseOnly,
  prepareGlassRenderer,
  releaseGlassRenderers,
} from "@/lib/glass/backend";
import {
  acquireGlassCaptureFonts,
  captureGlassBackground,
  GlassResourceError,
  glassCaptureOrigin,
  glassCapturePixelRatio,
  glassLayoutSize,
  releaseGlassFrame,
} from "@/lib/glass/capture";
import { glassMediaBounds, glassMediaSource } from "@/lib/glass/capture-media";
import type {
  GlassCaptureTarget,
  GlassConfiguration,
  GlassMaterial,
  GlassOptions,
} from "@/lib/glass/context";
import {
  GlassContrastError,
  GlassTextContrastCache,
  parseGlassColor as parseColor,
} from "@/lib/glass/contrast";
import { glassDefaults, glassMaterials } from "@/lib/glass/defaults";
import { glassEdge, glassRadii, glassShadow } from "@/lib/glass/edge";
import { glassMaterial } from "@/lib/glass/material";
import { glassSamplePadding } from "@/lib/glass/refraction";
import type { GlassRenderer } from "@/lib/glass/renderer";
import type { SvgGlassRenderer } from "@/lib/glass/svg-renderer";

const managers = new Map<string, GlassManager>();
let queue = Promise.resolve();
let nextSurface = 0;
const elementIds = new WeakMap<Element, number>();
let sceneRevision = 0;
let lastSnapshotTime = 0;
let sharedSnapshots = new WeakMap<
  HTMLElement,
  {
    revision: number;
    frames: Map<string, HTMLCanvasElement | null>;
    mediaQueued?: boolean;
  }
>();

function idFor(element: Element) {
  let id = elementIds.get(element);
  if (id === undefined) {
    id = ++nextSurface;
    elementIds.set(element, id);
  }
  return id;
}

function invalidateScene() {
  sceneRevision++;
}

function overlaps(
  a: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  b: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
) {
  return (
    a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom
  );
}

function hasPaint(element: Element) {
  const style = getComputedStyle(element);
  return (
    parseColor(style.backgroundColor)[3] > 0 ||
    Boolean(style.backgroundImage && style.backgroundImage !== "none") ||
    hasOverflowPaint(element, style) ||
    element.matches("img,canvas,svg,video,iframe") ||
    [...element.childNodes].some(
      (node) => node.nodeType === 3 && node.textContent?.trim(),
    )
  );
}

function hasOverflowPaint(element: Element, style = getComputedStyle(element)) {
  if (
    (style.boxShadow && style.boxShadow !== "none") ||
    (style.filter && style.filter !== "none")
  )
    return true;
  return hasPseudoPaint(element);
}

function hasPseudoPaint(element: Element) {
  return ["::before", "::after"].some((pseudo) => {
    const paint = getComputedStyle(element, pseudo);
    return (
      Boolean(paint.content) &&
      paint.content !== "none" &&
      paint.content !== "normal" &&
      paint.display !== "none" &&
      paint.visibility !== "hidden"
    );
  });
}

function paintOverlaps(
  element: Element,
  rect: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
) {
  const bounds = element.getBoundingClientRect();
  if (overlaps(bounds, rect)) return true;
  const style = getComputedStyle(element);
  if (!hasOverflowPaint(element, style)) return false;
  if ((style.filter && style.filter !== "none") || hasPseudoPaint(element))
    return true;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const paint = getComputedStyle(node);
    const zoom = paint.getPropertyValue("zoom");
    if (zoom && zoom !== "normal" && zoom !== "1") return true;
    const transform = paint.transform;
    if (
      transform &&
      transform !== "none" &&
      !transform.startsWith("matrix(1, 0, 0, 1, ")
    )
      return true;
    if (
      [paint.scale, paint.rotate, paint.perspective, paint.filter].some(
        (value) => value && value !== "none",
      )
    )
      return true;
  }
  // Bound ordinary shadows conservatively; unknown effects remain unbounded.
  let padding = 0;
  const shadows = style.boxShadow
    .replace(/(?:rgba?|hsla?|oklab|oklch|lab|lch|color)\([^)]*\)/g, "")
    .split(",");
  for (const shadow of shadows) {
    if (/\binset\b/.test(shadow)) continue;
    const tokens = shadow.trim().split(/\s+/);
    if (
      tokens.length < 2 ||
      tokens.length > 4 ||
      tokens.some((token) => !/^-?(?:\d*\.)?\d+(?:px)?$/.test(token))
    )
      return true;
    const [x, y, blur = 0, spread = 0] = tokens.map(Number.parseFloat);
    if (![x, y, blur, spread].every(Number.isFinite)) return true;
    padding = Math.max(
      padding,
      Math.abs(x) + blur * 4 + Math.abs(spread) + 2,
      Math.abs(y) + blur * 4 + Math.abs(spread) + 2,
    );
  }
  return overlaps(
    {
      left: bounds.left - padding,
      right: bounds.right + padding,
      top: bounds.top - padding,
      bottom: bounds.bottom + padding,
    },
    rect,
  );
}

const clamp = (
  value: number | undefined,
  fallback: number,
  low: number,
  high: number,
) =>
  Math.min(
    high,
    Math.max(low, Number.isFinite(value) ? (value as number) : fallback),
  );

function visible(element: Element) {
  const bounds = element.getBoundingClientRect();
  return (
    paintVisible(element) &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.right > 0 &&
    bounds.bottom > 0 &&
    bounds.left < innerWidth &&
    bounds.top < innerHeight
  );
}

function paintVisible(element: Element) {
  const style = getComputedStyle(element);
  return (
    element.isConnected &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    !element.closest("[hidden],[inert]")
  );
}

function surfaceRadii(
  element: HTMLElement,
  rect: DOMRect,
  style: CSSStyleDeclaration,
): [string, string, string, string] {
  const size = glassLayoutSize(element, rect);
  const corners = glassRadii(size.width, size.height, [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ]);
  return corners.map(
    ({ x, y }) =>
      `${(x * rect.width) / size.width}px ${(y * rect.height) / size.height}px`,
  ) as [string, string, string, string];
}

function stackingLayer(element: Element) {
  const style = getComputedStyle(element);
  const positioned = Boolean(style.position && style.position !== "static");
  const parentDisplay = element.parentElement
    ? getComputedStyle(element.parentElement).display
    : "";
  const ordered =
    positioned || /^(?:inline-)?(?:flex|grid)$/.test(parentDisplay);
  const z = ordered ? Number.parseInt(style.zIndex, 10) : Number.NaN;
  const effect = (value: string) => Boolean(value && value !== "none");
  const context =
    element === document.documentElement ||
    (ordered && Number.isFinite(z)) ||
    style.position === "fixed" ||
    style.position === "sticky" ||
    Number.parseFloat(style.opacity) < 1 ||
    effect(style.transform) ||
    effect(style.translate) ||
    effect(style.scale) ||
    effect(style.rotate) ||
    effect(style.filter) ||
    effect(style.backdropFilter) ||
    effect(style.getPropertyValue("-webkit-backdrop-filter")) ||
    effect(style.perspective) ||
    effect(style.clipPath) ||
    effect(style.maskImage) ||
    effect(style.getPropertyValue("mask-border-source")) ||
    style.isolation === "isolate" ||
    /^(?:size|inline-size)$/.test(style.containerType) ||
    Boolean(style.mixBlendMode && style.mixBlendMode !== "normal") ||
    /\b(?:layout|paint|strict|content)\b/.test(style.contain) ||
    /\b(?:transform|translate|scale|rotate|opacity|filter|backdrop-filter|perspective|clip-path|mask|isolation)\b/.test(
      style.willChange,
    );
  let phase: number | undefined;
  if (context || positioned) {
    phase = 0;
    if (Number.isFinite(z)) phase = z;
  }
  return { element, context, phase };
}

function layerOrder(a: Element, b: Element): number | undefined {
  if (
    document.fullscreenElement ||
    a.closest("dialog[open],[popover]") ||
    b.closest("dialog[open],[popover]")
  )
    return;
  const chain = (element: Element) => {
    const layers: ReturnType<typeof stackingLayer>[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (
        style.transformStyle === "preserve-3d" ||
        (style.perspective && style.perspective !== "none") ||
        (style.animationName &&
          style.animationName !== "none" &&
          /\b(?:forwards|both)\b/.test(style.animationFillMode))
      )
        return;
      const layer = stackingLayer(node);
      if (layer.context) layers.unshift(layer);
    }
    return layers;
  };
  const left = chain(a);
  const right = chain(b);
  if (!left || !right) return;
  let index = 0;
  while (left[index]?.element === right[index]?.element && left[index]) index++;
  const paintUnit = (element: Element, context?: Element) => {
    for (
      let node: Element | null = element;
      node && node !== context;
      node = node.parentElement
    ) {
      const layer = stackingLayer(node);
      if (layer.phase !== undefined) return layer;
    }
    return stackingLayer(element);
  };
  const common = left[index - 1]?.element;
  const x = left[index] ?? paintUnit(a, common);
  const y = right[index] ?? paintUnit(b, common);
  if (x.phase === undefined && y.phase === undefined) return;
  if (x.phase === undefined)
    return y.phase !== undefined && y.phase < 0 ? 1 : -1;
  if (y.phase === undefined) return x.phase < 0 ? -1 : 1;
  if (x.phase !== y.phase) return x.phase > y.phase ? 1 : -1;
  // Flex/grid paint order can differ from DOM order; leave that case to the CSS fallback.
  for (const element of [x.element, y.element]) {
    for (let node: Element | null = element; node; node = node.parentElement)
      if (Number.parseInt(getComputedStyle(node).order, 10)) return;
  }
  const order = x.element.compareDocumentPosition(y.element);
  if (order & 1) return;
  if (order & 4) return -1;
  if (order & 2) return 1;
}

function higherLayers(
  surface: HTMLElement,
  rect: Pick<
    DOMRect,
    "left" | "right" | "top" | "bottom" | "width" | "height"
  > = surface.getBoundingClientRect(),
) {
  const blocked = new Set<Element>([surface]);
  if (surface.dataset.slot === "tabs-indicator") {
    for (const tab of surface.parentElement?.querySelectorAll('[role="tab"]') ??
      [])
      blocked.add(tab);
  }
  for (const fx of [0.1, 0.5, 0.9]) {
    for (const fy of [0.1, 0.5, 0.9]) {
      const x = Math.max(
        0,
        Math.min(innerWidth - 1, rect.left + rect.width * fx),
      );
      const y = Math.max(
        0,
        Math.min(innerHeight - 1, rect.top + rect.height * fy),
      );
      const stack = document.elementsFromPoint(x, y);
      const index = stack.findIndex(
        (element) => element === surface || surface.contains(element),
      );
      if (index < 0) continue;
      for (const element of stack.slice(0, index)) {
        if (!element.contains(surface) && !surface.contains(element))
          blocked.add(element);
      }
    }
  }
  for (const candidate of document.body.querySelectorAll("*")) {
    if (
      candidate.contains(surface) ||
      surface.contains(candidate) ||
      [...blocked].some((item) => item.contains(candidate)) ||
      candidate.closest("[data-glass-exclude],[data-glass-decoration]") ||
      !paintVisible(candidate)
    )
      continue;
    const bounds = candidate.getBoundingClientRect();
    if (!overlaps(bounds, rect)) {
      if (!hasOverflowPaint(candidate)) continue;
      const order = layerOrder(candidate, surface);
      if (order === undefined)
        throw new Error("Glass background has an ambiguous overlapping layer");
      if (order > 0) blocked.add(candidate);
      continue;
    }
    const x = Math.max(
      0,
      Math.min(
        innerWidth - 1,
        (Math.max(bounds.left, rect.left) +
          Math.min(bounds.right, rect.right)) /
          2,
      ),
    );
    const y = Math.max(
      0,
      Math.min(
        innerHeight - 1,
        (Math.max(bounds.top, rect.top) +
          Math.min(bounds.bottom, rect.bottom)) /
          2,
      ),
    );
    const stack = document.elementsFromPoint(x, y);
    const surfaceIndex = stack.findIndex(
      (element) => element === surface || surface.contains(element),
    );
    const candidateIndex = stack.findIndex(
      (element) => element === candidate || candidate.contains(element),
    );
    if (candidateIndex >= 0 && surfaceIndex >= 0) {
      if (candidateIndex < surfaceIndex) blocked.add(candidate);
      continue;
    }
    if (
      getComputedStyle(candidate).pointerEvents !== "none" &&
      candidateIndex < 0
    )
      continue;
    const order = layerOrder(candidate, surface);
    if (order === undefined)
      throw new Error("Glass background has an ambiguous overlapping layer");
    if (order > 0) blocked.add(candidate);
  }
  return blocked;
}

function glassLayer(element: HTMLElement) {
  let root = element.parentElement;
  while (root && root.dataset.glass !== "true" && !stackingLayer(root).context)
    root = root.parentElement;
  return { root, phase: stackingLayer(element).phase ?? 0 };
}

function styleWithoutFrame(style: string | null) {
  return (style ?? "")
    .replace(
      /--glass-(?:frame|filter|edge|initial-edge-shadow|base|opacity|tint-opacity):[^;]+;?/g,
      "",
    )
    .trim();
}

function geometryMutation(record: MutationRecord) {
  if (
    record.type === "attributes" &&
    record.attributeName === "data-glass-motion" &&
    record.target instanceof HTMLElement &&
    record.target.dataset.glass === "true"
  )
    return true;
  if (
    record.type !== "attributes" ||
    record.attributeName !== "style" ||
    !(record.target instanceof HTMLElement) ||
    record.target.dataset.glass !== "true"
  )
    return false;
  const position = getComputedStyle(record.target).position;
  if (position !== "absolute" && position !== "fixed") return false;
  const withoutGeometry = (style: string | null) =>
    styleWithoutFrame(style)
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(
        (declaration) =>
          declaration &&
          !/^(?:translate|transform|width|height|top|left|right|bottom|visibility)\s*:/.test(
            declaration,
          ),
      )
      .join(";");
  return (
    withoutGeometry(record.oldValue) ===
    withoutGeometry(record.target.getAttribute("style"))
  );
}

function relevantMutation(record: MutationRecord) {
  const element =
    record.target instanceof Element
      ? record.target
      : record.target.parentElement;
  if (element?.closest("[data-glass-decoration]")) return false;
  if (
    record.target instanceof Element &&
    record.target.getAttribute("data-glass") !== "true" &&
    record.target.closest('[data-glass="true"][data-glass-frozen="true"]')
  )
    return false;
  if (
    record.type === "childList" &&
    [...record.addedNodes, ...record.removedNodes].every(
      (node) =>
        node instanceof Element && node.hasAttribute("data-glass-decoration"),
    )
  )
    return false;
  if (record.type === "attributes") {
    if (
      record.target instanceof Element &&
      record.attributeName !== null &&
      record.oldValue !== null &&
      record.oldValue === record.target.getAttribute(record.attributeName)
    )
      return false;

    if (
      record.attributeName === "data-glass-state" ||
      record.attributeName === "data-glass-renderer" ||
      record.attributeName === "data-glass-capture-id"
    )
      return false;
    if (
      record.attributeName === "style" &&
      record.target instanceof HTMLElement &&
      record.target.dataset.glass === "true"
    ) {
      return (
        styleWithoutFrame(record.oldValue) !==
        styleWithoutFrame(record.target.getAttribute("style"))
      );
    }
    return true;
  }
  return true;
}

function nativeMaterial(
  element: HTMLElement,
  options: GlassOptions,
  material: GlassMaterial = "clear",
) {
  const probe = element.cloneNode(false) as HTMLElement;
  probe.removeAttribute("data-glass-state");
  probe.removeAttribute("id");
  probe.setAttribute("data-glass-decoration", "");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  try {
    element.parentElement?.append(probe);
    const style = getComputedStyle(probe);
    const token = (name: string) =>
      parseColor(style.getPropertyValue(name).trim());
    const paint = parseColor(style.backgroundColor);
    const tint = parseColor(
      style.getPropertyValue("--popover").trim() || "#fff",
    );
    return glassMaterial({
      paint,
      tint,
      opacity: clamp(
        options.tintOpacity,
        glassMaterials[material].tintOpacity,
        0,
        1,
      ),
      primary: token("--primary"),
      destructive: token("--destructive"),
      surfaceColors: [
        "--background",
        "--card",
        "--popover",
        "--muted",
        "--secondary",
        "--accent",
        "--input",
      ].map(token),
      customPaint: Boolean(
        element.style.background || element.style.backgroundColor,
      ),
      foreground: token("--foreground"),
      background: token("--background"),
      text: parseColor(style.color),
      overrideTint:
        options.tint === undefined ? undefined : parseColor(options.tint),
    });
  } finally {
    probe.remove();
  }
}

const ownedStyles = [
  "--glass-frame",
  "--glass-filter",
  "--glass-edge",
  "--glass-initial-edge-shadow",
  "--glass-opacity",
  "--glass-base",
] as const;

type SurfaceState = {
  styles?: {
    property: string;
    value: string;
    priority: string;
    written?: string;
  }[];
  url?: string;
  svg?: SvgGlassRenderer;
  base: string;
  tint: [number, number, number];
  opacity: number;
  materialKey?: string;
  frameMaterial?: string;
  frameKey?: string;
  backdrop?: {
    target: HTMLElement;
    key: string;
    layers: Set<HTMLElement>;
  };
  edgeKey?: string;
  edgeDirty?: boolean;
};

const GLASS_ATTRIBUTES = [
  "class",
  "style",
  "hidden",
  "inert",
  "data-glass",
  "data-glass-scope",
  "data-glass-mounted",
  "data-glass-frozen",
  "data-glass-motion",
  "data-glass-contrast",
  "data-color",
  "data-state",
  "data-open",
  "data-closed",
  "aria-pressed",
  "data-pressed",
  "aria-checked",
  "data-checked",
  "data-unchecked",
  "aria-selected",
  "data-selected",
  "data-active",
  "data-highlighted",
  "aria-invalid",
  "data-invalid",
  "disabled",
  "aria-hidden",
  "aria-busy",
  "placeholder",
  "value",
  "type",
  "readonly",
  "open",
  "aria-disabled",
  "data-disabled",
];

// Configuration groups own frames; document observation is shared across all groups.
class GlassDom {
  readonly clipped = new WeakSet<Element>();
  private readonly owners = new Map<Element, GlassManager>();
  private readonly mutationObserver: MutationObserver;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private groups?: Map<string, Set<HTMLElement>>;
  readonly appearance = window.matchMedia?.("(prefers-color-scheme: dark)");
  private readonly listeners = new Map<
    EventTarget,
    Map<
      string,
      {
        callbacks: Set<EventListener>;
        listener: EventListener;
        capture: boolean;
      }
    >
  >();

  constructor() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const batches = new Map<GlassManager, ResizeObserverEntry[]>();
      for (const entry of entries) {
        const owner = this.owners.get(entry.target);
        if (!owner) continue;
        const batch = batches.get(owner) ?? [];
        batch.push(entry);
        batches.set(owner, batch);
      }
      for (const [owner, batch] of batches) owner.onResize(batch);
    });
    this.intersectionObserver = new IntersectionObserver((entries) => {
      const owners = new Set<GlassManager>();
      for (const entry of entries) {
        const owner = this.owners.get(entry.target);
        if (!owner) continue;
        if (entry.isIntersecting) this.clipped.delete(entry.target);
        else this.clipped.add(entry.target);
        owners.add(owner);
      }
      for (const owner of owners) owner.schedule();
    });
    this.mutationObserver = new MutationObserver((records) =>
      this.mutated(records),
    );
    this.mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: GLASS_ATTRIBUTES,
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private mutated(records: MutationRecord[]) {
    const relevant = records.filter(relevantMutation);
    if (!relevant.length) return;
    if (
      relevant.some(
        (record) =>
          record.type === "childList" ||
          ["data-glass", "data-glass-scope", "data-glass-mounted"].includes(
            record.attributeName ?? "",
          ),
      )
    )
      this.groups = undefined;
    for (const manager of managers.values()) manager.onMutation(relevant);
  }

  discover(id: string) {
    // Include pending mounts before their MutationObserver callback is delivered.
    this.mutated(this.mutationObserver.takeRecords());
    if (!this.groups) {
      this.groups = new Map();
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-glass="true"]',
      )) {
        if (element.dataset.glassMounted === "false") continue;
        const scope = element.dataset.glassScope;
        if (!scope) continue;
        const elements = this.groups.get(scope) ?? new Set<HTMLElement>();
        elements.add(element);
        this.groups.set(scope, elements);
      }
    }
    return this.groups.get(id) ?? new Set<HTMLElement>();
  }

  owner(element: HTMLElement) {
    return this.owners.get(element);
  }

  backdropChanged(element: HTMLElement) {
    for (const [surface, owner] of this.owners)
      owner.invalidateBackdrop(surface, element);
  }

  observe(element: HTMLElement, owner: GlassManager) {
    this.owners.set(element, owner);
    this.resizeObserver.observe(element);
    this.intersectionObserver.observe(element);
  }

  unobserve(element: HTMLElement) {
    this.owners.delete(element);
    this.clipped.delete(element);
    this.resizeObserver.unobserve(element);
    this.intersectionObserver.unobserve(element);
  }

  listen(
    target: EventTarget,
    type: string,
    callback: EventListener,
    options: boolean | AddEventListenerOptions = false,
  ) {
    let events = this.listeners.get(target);
    if (!events) {
      events = new Map();
      this.listeners.set(target, events);
    }
    let event = events.get(type);
    if (!event) {
      const callbacks = new Set<EventListener>();
      const listener: EventListener = (value) => {
        for (const handler of callbacks) handler(value);
      };
      event = {
        callbacks,
        listener,
        capture:
          typeof options === "boolean" ? options : Boolean(options.capture),
      };
      events.set(type, event);
      target.addEventListener(type, listener, options);
    }
    event.callbacks.add(callback);
    return () => {
      event.callbacks.delete(callback);
      if (event.callbacks.size) return;
      target.removeEventListener(type, event.listener, event.capture);
      events.delete(type);
      if (!events.size) this.listeners.delete(target);
    };
  }

  destroy() {
    this.mutationObserver.disconnect();
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.owners.clear();
    for (const [target, events] of this.listeners)
      for (const [type, event] of events)
        target.removeEventListener(type, event.listener, event.capture);
    this.listeners.clear();
  }
}

let glassDom: GlassDom | undefined;

class GlassManager {
  leases = 0;
  private surfaces = new Map<HTMLElement, SurfaceState>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queued = false;
  private disposed = false;
  private dirty = false;
  private materialsDirty = true;
  private scrollingDirty = false;
  private lastCapture = 0;
  private motionFrame = 0;
  private mediaFrame?: { video: HTMLVideoElement; handle: number };
  private moving = new Map<HTMLElement, number>();
  private pendingFrames = new Map<string, HTMLImageElement>();
  private captureFonts = new Map<Document, () => void>();
  private options: GlassOptions;
  private configurationVersion = 0;
  private readonly textContrast = new GlassTextContrastCache();
  private removeListeners: () => void;

  constructor(private configuration: GlassConfiguration) {
    this.configuration = {
      ...configuration,
      mode: configuration.mode ?? "svg",
    };
    this.options = configuration.options ?? {};
    this.scan();
    const dom = glassDom as GlassDom;
    const releases: (() => void)[] = [];
    const listen = (
      target: EventTarget,
      type: string,
      callback: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => releases.push(dom.listen(target, type, callback, options));
    const scroll = (event: Event) => {
      const node = event.target;
      const target = this.getTarget();
      if (
        node instanceof Element &&
        !target.contains(node) &&
        !node.contains(target) &&
        ![...this.surfaces.keys()].some((element) => node.contains(element))
      )
        return;
      invalidateScene();
      this.schedule(true);
    };
    const update = () => {
      this.materialsDirty = true;
      this.textContrast.invalidate();
      invalidateScene();
      this.schedule();
    };
    const mediaUpdate = (event: Event) => {
      const media = event.target;
      if (event.type === "pause" && this.mediaFrame?.video === media)
        this.stopMediaFrames();
      if (
        !(media instanceof HTMLElement) ||
        !media.matches("video[data-glass-backdrop]") ||
        media.closest("[data-glass-exclude]")
      )
        return;
      const target = this.getTarget();
      if (
        target.dataset.glassCapture !== "media" ||
        !target.contains(media) ||
        !this.surfaces.size ||
        glassBaseOnly(this.configuration.mode) ||
        (event.type === "timeupdate" &&
          ![...this.surfaces.keys()].some(
            (element) => element.dataset.glassRenderer === "vgpu",
          ))
      )
        return;
      this.scheduleMediaFrame(target);
    };
    const visibility = () => {
      if (document.hidden) {
        this.stopMediaFrames();
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
      } else this.schedule();
    };
    listen(window, "scroll", scroll, { capture: true, passive: true });
    listen(window, "resize", update);
    listen(document, "input", update, true);
    listen(document, "change", update, true);
    listen(document, "load", update, true);
    listen(document, "timeupdate", mediaUpdate, true);
    listen(document, "play", mediaUpdate, true);
    listen(document, "pause", mediaUpdate, true);
    listen(document, "visibilitychange", visibility);
    const fontUpdate = (event: Event) => {
      const faces = (event as Event & { fontfaces?: FontFace[] }).fontfaces;
      if (!faces?.length) return update();
      const families = new Set(
        faces.map((face) => face.family.replace(/["']/g, "").toLowerCase()),
      );
      let target = this.getTarget();
      if (
        [...this.surfaces.keys()].some((surface) => !target.contains(surface))
      )
        target = document.body;
      const usesFont = (style: CSSStyleDeclaration) =>
        style.fontFamily
          .split(",")
          .some((family) =>
            families.has(family.trim().replace(/["']/g, "").toLowerCase()),
          );
      for (const element of [
        target,
        ...target.querySelectorAll<HTMLElement>("*"),
      ]) {
        if (
          element.closest(
            '[data-glass="true"],[data-glass-exclude],[data-glass-decoration]',
          )
        )
          continue;
        const text =
          [...element.childNodes].some(
            (node) => node.nodeType === 3 && node.textContent?.trim(),
          ) || element.matches("input,textarea,select");
        if (text && usesFont(getComputedStyle(element))) return update();
        for (const pseudo of ["::before", "::after"]) {
          const style = getComputedStyle(element, pseudo);
          if (
            style.content &&
            !["none", "normal", '""', "''"].includes(style.content) &&
            usesFont(style)
          )
            return update();
        }
      }
    };
    if (document.fonts) listen(document.fonts, "loadingdone", fontUpdate);
    const interaction = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        [...this.surfaces.keys()].some((surface) => surface.contains(target))
      )
        update();
    };
    for (const type of ["pointerover", "pointerout", "focusin", "focusout"])
      listen(document, type, interaction, true);
    const appearance = dom.appearance;
    if (appearance) listen(appearance, "change", update);
    const transition = (event: TransitionEvent) => {
      if (["color", "background-color", "opacity"].includes(event.propertyName))
        interaction(event);
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        !this.surfaces.has(target) ||
        !["translate", "transform", "width", "height"].includes(
          event.propertyName,
        )
      )
        return;
      if (event.type === "transitionrun" && this.configuration.mode !== "css") {
        this.moving.set(target, performance.now() + 3000);
        this.drawMotion();
      } else if (event.type !== "transitionrun") {
        this.moving.delete(target);
        this.schedule(false, true);
      }
    };
    listen(document, "transitionrun", transition as EventListener, true);
    listen(document, "transitionend", transition as EventListener, true);
    listen(document, "transitioncancel", transition as EventListener, true);
    this.removeListeners = () => {
      for (const release of releases) release();
    };
    this.schedule();
  }

  onResize(entries: ResizeObserverEntry[]) {
    let layoutChanged = false;
    for (const { target } of entries) {
      if (!(target instanceof HTMLElement)) continue;
      const state = this.surfaces.get(target);
      if (state) state.edgeDirty = true;
      const position = getComputedStyle(target).position;
      if (position !== "absolute" && position !== "fixed") layoutChanged = true;
    }
    if (layoutChanged) {
      this.materialsDirty = true;
      this.textContrast.invalidate();
      invalidateScene();
    }
    this.schedule(false, !layoutChanged);
  }

  onMutation(records: MutationRecord[]) {
    const target = this.getTarget();
    const wholeDocument = [...this.surfaces.keys()].some(
      (surface) => !target.contains(surface),
    );
    const relevant = records.filter((record) => {
      if (!relevantMutation(record)) return false;
      if (wholeDocument || target === document.body) return true;
      const ownsScope = (node: Node) =>
        node instanceof Element &&
        (node.getAttribute("data-glass-scope") === this.configuration.id ||
          [...node.querySelectorAll("[data-glass-scope]")].some(
            (surface) =>
              surface.getAttribute("data-glass-scope") ===
              this.configuration.id,
          ));
      if (
        (record.type === "childList" &&
          [...record.addedNodes, ...record.removedNodes].some(ownsScope)) ||
        (record.type === "attributes" &&
          (ownsScope(record.target) ||
            (record.attributeName === "data-glass-scope" &&
              record.oldValue === this.configuration.id)))
      )
        return true;
      if (target.contains(record.target)) return true;
      if (!record.target.contains(target)) return false;
      if (record.type !== "childList") return true;
      return [...record.addedNodes, ...record.removedNodes].some((node) =>
        node.contains(target),
      );
    });
    if (relevant.length) {
      const geometryOnly = relevant.every(geometryMutation);
      if (!geometryOnly) {
        this.materialsDirty = true;
        this.textContrast.invalidate();
        invalidateScene();
        this.scan();
      } else
        for (const record of relevant) {
          if (record.target instanceof HTMLElement) {
            const state = this.surfaces.get(record.target);
            if (state) state.edgeDirty = true;
          }
        }
      for (const record of relevant) {
        if (
          record.type !== "attributes" ||
          record.attributeName !== "data-glass-motion" ||
          !(record.target instanceof HTMLElement) ||
          !this.surfaces.has(record.target)
        )
          continue;
        if (record.target.dataset.glassMotion === "true") {
          this.moving.set(record.target, performance.now() + 3000);
          this.drawMotion();
        } else this.moving.delete(record.target);
      }
      this.schedule(false, geometryOnly);
    }
  }

  private drawMotion() {
    if (
      this.motionFrame ||
      this.disposed ||
      document.hidden ||
      this.configuration.mode === "css"
    )
      return;
    this.motionFrame = requestAnimationFrame(() => {
      this.motionFrame = 0;
      const now = performance.now();
      for (const [element, expiry] of this.moving)
        if (now >= expiry || !visible(element)) this.moving.delete(element);
      if (!this.moving.size) return;
      this.schedule(false, true);
      this.drawMotion();
    });
  }

  update(configuration: GlassConfiguration, preserveSettings = false) {
    if (preserveSettings)
      configuration = { ...this.configuration, ...configuration };
    configuration = { ...configuration, mode: configuration.mode ?? "svg" };
    const previous = this.configuration;
    const same =
      previous.mode === configuration.mode &&
      previous.material === configuration.material &&
      previous.captureTarget === configuration.captureTarget &&
      (["strength", "tint", "tintOpacity", "highlight"] as const).every(
        (key) => previous.options?.[key] === configuration.options?.[key],
      );
    if (!same) {
      this.stopMediaFrames();
      this.materialsDirty = true;
      this.configurationVersion++;
      this.textContrast.invalidate();
    }
    this.configuration = configuration;
    this.options = configuration.options ?? {};
    this.scan();
    if (configuration.mode === "css")
      for (const [element, state] of this.surfaces)
        this.restoreCss(element, state);
    this.schedule();
  }

  refresh(target?: HTMLElement) {
    if (
      target &&
      this.getTarget() !== target &&
      ![...this.surfaces.keys()].some((element) => target.contains(element))
    )
      return;
    this.materialsDirty = true;
    this.textContrast.invalidate();
    this.schedule();
  }

  invalidateBackdrop(element: Element, layer: HTMLElement) {
    const backdrop = this.surfaces.get(element as HTMLElement)?.backdrop;
    if (!backdrop?.layers.has(layer)) return;
    sharedSnapshots.get(backdrop.target)?.frames.delete(backdrop.key);
    this.schedule();
  }

  private scan() {
    const dom = glassDom as GlassDom;
    const elements = dom.discover(this.configuration.id);
    for (const [element, state] of this.surfaces) {
      if (elements.has(element)) continue;
      dom.unobserve(element);
      this.releaseFrame(element, state);
      this.surfaces.delete(element);
    }
    for (const element of elements) {
      const existing = this.surfaces.get(element);
      if (existing) continue;
      const manager = dom.owner(element);
      if (manager && manager !== this) {
        const previous = manager.surfaces.get(element);
        if (previous) {
          dom.unobserve(element);
          manager.releaseFrame(element, previous);
          manager.surfaces.delete(element);
        }
      }
      const state: SurfaceState = {
        base: "",
        tint: [0, 0, 0],
        opacity: 0,
        // React owns mounted surfaces' declared styles; a DOM lease owns its snapshot.
        styles: element.hasAttribute("data-glass-mounted")
          ? undefined
          : ownedStyles.map((property) => ({
              property,
              value: element.style.getPropertyValue(property),
              priority: element.style.getPropertyPriority(property),
            })),
      };
      this.surfaces.set(element, state);
      this.updateMaterial(element, state);
      element.dataset.glassState = "loading";
      dom.observe(element, this);
    }
  }

  private updateMaterial(element: HTMLElement, state: SurfaceState) {
    const oldState = element.dataset.glassState;
    const material = nativeMaterial(
      element,
      this.options,
      this.configuration.material,
    );
    state.tint = material.tint;
    state.opacity = material.opacity;
    state.base = `rgb(${state.tint.map((channel) => Math.round(channel * 255)).join(", ")})`;
    this.writeStyle(element, state, "--glass-base", state.base);
    this.writeStyle(
      element,
      state,
      "--glass-opacity",
      `${state.opacity * 100}%`,
    );
    this.updateEdge(element, state);
    const frameMaterial = JSON.stringify([state.base, state.opacity]);
    const materialKey = JSON.stringify([
      frameMaterial,
      element.style.getPropertyValue("--glass-edge"),
    ]);
    if (state.materialKey !== materialKey) {
      state.materialKey = materialKey;
      if (oldState === "ready" && state.frameMaterial !== frameMaterial) {
        this.restoreCss(element, state);
      }
      if (state.frameMaterial) glassDom?.backdropChanged(element);
      state.frameMaterial = frameMaterial;
    }
  }

  private restoreCss(
    element: HTMLElement,
    state: SurfaceState,
    status: "css" | "fallback" = "css",
  ) {
    state.backdrop = undefined;
    const changed = Boolean(state.url || state.svg);
    if (state.url) releaseGlassFrame(state.url);
    state.svg?.release(element);
    state.svg = undefined;
    state.url = undefined;
    state.frameKey = undefined;
    this.writeStyle(element, state, "--glass-frame", "");
    this.writeStyle(element, state, "--glass-filter", "");
    element.dataset.glassState = status;
    delete element.dataset.glassRenderer;
    if (changed) glassDom?.backdropChanged(element);
  }

  private updateEdge(element: HTMLElement, state: SurfaceState) {
    state.edgeDirty = false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const radii = surfaceRadii(element, rect, style);
    const highlight = clamp(this.options.highlight, 0.3, 0, 1);
    const color = parseColor(
      style.getPropertyValue("--foreground").trim() || style.color,
    );
    const key = JSON.stringify([
      rect.width,
      rect.height,
      radii,
      highlight,
      color,
      state.tint,
    ]);
    if (state.edgeKey === key) return;
    state.edgeKey = key;
    this.writeStyle(
      element,
      state,
      "--glass-initial-edge-shadow",
      glassShadow(highlight, color, state.tint),
    );
    this.writeStyle(
      element,
      state,
      "--glass-edge",
      glassEdge(rect.width, rect.height, radii, highlight, color, state.tint),
    );
  }

  schedule(scrolling = false, realtime = false) {
    if (this.disposed || document.hidden) return;
    this.dirty = true;
    this.scrollingDirty ||= scrolling;
    if (this.timer || this.queued) return;
    let delay = 0;
    if (!realtime)
      delay = Math.max(
        0,
        (scrolling ? 100 : 200) - (performance.now() - this.lastCapture),
      );
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.disposed || document.hidden) return;
      this.queued = true;
      queue = queue
        .then(() => this.capture())
        .catch(() => this.fallback())
        .finally(() => {
          this.queued = false;
          if (this.dirty && !this.disposed)
            this.schedule(false, this.moving.size > 0);
        });
    }, delay);
  }

  private getTarget() {
    const target = this.configuration.captureTarget;
    if (target && "current" in target) return target.current ?? document.body;
    return target ?? document.body;
  }

  private mediaBounds(target: HTMLElement, required: DOMRect) {
    const requests = [required];
    for (const owner of managers.values()) {
      if (
        owner.configuration.mode !== "auto" ||
        owner.configuration.material === "regular" ||
        owner.getTarget() !== target
      )
        continue;
      for (const [element, state] of owner.surfaces) {
        if (
          state.opacity === 1 ||
          element.dataset.glassFrozen === "true" ||
          glassDom?.clipped.has(element) ||
          !visible(element)
        )
          continue;
        if (state.backdrop && !state.backdrop.key.startsWith("media")) continue;
        requests.push(element.getBoundingClientRect());
      }
    }
    return glassMediaBounds(requests);
  }

  private scheduleMediaFrame(target: HTMLElement) {
    const cached = sharedSnapshots.get(target);
    if (cached && !cached.mediaQueued) {
      cached.mediaQueued = true;
      // Let queued consumers share this frame before video ticks replace it.
      const invalidate = () => {
        if (sharedSnapshots.get(target) === cached)
          sharedSnapshots.delete(target);
      };
      void queue.then(invalidate, invalidate);
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.schedule(false, true);
  }

  private stopMediaFrames() {
    if (this.mediaFrame)
      this.mediaFrame.video.cancelVideoFrameCallback(this.mediaFrame.handle);
    this.mediaFrame = undefined;
  }

  private watchMediaFrames(target: HTMLElement) {
    const source = glassMediaSource(target);
    if (source?.tagName !== "VIDEO") {
      this.stopMediaFrames();
      return;
    }
    const media = source as HTMLVideoElement;
    if (
      media.paused ||
      !media.requestVideoFrameCallback ||
      !media.cancelVideoFrameCallback
    ) {
      this.stopMediaFrames();
      return;
    }
    if (this.mediaFrame?.video === media) return;
    this.stopMediaFrames();
    const tick = () => {
      if (
        this.disposed ||
        document.hidden ||
        media.paused ||
        !media.isConnected ||
        media.closest("[data-glass-exclude]") ||
        this.getTarget() !== target ||
        ![...this.surfaces.keys()].some(
          (element) =>
            visible(element) && element.dataset.glassRenderer === "vgpu",
        )
      ) {
        this.stopMediaFrames();
        return;
      }
      this.mediaFrame = {
        video: media,
        handle: media.requestVideoFrameCallback(tick),
      };
      this.scheduleMediaFrame(target);
    };
    this.mediaFrame = {
      video: media,
      handle: media.requestVideoFrameCallback(tick),
    };
  }

  private async capture() {
    if (this.disposed || document.hidden) return;
    this.dirty = false;
    const nativeMotion = this.scrollingDirty || this.moving.size > 0;
    const snapshotInterval = this.scrollingDirty ? 100 : 200;
    this.scrollingDirty = false;
    this.lastCapture = performance.now();
    const configurationVersion = this.configurationVersion;
    const capturedRevision = sceneRevision;
    this.scan();
    const active = [...this.surfaces].filter(([element]) => visible(element));
    if (!active.length) {
      this.stopMediaFrames();
      return;
    }
    if (this.materialsDirty) {
      this.materialsDirty = false;
      for (const [element, state] of active)
        this.updateMaterial(element, state);
    } else {
      for (const [element, state] of active)
        if (state.edgeDirty || this.moving.has(element))
          this.updateEdge(element, state);
    }
    if (
      glassBaseOnly(this.configuration.mode) ||
      active.every(([, state]) => state.opacity === 1)
    ) {
      this.stopMediaFrames();
      for (const [element, state] of active) this.restoreCss(element, state);
      return;
    }
    const current = (element?: HTMLElement, state?: SurfaceState) => {
      // A shared scene change discards this frame, but still needs a fresh one.
      if (sceneRevision !== capturedRevision && !this.disposed)
        this.dirty = true;
      return (
        !this.disposed &&
        !document.hidden &&
        this.configurationVersion === configurationVersion &&
        sceneRevision === capturedRevision &&
        (!element ||
          (visible(element) &&
            element.dataset.glass === "true" &&
            element.dataset.glassScope === this.configuration.id &&
            this.surfaces.get(element) === state))
      );
    };
    if (!current()) return;
    let backend = await prepareGlassRenderer(
      this.configuration.mode,
      this.configuration.material,
    );
    if (backend?.kind === "vgpu" && nativeMotion) {
      const native = await prepareGlassRenderer("svg");
      if (native?.kind === "svg") {
        backend = native;
        this.dirty = true;
      }
    }
    if (!current()) return;
    if (!backend) {
      this.fallback();
      return;
    }
    const target = this.getTarget();
    const peers =
      backend.kind === "vgpu"
        ? [...document.querySelectorAll<HTMLElement>('[data-glass="true"]')]
        : [];
    for (const [element, state] of active) {
      if (element.dataset.glassFrozen === "true") continue;
      // Opaque paint covers the sampled background; its shared highlight remains visible.
      if (state.opacity === 1) {
        this.restoreCss(element, state);
        continue;
      }
      if (!current(element, state)) continue;
      if (!backend) {
        this.restoreCss(element, state, "fallback");
        continue;
      }
      if (backend.kind === "svg") {
        try {
          this.applySvg(element, state, backend.renderer);
        } catch {
          failGlassRenderer("svg");
          backend = undefined;
          this.fallback();
        }
        continue;
      }
      // Clipped surfaces have no backdrop pixels in the viewport snapshot.
      if (glassDom?.clipped.has(element)) continue;
      const rect = element.getBoundingClientRect();
      const sampled = {
        left: rect.left - glassSamplePadding,
        right: rect.right + glassSamplePadding,
        top: rect.top - glassSamplePadding,
        bottom: rect.bottom + glassSamplePadding,
        width: rect.width + glassSamplePadding * 2,
        height: rect.height + glassSamplePadding * 2,
      };
      const style = getComputedStyle(element);
      let captureTarget = target.contains(element) ? target : document.body;
      if (captureTarget.closest('[data-glass="true"]'))
        captureTarget = document.body;
      const layer = glassLayer(element);
      const media = glassMediaSource(captureTarget);
      let mediaOnly = Boolean(media);
      if (mediaOnly) {
        for (const peer of peers) {
          if (
            peer === element ||
            !overlaps(peer.getBoundingClientRect(), sampled)
          )
            continue;
          const other = glassLayer(peer);
          if (layer.root === other.root && layer.phase === other.phase)
            continue;
          const order = layerOrder(peer, element);
          if (order === undefined || order < 0) {
            mediaOnly = false;
            break;
          }
        }
      }
      if (mediaOnly && media) {
        for (const candidate of captureTarget.querySelectorAll("*")) {
          if (
            candidate === media ||
            candidate.contains(media) ||
            element.contains(candidate) ||
            candidate.closest(
              '[data-glass="true"],[data-glass-exclude],[data-glass-decoration]',
            ) ||
            !paintOverlaps(candidate, sampled) ||
            !paintVisible(candidate)
          )
            continue;
          if (!hasPaint(candidate)) continue;
          const surfaceOrder = layerOrder(candidate, element);
          const mediaOrder = layerOrder(candidate, media);
          if (
            (candidate.contains(element) ||
              surfaceOrder === undefined ||
              surfaceOrder < 0) &&
            (mediaOrder === undefined || mediaOrder > 0)
          ) {
            mediaOnly = false;
            break;
          }
        }
      }
      let blocked: Set<Element>;
      try {
        blocked = mediaOnly ? new Set() : higherLayers(element, sampled);
      } catch {
        if (!state.url) element.dataset.glassState = "fallback";
        continue;
      }
      if (!mediaOnly) {
        for (const peer of peers) {
          const other = glassLayer(peer);
          if (layer.root === other.root && layer.phase === other.phase)
            blocked.add(peer);
        }
        // Keep ancestors of sampled paint, including overflow-visible children.
        const nodes = [...captureTarget.querySelectorAll("*")];
        const retained = new Set<Element>();
        for (const candidate of nodes) {
          if (!paintOverlaps(candidate, sampled)) continue;
          for (
            let node: Element | null = candidate;
            node && node !== captureTarget && !retained.has(node);
            node = node.parentElement
          )
            retained.add(node);
        }
        for (const candidate of nodes) {
          if (retained.has(candidate)) continue;
          if (hasPaint(candidate)) blocked.add(candidate);
        }
      }
      const exclusions = [...blocked]
        .filter((candidate) => captureTarget.contains(candidate))
        .filter(
          (candidate) =>
            ![...blocked].some(
              (parent) => parent !== candidate && parent.contains(candidate),
            ),
        )
        .map(idFor)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
        .join(",");
      const currentFrame = () => {
        if (
          element.dataset.glassFrozen === "true" ||
          glassDom?.clipped.has(element) ||
          !current(element, state)
        )
          return false;
        const latest = element.getBoundingClientRect();
        if (
          latest.left !== rect.left ||
          latest.top !== rect.top ||
          latest.width !== rect.width ||
          latest.height !== rect.height
        ) {
          // Layout and compositor movement need not mutate the surface's DOM.
          // Keep its displayed frame while a fresh frame uses the new geometry.
          this.schedule(false, true);
          return false;
        }
        return true;
      };
      const region = mediaOnly
        ? this.mediaBounds(captureTarget, rect)
        : undefined;
      let key = mediaOnly ? `media:${JSON.stringify(region)}` : exclusions;
      if (region) {
        const previous = sharedSnapshots.get(captureTarget);
        // A peer can leave the media group; its covering bitmap remains valid.
        if (previous?.revision === sceneRevision && !previous.frames.has(key)) {
          for (const [cachedKey, bitmap] of previous.frames) {
            if (!bitmap || !cachedKey.startsWith("media")) continue;
            const ratio = glassCapturePixelRatio(bitmap);
            const origin = glassCaptureOrigin(bitmap);
            const x = Math.round(origin[0] * ratio);
            const y = Math.round(origin[1] * ratio);
            if (
              x <= Math.round(region.left * ratio) &&
              y <= Math.round(region.top * ratio) &&
              x + bitmap.width >= Math.round(region.right * ratio) &&
              y + bitmap.height >= Math.round(region.bottom * ratio)
            ) {
              key = cachedKey;
              break;
            }
          }
        }
      }
      const backdrop = {
        target: captureTarget,
        key,
        layers: new Set(
          mediaOnly
            ? []
            : peers.filter(
                (peer) =>
                  captureTarget.contains(peer) &&
                  ![...blocked].some(
                    (item) => item === peer || item.contains(peer),
                  ) &&
                  overlaps(peer.getBoundingClientRect(), sampled),
              ),
        ),
      };
      const renderNativeBackdrop = async () => {
        const native = await prepareGlassRenderer("svg");
        if (!currentFrame()) return;
        try {
          if (native?.kind === "svg")
            this.applySvg(element, state, native.renderer);
          else this.restoreCss(element, state, "fallback");
        } catch {
          failGlassRenderer("svg");
          this.restoreCss(element, state, "fallback");
        }
        state.backdrop = backdrop;
      };
      // Keep mixed video paint live; only media-only textures can update without DOM capture.
      // DOM snapshots also cannot reproduce native backdrop filters.
      if (
        (!mediaOnly &&
          media?.tagName === "VIDEO" &&
          !(media as HTMLVideoElement).paused) ||
        (!mediaOnly &&
          [...captureTarget.querySelectorAll("video")].some(
            (video) =>
              video !== media &&
              paintVisible(video) &&
              paintOverlaps(video, sampled) &&
              !video.closest("[data-glass-exclude],[data-glass-decoration]") &&
              ![...blocked].some((item) => item.contains(video)),
          )) ||
        [...backdrop.layers].some((peer) => {
          const paint = getComputedStyle(peer);
          const filter =
            paint.backdropFilter ||
            paint.getPropertyValue("-webkit-backdrop-filter");
          return (
            parseColor(paint.backgroundColor)[3] < 1 &&
            Boolean(filter && filter !== "none")
          );
        })
      ) {
        await renderNativeBackdrop();
        continue;
      }
      state.backdrop = backdrop;
      const captureDocument = captureTarget.ownerDocument;
      if (!this.captureFonts.has(captureDocument))
        this.captureFonts.set(
          captureDocument,
          acquireGlassCaptureFonts(captureDocument),
        );
      let cached = sharedSnapshots.get(captureTarget);
      if (!cached || cached.revision !== sceneRevision) {
        cached = { revision: sceneRevision, frames: new Map() };
        sharedSnapshots.set(captureTarget, cached);
      }
      let snapshot = cached.frames.get(key);
      if (snapshot === null) {
        await renderNativeBackdrop();
        continue;
      }
      if (!snapshot) {
        const delay = snapshotInterval - (performance.now() - lastSnapshotTime);
        if (delay > 0 && !mediaOnly)
          await new Promise((resolve) => setTimeout(resolve, delay));
        if (!currentFrame()) return;
        if (!mediaOnly) lastSnapshotTime = performance.now();
        try {
          snapshot = await captureGlassBackground(
            captureTarget,
            blocked,
            mediaOnly,
            region,
          );
        } catch (error) {
          if (currentFrame()) {
            if (error instanceof GlassResourceError) {
              if (cached.frames.size >= 4) cached.frames.clear();
              cached.frames.set(key, null);
              await renderNativeBackdrop();
            } else if (!state.url && !state.svg) await renderNativeBackdrop();
          }
          continue;
        }
        if (!current(element, state)) return;
        if (cached.frames.size >= 4) cached.frames.clear();
        cached.frames.set(key, snapshot);
      }
      if (!currentFrame()) continue;
      // A consumer of a retiring bitmap still owes the latest video frame.
      if (mediaOnly && cached.mediaQueued) this.dirty = true;
      const strength = clamp(this.options.strength, 22, 0, 64);
      const foreground = parseColor(style.color);
      const corners = glassRadii(
        rect.width,
        rect.height,
        surfaceRadii(element, rect, style),
      );
      const surfaceContrast = element.dataset.glassContrast === "surface";
      const captureOrigin = glassCaptureOrigin(snapshot);
      const frame = {
        pixelRatio: glassCapturePixelRatio(snapshot),
        width: rect.width,
        height: rect.height,
        margin: 0,
        origin: [rect.left - captureOrigin[0], rect.top - captureOrigin[1]],
        radius: [corners[0].x, corners[1].x, corners[2].x, corners[3].x],
        radiusY: [corners[0].y, corners[1].y, corners[2].y, corners[3].y],
        strength,
        blur: 2,
        tint: state.tint,
        tintOpacity: state.opacity,
        foreground: [foreground[0], foreground[1], foreground[2]],
        textColors:
          surfaceContrast || glassDefaults.minimumContrast <= 0
            ? undefined
            : this.textContrast.read(element),
        minimumContrast: glassDefaults.minimumContrast,
      } satisfies Parameters<GlassRenderer["render"]>[1];
      // Decode a complete frame before swapping; rendering failures walk down the shared chain.
      for (;;) {
        if (!backend) {
          if (currentFrame()) this.restoreCss(element, state, "fallback");
          break;
        }
        if (backend.kind === "svg") {
          try {
            this.applySvg(element, state, backend.renderer);
            break;
          } catch {
            failGlassRenderer("svg");
            backend = undefined;
            continue;
          }
        }
        const frameKey = `${backend.kind}:${idFor(snapshot)}:${JSON.stringify(frame)}`;
        if (state.frameKey === frameKey && state.url) {
          this.watchMediaFrames(captureTarget);
          break;
        }
        let url: string | undefined;
        try {
          const blob = await backend.renderer.render(snapshot, frame);
          if (!currentFrame()) break;
          url = URL.createObjectURL(blob);
          const image = new window.Image();
          this.pendingFrames.set(url, image);
          image.src = url;
          let decodeTimer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              image.decode(),
              new Promise<never>((_, reject) => {
                decodeTimer = setTimeout(
                  () => reject(new Error("Glass frame decoding timed out")),
                  5000,
                );
              }),
            ]);
          } finally {
            if (decodeTimer) clearTimeout(decodeTimer);
          }
          if (!this.pendingFrames.delete(url)) break;
          if (!currentFrame()) {
            releaseGlassFrame(url);
            break;
          }
          const previous = state.url;
          state.svg?.release(element);
          state.svg = undefined;
          this.writeStyle(element, state, "--glass-filter", "");
          state.url = url;
          state.frameKey = frameKey;
          this.writeStyle(element, state, "--glass-frame", `url("${url}")`);
          element.dataset.glassState = "ready";
          element.dataset.glassRenderer = backend.kind;
          this.watchMediaFrames(captureTarget);
          glassDom?.backdropChanged(element);
          if (previous) releaseGlassFrame(previous);
          break;
        } catch (error) {
          if (url && this.pendingFrames.delete(url)) releaseGlassFrame(url);
          if (!currentFrame()) break;
          if (error instanceof GlassContrastError) {
            this.restoreCss(element, state, "fallback");
            break;
          }
          failGlassRenderer(backend.kind);
          backend = await prepareGlassRenderer(
            this.configuration.mode,
            this.configuration.material,
          );
        }
      }
    }
  }

  private applySvg(
    element: HTMLElement,
    state: SurfaceState,
    renderer: SvgGlassRenderer,
  ) {
    state.backdrop = undefined;
    const style = getComputedStyle(element);
    const { width, height } = glassLayoutSize(element);
    const corners = glassRadii(width, height, [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ]);
    const filter = renderer.filter(element, {
      width,
      height,
      radius: [corners[0].x, corners[1].x, corners[2].x, corners[3].x],
      radiusY: [corners[0].y, corners[1].y, corners[2].y, corners[3].y],
      strength: clamp(this.options.strength, glassDefaults.strength, 0, 64),
    });
    const changed =
      element.dataset.glassRenderer !== "svg" ||
      element.style.getPropertyValue("--glass-filter") !== filter;
    if (state.svg && state.svg !== renderer) state.svg.release(element);
    state.svg = renderer;
    if (state.url) {
      releaseGlassFrame(state.url);
      state.url = undefined;
      state.frameKey = undefined;
      this.writeStyle(element, state, "--glass-frame", "");
    }
    if (element.style.getPropertyValue("--glass-filter") !== filter)
      this.writeStyle(element, state, "--glass-filter", filter);
    element.dataset.glassState = "ready";
    element.dataset.glassRenderer = "svg";
    if (changed) glassDom?.backdropChanged(element);
  }

  private fallback() {
    this.stopMediaFrames();
    for (const [element, state] of this.surfaces)
      this.restoreCss(element, state, "fallback");
  }

  private writeStyle(
    element: HTMLElement,
    state: SurfaceState,
    property: string,
    value: string,
  ) {
    const saved = state.styles?.find((style) => style.property === property);
    if (
      saved?.written !== undefined &&
      (element.style.getPropertyValue(property) !== saved.written ||
        element.style.getPropertyPriority(property) !== "")
    ) {
      saved.value = element.style.getPropertyValue(property);
      saved.priority = element.style.getPropertyPriority(property);
    }
    element.style.setProperty(property, value);
    if (saved) {
      saved.written = element.style.getPropertyValue(property);
    }
  }

  private releaseFrame(element: HTMLElement, state: SurfaceState) {
    if (state.url) releaseGlassFrame(state.url);
    state.svg?.release(element);
    for (const property of ownedStyles) {
      const saved = state.styles?.find((style) => style.property === property);
      if (saved) {
        if (
          element.style.getPropertyValue(property) !== saved.written ||
          element.style.getPropertyPriority(property) !== ""
        )
          continue;
        element.style.setProperty(property, saved.value, saved.priority);
      } else element.style.removeProperty(property);
    }
    delete element.dataset.glassState;
    delete element.dataset.glassRenderer;
    state.backdrop = undefined;
    glassDom?.backdropChanged(element);
  }

  destroy() {
    this.disposed = true;
    this.stopMediaFrames();
    if (this.timer) clearTimeout(this.timer);
    if (this.motionFrame) cancelAnimationFrame(this.motionFrame);
    this.moving.clear();
    for (const [url, image] of this.pendingFrames) {
      image.src = "";
      releaseGlassFrame(url);
    }
    this.pendingFrames.clear();
    for (const release of this.captureFonts.values()) release();
    this.captureFonts.clear();
    this.removeListeners();
    for (const [element, state] of this.surfaces) {
      glassDom?.unobserve(element);
      this.releaseFrame(element, state);
    }
    this.surfaces.clear();
  }
}

export function acquireGlass(configuration?: GlassConfiguration) {
  const resolved = configuration ?? { id: "default" };
  let manager = managers.get(resolved.id);
  if (!manager) {
    glassDom ??= new GlassDom();
    manager = new GlassManager(resolved);
    managers.set(resolved.id, manager);
  } else if (
    "mode" in resolved ||
    "material" in resolved ||
    "options" in resolved ||
    "captureTarget" in resolved
  )
    manager.update(resolved, true);
  manager.leases++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--manager.leases > 0) return;
    manager.destroy();
    managers.delete(resolved.id);
    if (!managers.size) {
      glassDom?.destroy();
      glassDom = undefined;
      sharedSnapshots = new WeakMap();
      releaseGlassRenderers();
    }
  };
}

export function refreshGlass(id: string) {
  invalidateScene();
  managers.get(id)?.refresh();
}

export function refreshGlassTarget(target?: GlassCaptureTarget) {
  const element = target && "current" in target ? target.current : target;
  if (target !== undefined && !element) return;
  invalidateScene();
  for (const manager of managers.values())
    manager.refresh(element ?? undefined);
}

export function updateGlassConfiguration(configuration: GlassConfiguration) {
  managers.get(configuration.id)?.update(configuration);
}
