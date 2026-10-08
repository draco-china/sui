import {
  acquireGlassCaptureFonts,
  captureGlassBackground,
  glassLayoutSize,
} from "./capture";
import type { GlassConfiguration, GlassOptions } from "./context";
import {
  GlassContrastError,
  GlassTextContrastCache,
  parseGlassColor as parseColor,
} from "./contrast";
import { glassEdge, glassRadii } from "./edge";
import type { GlassRenderer } from "./renderer";

const managers = new Map<string, GlassManager>();
let renderer: GlassRenderer | undefined;
let initialization: AbortController | undefined;
let queue = Promise.resolve();
let nextSurface = 0;
const elementIds = new WeakMap<Element, number>();
const backgroundVersions = new WeakMap<HTMLElement, number>();
let sceneRevision = 0;
let lastSnapshotTime = 0;
let sharedSnapshots = new WeakMap<
  HTMLElement,
  { revision: number; frames: Map<string, HTMLCanvasElement> }
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

function backgroundChanged(element: HTMLElement) {
  backgroundVersions.set(element, (backgroundVersions.get(element) ?? 0) + 1);
  for (const manager of managers.values()) manager.refreshDependency(element);
}

function overlaps(a: DOMRect, b: DOMRect) {
  return (
    a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom
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
  const style = getComputedStyle(element);
  return (
    element.isConnected &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.right > 0 &&
    bounds.bottom > 0 &&
    bounds.left < innerWidth &&
    bounds.top < innerHeight &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    !element.closest("[hidden],[inert],[data-closed]")
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

function higherLayers(surface: HTMLElement) {
  const blocked = new Set<Element>([surface]);
  if (surface.dataset.slot === "tab-bar-indicator") {
    const track = surface.closest('[data-slot="tab-bar-list"]');
    if (track) blocked.add(track);
  }
  if (surface.dataset.slot === "tabs-indicator") {
    for (const tab of surface.parentElement?.querySelectorAll('[role="tab"]') ??
      [])
      blocked.add(tab);
  }
  const rect = surface.getBoundingClientRect();
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
      !visible(candidate)
    )
      continue;
    const bounds = candidate.getBoundingClientRect();
    if (!overlaps(bounds, rect)) continue;
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

function styleWithoutFrame(style: string | null) {
  return (style ?? "")
    .replace(
      /--glass-(?:frame|edge|base|blur|opacity|tint-opacity):[^;]+;?/g,
      "",
    )
    .trim();
}

function geometryMutation(record: MutationRecord) {
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
  if (record.type === "attributes") {
    if (
      record.attributeName === "data-glass-state" ||
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

type SurfaceState = {
  url?: string;
  base: string;
  tint: [number, number, number];
  opacity: number;
  materialKey?: string;
  frameMaterial?: string;
  frameKey?: string;
};

class GlassManager {
  leases = 0;
  private surfaces = new Map<HTMLElement, SurfaceState>();
  private observer: MutationObserver;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queued = false;
  private disposed = false;
  private dirty = false;
  private scrollingDirty = false;
  private lastCapture = 0;
  private motionFrame = 0;
  private moving = new Map<HTMLElement, number>();
  private pendingFrames = new Map<string, HTMLImageElement>();
  private captureFonts = new Map<Document, () => void>();
  private options: GlassOptions;
  private configurationVersion = 0;
  private readonly textContrast = new GlassTextContrastCache();
  private removeListeners: () => void;

  constructor(private configuration: GlassConfiguration) {
    this.options = configuration.options ?? {};
    this.resizeObserver = new ResizeObserver(() => {
      this.textContrast.invalidate();
      if (!this.moving.size) invalidateScene();
      this.schedule();
    });
    this.intersectionObserver = new IntersectionObserver(() => this.schedule());
    this.observer = new MutationObserver((records) => {
      const relevant = records.filter(relevantMutation);
      if (relevant.length) {
        if (!relevant.every(geometryMutation)) this.textContrast.invalidate();
        if (!relevant.every(geometryMutation)) invalidateScene();
        this.scan();
        this.schedule();
      }
    });
    this.scan();
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "class",
        "style",
        "hidden",
        "inert",
        "data-glass",
        "data-glass-scope",
        "data-glass-material",
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
      ],
      childList: true,
      subtree: true,
      characterData: true,
    });
    const scroll = () => {
      invalidateScene();
      this.schedule(true);
    };
    const update = () => {
      this.textContrast.invalidate();
      invalidateScene();
      this.schedule();
    };
    const visibility = () => {
      if (document.hidden && this.timer) {
        clearTimeout(this.timer);
        this.timer = undefined;
      } else if (!document.hidden) this.schedule();
    };
    window.addEventListener("scroll", scroll, { capture: true, passive: true });
    window.addEventListener("resize", update);
    document.addEventListener("input", update, true);
    document.addEventListener("change", update, true);
    document.addEventListener("load", update, true);
    document.addEventListener("visibilitychange", visibility);
    document.fonts?.addEventListener("loadingdone", update);
    const interaction = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        [...this.surfaces.keys()].some((surface) => surface.contains(target))
      )
        update();
    };
    for (const type of ["pointerover", "pointerout", "focusin", "focusout"])
      document.addEventListener(type, interaction, true);
    const appearance = window.matchMedia?.("(prefers-color-scheme: dark)");
    appearance?.addEventListener("change", update);
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
      if (
        event.type === "transitionrun" &&
        this.configuration.mode === "auto"
      ) {
        this.moving.set(target, performance.now() + 3000);
        this.drawMotion();
      } else if (event.type !== "transitionrun") {
        this.moving.delete(target);
        this.schedule(false, true);
      }
    };
    document.addEventListener("transitionrun", transition, true);
    document.addEventListener("transitionend", transition, true);
    document.addEventListener("transitioncancel", transition, true);
    this.removeListeners = () => {
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("input", update, true);
      document.removeEventListener("change", update, true);
      document.removeEventListener("load", update, true);
      document.removeEventListener("visibilitychange", visibility);
      document.fonts?.removeEventListener("loadingdone", update);
      for (const type of ["pointerover", "pointerout", "focusin", "focusout"])
        document.removeEventListener(type, interaction, true);
      appearance?.removeEventListener("change", update);
      document.removeEventListener("transitionrun", transition, true);
      document.removeEventListener("transitionend", transition, true);
      document.removeEventListener("transitioncancel", transition, true);
    };
    this.schedule();
  }

  private drawMotion() {
    if (
      this.motionFrame ||
      this.disposed ||
      document.hidden ||
      this.configuration.mode !== "auto"
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

  update(configuration: GlassConfiguration) {
    const previous = this.configuration;
    const same =
      previous.mode === configuration.mode &&
      previous.material === configuration.material &&
      previous.captureTarget === configuration.captureTarget &&
      (["strength", "blur", "tint", "tintOpacity", "highlight"] as const).every(
        (key) => previous.options?.[key] === configuration.options?.[key],
      );
    if (!same) {
      this.configurationVersion++;
      this.textContrast.invalidate();
    }
    this.configuration = configuration;
    this.options = configuration.options ?? {};
    this.scan();
    if (configuration.mode !== "auto")
      for (const [element, state] of this.surfaces)
        this.restoreCss(element, state);
    this.schedule();
  }

  refreshDependency(background: HTMLElement) {
    if (
      this.disposed ||
      this.configuration.mode !== "auto" ||
      !visible(background)
    )
      return;
    const bounds = background.getBoundingClientRect();
    for (const [element] of this.surfaces) {
      if (
        element === background ||
        !visible(element) ||
        !overlaps(bounds, element.getBoundingClientRect())
      )
        continue;
      const target = this.getTarget();
      const captureTarget = target.contains(element) ? target : document.body;
      if (!captureTarget.contains(background)) continue;
      let blocked: Set<Element>;
      try {
        blocked = higherLayers(element);
      } catch {
        this.schedule();
        return;
      }
      if ([...blocked].some((item) => item.contains(background))) continue;
      this.schedule();
      return;
    }
  }

  refresh() {
    this.textContrast.invalidate();
    this.schedule();
  }

  private scan() {
    const elements = new Set(
      [...document.querySelectorAll<HTMLElement>('[data-glass="true"]')].filter(
        (element) => element.dataset.glassScope === this.configuration.id,
      ),
    );
    for (const [element, state] of this.surfaces) {
      if (elements.has(element)) continue;
      this.resizeObserver.unobserve(element);
      this.intersectionObserver.unobserve(element);
      this.releaseFrame(element, state);
      this.surfaces.delete(element);
    }
    for (const element of elements) {
      const existing = this.surfaces.get(element);
      if (existing) {
        this.updateMaterial(element, existing);
        continue;
      }
      const state: SurfaceState = { base: "", tint: [0, 0, 0], opacity: 0 };
      this.surfaces.set(element, state);
      this.updateMaterial(element, state);
      element.dataset.glassState = "loading";
      this.resizeObserver.observe(element);
      this.intersectionObserver.observe(element);
    }
  }

  private updateMaterial(element: HTMLElement, state: SurfaceState) {
    const oldState = element.dataset.glassState;
    delete element.dataset.glassState;
    const original = getComputedStyle(element);
    const background = original.backgroundColor;
    const base =
      parseColor(background)[3] > 0
        ? background
        : original.getPropertyValue("--popover").trim() || "#fff";
    if (oldState) element.dataset.glassState = oldState;
    state.base = this.options.tint ?? base;
    const tint = parseColor(state.base);
    state.tint = [tint[0], tint[1], tint[2]];
    state.opacity = clamp(
      this.options.tintOpacity,
      element.dataset.glassMaterial === "clear" ? 0.6 : 0.78,
      0,
      1,
    );
    element.style.setProperty("--glass-base", state.base);
    this.updateEdge(element);
    const frameMaterial = JSON.stringify([
      state.base,
      state.opacity,
      element.style.getPropertyValue("--glass-blur"),
    ]);
    const materialKey = JSON.stringify([
      frameMaterial,
      element.style.getPropertyValue("--glass-edge"),
    ]);
    if (state.materialKey !== materialKey) {
      state.materialKey = materialKey;
      if (oldState === "ready" && state.frameMaterial !== frameMaterial) {
        this.restoreCss(element, state);
      }
      state.frameMaterial = frameMaterial;
      backgroundChanged(element);
    }
  }

  private restoreCss(
    element: HTMLElement,
    state: SurfaceState,
    status: "css" | "fallback" = "css",
  ) {
    const changed = Boolean(state.url || state.frameKey);
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = undefined;
    state.frameKey = undefined;
    element.style.removeProperty("--glass-frame");
    element.dataset.glassState = status;
    if (changed) backgroundChanged(element);
  }

  private updateEdge(element: HTMLElement) {
    const clear = element.dataset.glassMaterial === "clear";
    element.style.setProperty(
      "--glass-blur",
      `${clamp(this.options.blur, clear ? 6 : 8, 0, 24)}px`,
    );
    element.style.setProperty(
      "--glass-opacity",
      `${clamp(this.options.tintOpacity, clear ? 0.6 : 0.78, 0, 1) * 100}%`,
    );
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    element.style.setProperty(
      "--glass-edge",
      glassEdge(
        rect.width,
        rect.height,
        surfaceRadii(element, rect, style),
        clamp(this.options.highlight, 0.3, 0, 1),
      ),
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

  private async capture() {
    if (this.disposed || document.hidden) return;
    this.dirty = false;
    const snapshotInterval = this.scrollingDirty ? 100 : 200;
    this.scrollingDirty = false;
    this.lastCapture = performance.now();
    const configurationVersion = this.configurationVersion;
    const capturedRevision = sceneRevision;
    this.scan();
    const active = [...this.surfaces].filter(([element]) => visible(element));
    if (!active.length) return;
    for (const [element, state] of active) this.updateMaterial(element, state);
    if (
      this.configuration.mode !== "auto" ||
      window.matchMedia?.(
        "(prefers-reduced-transparency: reduce), (forced-colors: active)",
      ).matches
    ) {
      for (const [element, state] of active) {
        this.restoreCss(element, state);
      }
      return;
    }
    const current = (element?: HTMLElement, state?: SurfaceState) =>
      !this.disposed &&
      !document.hidden &&
      this.configurationVersion === configurationVersion &&
      sceneRevision === capturedRevision &&
      (!element ||
        (visible(element) &&
          element.dataset.glass === "true" &&
          element.dataset.glassScope === this.configuration.id &&
          this.surfaces.get(element) === state));
    if (!current()) return;
    if (!renderer) {
      const controller = new AbortController();
      initialization = controller;
      try {
        const { GlassRenderer: Renderer } = await import("./renderer");
        const created = await Renderer.create(controller.signal);
        if (!managers.size) {
          created.destroy();
          return;
        }
        renderer = created;
      } finally {
        if (initialization === controller) initialization = undefined;
      }
    }
    if (!current()) return;
    const target = this.getTarget();
    const peers = [
      ...document.querySelectorAll<HTMLElement>('[data-glass="true"]'),
    ].filter(visible);
    for (const [element, state] of active) {
      if (!current(element, state)) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const blocked = higherLayers(element);
      // Disjoint peers cannot contribute to each other's background: omit them in the shared capture.
      for (const peer of peers) {
        const peerRect = peer.getBoundingClientRect();
        if (
          peer === element ||
          (!peer.contains(element) &&
            !element.contains(peer) &&
            (peerRect.right <= rect.left ||
              peerRect.left >= rect.right ||
              peerRect.bottom <= rect.top ||
              peerRect.top >= rect.bottom))
        )
          blocked.add(peer);
      }
      const captureTarget = target.contains(element) ? target : document.body;
      const captureDocument = captureTarget.ownerDocument;
      if (!this.captureFonts.has(captureDocument))
        this.captureFonts.set(
          captureDocument,
          acquireGlassCaptureFonts(captureDocument),
        );
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
      const dependencyKey = () =>
        peers
          .filter(
            (peer) =>
              captureTarget.contains(peer) &&
              ![...blocked].some((item) => item.contains(peer)),
          )
          .map((peer) => `${idFor(peer)}:${backgroundVersions.get(peer) ?? 0}`)
          .sort()
          .join(",");
      const dependencies = dependencyKey();
      const currentFrame = () => {
        if (!current(element, state) || dependencies !== dependencyKey())
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
      const key = `${exclusions}|${dependencies}`;
      let cached = sharedSnapshots.get(captureTarget);
      if (!cached || cached.revision !== sceneRevision) {
        cached = { revision: sceneRevision, frames: new Map() };
        sharedSnapshots.set(captureTarget, cached);
      }
      let snapshot = cached.frames.get(key);
      if (!snapshot) {
        const delay = snapshotInterval - (performance.now() - lastSnapshotTime);
        if (delay > 0)
          await new Promise((resolve) => setTimeout(resolve, delay));
        if (!currentFrame()) return;
        lastSnapshotTime = performance.now();
        snapshot = await captureGlassBackground(captureTarget, blocked);
        if (!currentFrame()) return;
        if (cached.frames.size >= 4) cached.frames.clear();
        cached.frames.set(key, snapshot);
      }
      if (!currentFrame()) continue;
      const strength = clamp(this.options.strength, 22, 0, 64);
      const tint = parseColor(this.options.tint ?? state.base);
      const foreground = parseColor(style.color);
      const surfaceBlur = Number.parseFloat(
        style.getPropertyValue("--glass-surface-blur"),
      );
      const surfaceOpacity = Number.parseFloat(
        style.getPropertyValue("--glass-surface-tint-opacity"),
      );
      const corners = glassRadii(
        rect.width,
        rect.height,
        surfaceRadii(element, rect, style),
      );
      const frame = {
        width: rect.width,
        height: rect.height,
        margin: 0,
        origin: [rect.left, rect.top],
        radius: [corners[0].x, corners[1].x, corners[2].x, corners[3].x],
        radiusY: [corners[0].y, corners[1].y, corners[2].y, corners[3].y],
        strength,
        blur: clamp(
          Number.isFinite(surfaceBlur) ? surfaceBlur : this.options.blur,
          element.dataset.glassMaterial === "clear" ? 6 : 8,
          0,
          24,
        ),
        tint: [tint[0], tint[1], tint[2]],
        tintOpacity: clamp(
          Number.isFinite(surfaceOpacity)
            ? surfaceOpacity
            : this.options.tintOpacity,
          state.opacity,
          0,
          1,
        ),
        foreground: [foreground[0], foreground[1], foreground[2]],
        textColors: this.textContrast.read(element),
        minimumContrast:
          element.getAttribute("aria-hidden") === "true" ? 0 : 4.5,
        highlight: clamp(this.options.highlight, 0.3, 0, 1),
      } satisfies Parameters<GlassRenderer["render"]>[1];
      let blob: Blob;
      try {
        blob = await renderer.render(snapshot, frame);
      } catch (error) {
        if (!(error instanceof GlassContrastError)) throw error;
        if (currentFrame()) this.restoreCss(element, state, "fallback");
        continue;
      }
      if (!currentFrame()) continue;
      const url = URL.createObjectURL(blob);
      const image = new window.Image();
      this.pendingFrames.set(url, image);
      image.src = url;
      try {
        await image.decode();
      } catch {
        if (this.pendingFrames.delete(url)) URL.revokeObjectURL(url);
        if (currentFrame() && !state.url)
          element.dataset.glassState = "fallback";
        continue;
      }
      if (!this.pendingFrames.delete(url)) continue;
      if (!currentFrame()) {
        URL.revokeObjectURL(url);
        continue;
      }
      const previous = state.url;
      state.url = url;
      element.style.setProperty("--glass-frame", `url("${url}")`);
      element.dataset.glassState = "ready";
      if (previous) URL.revokeObjectURL(previous);
      const frameKey = `${idFor(snapshot)}:${JSON.stringify(frame)}`;
      if (state.frameKey !== frameKey) {
        state.frameKey = frameKey;
        backgroundChanged(element);
      }
    }
  }

  private fallback() {
    for (const [element, state] of this.surfaces)
      this.restoreCss(element, state, "fallback");
  }

  private releaseFrame(element: HTMLElement, state: SurfaceState) {
    if (state.url) URL.revokeObjectURL(state.url);
    element.style.removeProperty("--glass-frame");
    element.style.removeProperty("--glass-edge");
    element.style.removeProperty("--glass-blur");
    element.style.removeProperty("--glass-opacity");
    element.style.removeProperty("--glass-base");
    delete element.dataset.glassState;
  }

  destroy() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.motionFrame) cancelAnimationFrame(this.motionFrame);
    this.moving.clear();
    for (const [url, image] of this.pendingFrames) {
      image.src = "";
      URL.revokeObjectURL(url);
    }
    this.pendingFrames.clear();
    for (const release of this.captureFonts.values()) release();
    this.captureFonts.clear();
    this.observer.disconnect();
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.removeListeners();
    for (const [element, state] of this.surfaces)
      this.releaseFrame(element, state);
    this.surfaces.clear();
  }
}

export function acquireGlass(configuration?: GlassConfiguration) {
  const resolved = configuration ?? { id: "default" };
  let manager = managers.get(resolved.id);
  if (!manager) {
    manager = new GlassManager(resolved);
    managers.set(resolved.id, manager);
  } else if (
    "mode" in resolved ||
    "material" in resolved ||
    "options" in resolved ||
    "captureTarget" in resolved
  )
    manager.update(resolved);
  manager.leases++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--manager.leases > 0) return;
    manager.destroy();
    managers.delete(resolved.id);
    if (!managers.size) {
      sharedSnapshots = new WeakMap();
      initialization?.abort();
      renderer?.destroy();
      renderer = undefined;
    }
  };
}

export function refreshGlass(id: string) {
  invalidateScene();
  managers.get(id)?.refresh();
}

export function updateGlassConfiguration(configuration: GlassConfiguration) {
  managers.get(configuration.id)?.update(configuration);
}
