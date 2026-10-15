import type { RefObject } from "react";
import {
  failGlassRenderer,
  glassBaseOnly,
  prepareGlassRenderer,
  releaseGlassRenderers,
} from "@/lib/glass/backend";
import { parseGlassColor as parseColor } from "@/lib/glass/color";
import type {
  GlassConfiguration,
  GlassMaterial,
  GlassOptions,
} from "@/lib/glass/context";
import {
  glassDefaultEdge,
  glassDefaultMaterial,
  glassDefaults,
  glassMaterials,
} from "@/lib/glass/defaults";
import { GlassDom, type GlassObserver, geometryMutation } from "@/lib/glass/dom";
import { glassEdge, glassHighlight, glassRadii, glassShadow } from "@/lib/glass/edge";
import { glassLayoutSize, glassSurfaceRadii } from "@/lib/glass/geometry";
import { glassMaterial } from "@/lib/glass/material";
import type { SvgGlassRenderer } from "@/lib/glass/svg-renderer";

const managers = new Map<string, GlassManager>();
let glassDom: GlassDom | undefined;
let queue = Promise.resolve();

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
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    !element.closest("[hidden],[inert]") &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.right > 0 &&
    bounds.bottom > 0 &&
    bounds.left < innerWidth &&
    bounds.top < innerHeight
  );
}

/** Resolves tint and paint from a hidden clone, so live states stay untouched. */
function nativeMaterial(
  element: HTMLElement,
  options: GlassOptions,
  material: GlassMaterial,
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
    return glassMaterial({
      paint: parseColor(style.backgroundColor),
      tint: parseColor(style.getPropertyValue("--popover").trim() || "#fff"),
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
  "--glass-filter",
  "--glass-edge",
  "--glass-initial-edge-shadow",
  "--glass-opacity",
  "--glass-base",
] as const;

type SurfaceState = {
  // A DOM lease restores the caller's styles; React owns mounted surfaces' styles.
  styles?: {
    property: string;
    value: string;
    priority: string;
    written?: string;
  }[];
  svg?: SvgGlassRenderer;
  tint: [number, number, number];
  opacity: number;
  edgeKey?: string;
  edgeDirty?: boolean;
};

class GlassManager implements GlassObserver {
  leases = 0;
  private readonly surfaces = new Map<HTMLElement, SurfaceState>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;
  private queued = false;
  private dirty = false;
  private disposed = false;
  /** Every material needs reading, or only these surfaces' materials. */
  private materialsDirty = true;
  private readonly dirtyMaterials = new Set<HTMLElement>();
  private lastRender = 0;
  private lastResize = 0;
  private configuration: Required<
    Pick<GlassConfiguration, "id" | "material" | "edge">
  > &
    GlassConfiguration;
  private readonly removeListeners: () => void;

  constructor(configuration: GlassConfiguration) {
    this.configuration = this.resolve(configuration);
    this.scan();
    const dom = glassDom as GlassDom;
    const releases: (() => void)[] = [];
    const listen = (
      target: EventTarget,
      type: string,
      callback: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => releases.push(dom.listen(target, type, callback, options));
    const update = () => {
      this.materialsDirty = true;
      this.schedule();
    };
    listen(window, "resize", update);
    // Moving to a screen with another pixel ratio does not always fire resize.
    let releaseDensity: (() => void) | undefined;
    let ratio = window.devicePixelRatio;
    const density = () => {
      releaseDensity?.();
      ratio = window.devicePixelRatio;
      const query = window.matchMedia?.(`(resolution: ${ratio}dppx)`);
      releaseDensity =
        query &&
        dom.listen(query, "change", () => {
          if (window.devicePixelRatio === ratio) return;
          // Re-arm outside the dispatch that is still iterating listeners.
          queueMicrotask(density);
          update();
        });
    };
    density();
    releases.push(() => releaseDensity?.());
    if (dom.appearance) listen(dom.appearance, "change", update);
    listen(document, "visibilitychange", () => this.schedule());
    // Hover, focus and color transitions change the paint of the surfaces
    // around the target only.
    const interaction = (event: Event) => {
      if (event.target instanceof Element) this.invalidate(event.target);
    };
    for (const type of ["pointerover", "pointerout", "focusin", "focusout"])
      listen(document, type, interaction, true);
    const transition = (event: Event) => {
      if (
        ["color", "background-color", "opacity"].includes(
          (event as TransitionEvent).propertyName,
        )
      )
        interaction(event);
    };
    listen(document, "transitionend", transition, true);
    listen(document, "transitioncancel", transition, true);
    this.removeListeners = () => {
      for (const release of releases) release();
    };
    this.schedule();
  }

  private resolve(configuration: GlassConfiguration) {
    return {
      ...configuration,
      material: configuration.material ?? glassDefaultMaterial,
      edge: configuration.edge ?? glassDefaultEdge,
    };
  }

  onResize(entries: ResizeObserverEntry[]) {
    for (const { target } of entries) {
      const state = this.surfaces.get(target as HTMLElement);
      if (state) state.edgeDirty = true;
    }
    // A single resize updates on the next task. A surface that keeps
    // resizing, such as an animating sheet, settles first, so its normal map
    // and edge are rebuilt once instead of on every frame.
    const now = performance.now();
    const settling = now - this.lastResize < 150;
    this.lastResize = now;
    clearTimeout(this.resizeTimer);
    if (!settling) {
      this.schedule(true);
      return;
    }
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = undefined;
      this.schedule(true);
    }, 150);
  }

  onMutation(records: MutationRecord[]) {
    const surfaces = [...this.surfaces.keys()];
    const ownsScope = (node: Node) =>
      node instanceof Element &&
      (node.getAttribute("data-glass-scope") === this.configuration.id ||
        [...node.querySelectorAll("[data-glass-scope]")].some(
          (surface) =>
            surface.getAttribute("data-glass-scope") === this.configuration.id,
        ));
    // Paint inherits from ancestors; content inside a surface cannot change its fill.
    const relevant = records.filter((record) =>
      record.type === "childList"
        ? [...record.addedNodes, ...record.removedNodes].some(
            (node) =>
              ownsScope(node) ||
              surfaces.some((surface) => node.contains(surface)),
          )
        : ownsScope(record.target) ||
          (record.attributeName === "data-glass-scope" &&
            record.oldValue === this.configuration.id) ||
          surfaces.some((surface) => record.target.contains(surface)),
    );
    if (!relevant.length) return;
    if (relevant.every(geometryMutation)) {
      for (const record of relevant) {
        const state = this.surfaces.get(record.target as HTMLElement);
        if (state) state.edgeDirty = true;
      }
      this.schedule(true);
      return;
    }
    this.materialsDirty = true;
    this.scan();
    this.schedule();
  }

  update(configuration: GlassConfiguration, preserveSettings = false) {
    const next = this.resolve(
      preserveSettings
        ? { ...this.configuration, ...configuration }
        : configuration,
    );
    const previous = this.configuration;
    const same =
      previous.material === next.material &&
      previous.edge === next.edge &&
      (["strength", "tint", "tintOpacity"] as const).every(
        (key) => previous.options?.[key] === next.options?.[key],
      );
    this.configuration = next;
    if (!same) this.materialsDirty = true;
    this.scan();
    this.schedule();
  }

  refresh(target?: HTMLElement) {
    if (!target) {
      this.materialsDirty = true;
      this.schedule();
      return;
    }
    let found = false;
    for (const surface of this.surfaces.keys()) {
      if (!target.contains(surface)) continue;
      this.dirtyMaterials.add(surface);
      found = true;
    }
    if (found) this.schedule();
  }

  /** Marks the surfaces around an element for a fresh material read. */
  private invalidate(element: Element) {
    let found = false;
    for (const surface of this.surfaces.keys()) {
      if (!surface.contains(element)) continue;
      this.dirtyMaterials.add(surface);
      found = true;
    }
    if (found) this.schedule();
  }

  private scan() {
    const dom = glassDom as GlassDom;
    const elements = dom.discover(this.configuration.id);
    for (const [element, state] of this.surfaces) {
      if (elements.has(element)) continue;
      this.dirtyMaterials.delete(element);
      dom.unobserve(element);
      this.release(element, state);
      this.surfaces.delete(element);
    }
    for (const element of elements) {
      if (this.surfaces.has(element)) continue;
      const previous = dom.owner(element);
      if (previous && previous !== this)
        (previous as GlassManager).drop(element);
      const state: SurfaceState = {
        tint: [0, 0, 0],
        opacity: 0,
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

  private drop(element: HTMLElement) {
    const state = this.surfaces.get(element);
    if (!state) return;
    this.dirtyMaterials.delete(element);
    glassDom?.unobserve(element);
    this.release(element, state);
    this.surfaces.delete(element);
  }

  private updateMaterial(element: HTMLElement, state: SurfaceState) {
    const material = nativeMaterial(
      element,
      this.configuration.options ?? {},
      this.configuration.material,
    );
    state.tint = material.tint;
    state.opacity = material.opacity;
    this.writeStyle(
      element,
      state,
      "--glass-base",
      `rgb(${state.tint.map((channel) => Math.round(channel * 255)).join(", ")})`,
    );
    this.writeStyle(
      element,
      state,
      "--glass-opacity",
      `${state.opacity * 100}%`,
    );
    this.updateEdge(element, state);
  }

  private updateEdge(element: HTMLElement, state: SurfaceState) {
    state.edgeDirty = false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const radii = glassSurfaceRadii(element, rect, style);
    const color = parseColor(
      style.getPropertyValue("--foreground").trim() || style.color,
    );
    const pixelRatio = window.devicePixelRatio || 1;
    const highlight = glassHighlight(pixelRatio);
    const key = JSON.stringify([
      rect.width,
      rect.height,
      radii,
      color,
      state.tint,
      pixelRatio,
      this.configuration.edge,
    ]);
    if (state.edgeKey === key) return;
    state.edgeKey = key;
    this.writeStyle(
      element,
      state,
      "--glass-initial-edge-shadow",
      glassShadow(color, state.tint),
    );
    this.writeStyle(
      element,
      state,
      "--glass-edge",
      glassEdge(rect.width, rect.height, radii, {
        highlight,
        style: this.configuration.edge,
        color,
        background: state.tint,
        pixelRatio,
      }),
    );
  }

  /** Coalesces updates: geometry changes run on the next task, the rest throttle. */
  schedule(immediate = false) {
    if (this.disposed || document.hidden) return;
    this.dirty = true;
    if (this.timer || this.queued) return;
    const delay = immediate
      ? 0
      : Math.max(0, 100 - (performance.now() - this.lastRender));
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.disposed || document.hidden) return;
      this.queued = true;
      queue = queue
        .then(() => this.render())
        .catch(() => this.fallback())
        .finally(() => {
          this.queued = false;
          if (this.dirty && !this.disposed) this.schedule();
        });
    }, delay);
  }

  private async render() {
    if (this.disposed || document.hidden) return;
    this.dirty = false;
    this.lastRender = performance.now();
    this.scan();
    const active = [...this.surfaces].filter(([element]) => visible(element));
    if (!active.length) return;
    const all = this.materialsDirty;
    this.materialsDirty = false;
    for (const [element, state] of active) {
      if (all || this.dirtyMaterials.has(element))
        this.updateMaterial(element, state);
      else if (state.edgeDirty) this.updateEdge(element, state);
    }
    this.dirtyMaterials.clear();
    if (glassBaseOnly()) {
      for (const [element, state] of active) this.restoreCss(element, state);
      return;
    }
    const renderer = await prepareGlassRenderer();
    if (this.disposed) return;
    if (!renderer) {
      this.fallback();
      return;
    }
    for (const [element, state] of active) {
      if (
        element.dataset.glassFrozen === "true" ||
        this.surfaces.get(element) !== state
      )
        continue;
      // Opaque paint covers the backdrop and a disabled backdrop has nothing to
      // refract (the TabBar lens); their shared highlight remains visible.
      if (
        state.opacity === 1 ||
        getComputedStyle(element).backdropFilter === "none"
      ) {
        this.restoreCss(element, state);
        continue;
      }
      try {
        this.applySvg(element, state, renderer);
      } catch {
        failGlassRenderer();
        this.fallback();
        return;
      }
    }
  }

  private applySvg(
    element: HTMLElement,
    state: SurfaceState,
    renderer: SvgGlassRenderer,
  ) {
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
      strength: clamp(
        this.configuration.options?.strength,
        glassDefaults.strength,
        0,
        64,
      ),
      blur: glassMaterials[this.configuration.material].blur,
    });
    if (state.svg && state.svg !== renderer) state.svg.release(element);
    state.svg = renderer;
    if (element.style.getPropertyValue("--glass-filter") !== filter)
      this.writeStyle(element, state, "--glass-filter", filter);
    element.dataset.glassState = "ready";
    element.dataset.glassRenderer = "svg";
  }

  private restoreCss(
    element: HTMLElement,
    state: SurfaceState,
    status: "css" | "fallback" = "css",
  ) {
    state.svg?.release(element);
    state.svg = undefined;
    this.writeStyle(element, state, "--glass-filter", "");
    element.dataset.glassState = status;
    delete element.dataset.glassRenderer;
  }

  private fallback() {
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
    // A caller that rewrote the property since our last write owns the new value.
    if (
      saved?.written !== undefined &&
      (element.style.getPropertyValue(property) !== saved.written ||
        element.style.getPropertyPriority(property) !== "")
    ) {
      saved.value = element.style.getPropertyValue(property);
      saved.priority = element.style.getPropertyPriority(property);
    }
    element.style.setProperty(property, value);
    if (saved) saved.written = element.style.getPropertyValue(property);
  }

  private release(element: HTMLElement, state: SurfaceState) {
    state.svg?.release(element);
    for (const property of ownedStyles) {
      const saved = state.styles?.find((style) => style.property === property);
      if (!saved) {
        element.style.removeProperty(property);
        continue;
      }
      if (
        element.style.getPropertyValue(property) !== saved.written ||
        element.style.getPropertyPriority(property) !== ""
      )
        continue;
      element.style.setProperty(property, saved.value, saved.priority);
    }
    delete element.dataset.glassState;
    delete element.dataset.glassRenderer;
  }

  destroy() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    clearTimeout(this.resizeTimer);
    this.removeListeners();
    for (const [element, state] of this.surfaces) {
      glassDom?.unobserve(element);
      this.release(element, state);
    }
    this.surfaces.clear();
  }
}

export function acquireGlass(configuration?: GlassConfiguration) {
  const resolved = configuration ?? { id: "default" };
  let manager = managers.get(resolved.id);
  if (!manager) {
    glassDom ??= new GlassDom(() => managers.values());
    manager = new GlassManager(resolved);
    managers.set(resolved.id, manager);
  } else if (
    "material" in resolved ||
    "edge" in resolved ||
    "options" in resolved
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
      releaseGlassRenderers();
    }
  };
}

export type GlassTarget = HTMLElement | null | RefObject<HTMLElement | null>;

/** Re-measures materials and edges, for surfaces inside the target or everywhere. */
export function refreshGlass(target?: GlassTarget) {
  const element = target && "current" in target ? target.current : target;
  if (target !== undefined && !element) return;
  for (const manager of managers.values())
    manager.refresh(element ?? undefined);
}

export function updateGlassConfiguration(configuration: GlassConfiguration) {
  managers.get(configuration.id)?.update(configuration);
}
