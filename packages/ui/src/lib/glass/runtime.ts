import {
  failGlassRenderer,
  glassBaseOnly,
  prepareGlassRenderer,
  releaseGlassRenderers,
} from "./backend";
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
import { glassEdge, glassRadii, glassShadow } from "./edge";
import { glassIntensityDefaults } from "./intensity";
import type { GlassRenderer } from "./renderer";

const managers = new Map<string, GlassManager>();
let queue = Promise.resolve();
let nextSurface = 0;
const elementIds = new WeakMap<Element, number>();
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
      /--glass-(?:frame|edge|initial-edge-shadow|base|blur|opacity|tint-opacity):[^;]+;?/g,
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
  if (
    record.target instanceof Element &&
    record.target.closest("[data-glass-decoration]")
  )
    return false;
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

function nativeBackground(element: HTMLElement) {
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
    const background = style.backgroundColor;
    return parseColor(background)[3] > 0
      ? background
      : style.getPropertyValue("--popover").trim() || "#fff";
  } finally {
    probe.remove();
  }
}

type SurfaceState = {
  url?: string;
  base: string;
  tint: [number, number, number];
  opacity: number;
  materialKey?: string;
  frameMaterial?: string;
  frameKey?: string;
  edgeKey?: string;
  edgeDirty?: boolean;
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
  private materialsDirty = true;
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
    this.configuration = {
      ...configuration,
      mode: configuration.mode ?? "auto",
    };
    this.options = configuration.options ?? {};
    this.resizeObserver = new ResizeObserver((entries) => {
      let layoutChanged = false;
      for (const { target } of entries) {
        if (!(target instanceof HTMLElement)) continue;
        const state = this.surfaces.get(target);
        if (state) state.edgeDirty = true;
        const position = getComputedStyle(target).position;
        if (position !== "absolute" && position !== "fixed")
          layoutChanged = true;
      }
      if (layoutChanged) {
        this.materialsDirty = true;
        this.textContrast.invalidate();
        invalidateScene();
      }
      this.schedule(false, !layoutChanged);
    });
    this.intersectionObserver = new IntersectionObserver(() => this.schedule());
    this.observer = new MutationObserver((records) => {
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
          // Theme and semantic colors must update immediately, independently of capture throttling.
          for (const [element, state] of this.surfaces)
            if (visible(element)) this.updateMaterial(element, state);
          this.materialsDirty = false;
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
        "data-glass-intensity",
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
      this.materialsDirty = true;
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
    document.fonts?.addEventListener("loadingdone", fontUpdate);
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
      if (event.type === "transitionrun" && this.configuration.mode !== "css") {
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
      document.fonts?.removeEventListener("loadingdone", fontUpdate);
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

  prepare() {
    if (!this.disposed) void prepareGlassRenderer(this.configuration.mode);
  }

  update(configuration: GlassConfiguration, preserveSettings = false) {
    if (preserveSettings)
      configuration = { ...this.configuration, ...configuration };
    configuration = { ...configuration, mode: configuration.mode ?? "auto" };
    const previous = this.configuration;
    const same =
      previous.mode === configuration.mode &&
      previous.intensity === configuration.intensity &&
      previous.captureTarget === configuration.captureTarget &&
      (["strength", "blur", "tint", "tintOpacity", "highlight"] as const).every(
        (key) => previous.options?.[key] === configuration.options?.[key],
      );
    if (!same) {
      this.materialsDirty = true;
      this.configurationVersion++;
      this.textContrast.invalidate();
    }
    this.configuration = configuration;
    this.options = configuration.options ?? {};
    this.prepare();
    this.scan();
    if (configuration.mode === "css")
      for (const [element, state] of this.surfaces)
        this.restoreCss(element, state);
    this.schedule();
  }

  refresh() {
    this.materialsDirty = true;
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
      if (existing) continue;
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
    state.base = this.options.tint ?? nativeBackground(element);
    const tint = parseColor(state.base);
    state.tint = [tint[0], tint[1], tint[2]];
    state.opacity = clamp(
      this.options.tintOpacity,
      glassIntensityDefaults(element.dataset.glassIntensity).tintOpacity,
      0,
      1,
    );
    element.style.setProperty("--glass-base", state.base);
    this.updateEdge(element, state);
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
    }
  }

  private restoreCss(
    element: HTMLElement,
    state: SurfaceState,
    status: "css" | "fallback" = "css",
  ) {
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = undefined;
    state.frameKey = undefined;
    element.style.removeProperty("--glass-frame");
    element.dataset.glassState = status;
    delete element.dataset.glassRenderer;
  }

  private updateEdge(element: HTMLElement, state: SurfaceState) {
    state.edgeDirty = false;
    const defaults = glassIntensityDefaults(element.dataset.glassIntensity);
    element.style.setProperty(
      "--glass-blur",
      `${clamp(this.options.blur, defaults.blur, 0, 24)}px`,
    );
    element.style.setProperty(
      "--glass-opacity",
      `${clamp(this.options.tintOpacity, defaults.tintOpacity, 0, 1) * 100}%`,
    );
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
    ]);
    if (state.edgeKey === key) return;
    state.edgeKey = key;
    element.style.setProperty(
      "--glass-initial-edge-shadow",
      glassShadow(highlight),
    );
    element.style.setProperty(
      "--glass-edge",
      glassEdge(rect.width, rect.height, radii, highlight, color),
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
    if (this.materialsDirty) {
      this.materialsDirty = false;
      for (const [element, state] of active)
        this.updateMaterial(element, state);
    } else {
      for (const [element, state] of active)
        if (state.edgeDirty || this.moving.has(element))
          this.updateEdge(element, state);
    }
    if (glassBaseOnly(this.configuration.mode)) {
      for (const [element, state] of active) this.restoreCss(element, state);
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
    let backend = await prepareGlassRenderer(this.configuration.mode);
    if (!current()) return;
    if (!backend) {
      this.fallback();
      return;
    }
    const target = this.getTarget();
    const peers = [
      ...document.querySelectorAll<HTMLElement>('[data-glass="true"]'),
    ];
    for (const [element, state] of active) {
      if (element.dataset.glassFrozen === "true") continue;
      if (!current(element, state)) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      let blocked: Set<Element>;
      try {
        blocked = higherLayers(element);
      } catch {
        if (!state.url) element.dataset.glassState = "fallback";
        continue;
      }
      // All glass modules, including their content, are absent from the cloned background.
      for (const peer of peers) blocked.add(peer);
      let captureTarget = target.contains(element) ? target : document.body;
      if (captureTarget.closest('[data-glass="true"]'))
        captureTarget = document.body;
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
      const currentFrame = () => {
        if (element.dataset.glassFrozen === "true" || !current(element, state))
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
      const key = exclusions;
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
        try {
          snapshot = await captureGlassBackground(captureTarget, blocked);
        } catch {
          if (current(element, state) && !state.url)
            element.dataset.glassState = "fallback";
          continue;
        }
        if (!current(element, state)) return;
        if (cached.frames.size >= 4) cached.frames.clear();
        cached.frames.set(key, snapshot);
      }
      if (!currentFrame()) continue;
      const strength = clamp(this.options.strength, 22, 0, 64);
      const tint = parseColor(this.options.tint ?? state.base);
      const foreground = parseColor(style.color);
      const corners = glassRadii(
        rect.width,
        rect.height,
        surfaceRadii(element, rect, style),
      );
      const surfaceContrast = element.dataset.glassContrast === "surface";
      const frame = {
        width: rect.width,
        height: rect.height,
        margin: 0,
        origin: [rect.left, rect.top],
        radius: [corners[0].x, corners[1].x, corners[2].x, corners[3].x],
        radiusY: [corners[0].y, corners[1].y, corners[2].y, corners[3].y],
        strength,
        blur: clamp(
          this.options.blur,
          glassIntensityDefaults(element.dataset.glassIntensity).blur,
          0,
          24,
        ),
        tint: [tint[0], tint[1], tint[2]],
        tintOpacity: state.opacity,
        foreground: [foreground[0], foreground[1], foreground[2]],
        textColors: surfaceContrast
          ? undefined
          : this.textContrast.read(element),
        minimumContrast:
          element.getAttribute("aria-hidden") === "true" ? 0 : 4.5,
      } satisfies Parameters<GlassRenderer["render"]>[1];
      // Decode a complete frame before swapping; rendering failures walk down the shared chain.
      for (;;) {
        if (!backend) {
          if (currentFrame()) this.restoreCss(element, state, "fallback");
          break;
        }
        const frameKey = `${backend.kind}:${idFor(snapshot)}:${JSON.stringify(frame)}`;
        if (state.frameKey === frameKey && state.url) break;
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
            URL.revokeObjectURL(url);
            break;
          }
          const previous = state.url;
          state.url = url;
          state.frameKey = frameKey;
          element.style.setProperty("--glass-frame", `url("${url}")`);
          element.dataset.glassState = "ready";
          element.dataset.glassRenderer = backend.kind;
          if (previous) URL.revokeObjectURL(previous);
          break;
        } catch (error) {
          if (url && this.pendingFrames.delete(url)) URL.revokeObjectURL(url);
          if (!currentFrame()) break;
          if (error instanceof GlassContrastError) {
            this.restoreCss(element, state, "fallback");
            break;
          }
          failGlassRenderer(backend.kind);
          backend = await prepareGlassRenderer(this.configuration.mode);
        }
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
    element.style.removeProperty("--glass-initial-edge-shadow");
    element.style.removeProperty("--glass-blur");
    element.style.removeProperty("--glass-opacity");
    element.style.removeProperty("--glass-base");
    delete element.dataset.glassState;
    delete element.dataset.glassRenderer;
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
    "intensity" in resolved ||
    "options" in resolved ||
    "captureTarget" in resolved
  )
    manager.update(resolved, true);
  manager.leases++;
  manager.prepare();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--manager.leases > 0) return;
    manager.destroy();
    managers.delete(resolved.id);
    if (!managers.size) {
      sharedSnapshots = new WeakMap();
      releaseGlassRenderers();
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
