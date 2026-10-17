// Attributes whose changes can alter a surface's paint, state or ownership.
const GLASS_ATTRIBUTES = [
  "class",
  "style",
  "hidden",
  "inert",
  "data-glass",
  "data-frosted",
  "data-glass-scope",
  "data-glass-mounted",
  "data-glass-frozen",
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

const OWNED_STYLE =
  /--glass-(?:filter|edge|initial-edge-shadow|base|opacity):[^;]+;?/g;

function styleWithoutGlass(style: string | null) {
  return (style ?? "").replace(OWNED_STYLE, "").trim();
}

/** Style changes on a positioned surface that only move or resize it. */
export function geometryMutation(record: MutationRecord) {
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
    styleWithoutGlass(style)
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

/** Ignores the runtime's own writes and decorations. */
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
  if (record.type !== "attributes") return true;
  if (
    record.target instanceof Element &&
    record.attributeName !== null &&
    record.oldValue !== null &&
    record.oldValue === record.target.getAttribute(record.attributeName)
  )
    return false;
  if (
    record.attributeName === "style" &&
    record.target instanceof HTMLElement &&
    record.target.dataset.glass === "true"
  )
    return (
      styleWithoutGlass(record.oldValue) !==
      styleWithoutGlass(record.target.getAttribute("style"))
    );
  return true;
}

export type GlassObserver = {
  onResize(entries: ResizeObserverEntry[]): void;
  onMutation(records: MutationRecord[]): void;
  schedule(): void;
};

type Listener = {
  callbacks: Set<EventListener>;
  listener: EventListener;
  capture: boolean;
};

/** Document observation shared by every configuration group. */
export class GlassDom {
  private readonly owners = new Map<Element, GlassObserver>();
  private readonly mutationObserver: MutationObserver;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly listeners = new Map<EventTarget, Map<string, Listener>>();
  private groups?: Map<string, Set<HTMLElement>>;
  readonly appearance = window.matchMedia?.("(prefers-color-scheme: dark)");

  constructor(private readonly observers: () => Iterable<GlassObserver>) {
    this.resizeObserver = new ResizeObserver((entries) => {
      const batches = new Map<GlassObserver, ResizeObserverEntry[]>();
      for (const entry of entries) {
        const owner = this.owners.get(entry.target);
        if (!owner) continue;
        const batch = batches.get(owner);
        if (batch) batch.push(entry);
        else batches.set(owner, [entry]);
      }
      for (const [owner, batch] of batches) owner.onResize(batch);
    });
    // Surfaces that scroll into view get their filters on the next pass.
    this.intersectionObserver = new IntersectionObserver((entries) => {
      const owners = new Set<GlassObserver>();
      for (const entry of entries) {
        const owner = this.owners.get(entry.target);
        if (owner && entry.isIntersecting) owners.add(owner);
      }
      for (const owner of owners) owner.schedule();
    });
    this.mutationObserver = new MutationObserver((records) =>
      this.mutated(records),
    );
    // Text changes cannot repaint a surface; size changes reach the resize
    // observer instead.
    this.mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: GLASS_ATTRIBUTES,
      childList: true,
      subtree: true,
    });
  }

  private mutated(records: MutationRecord[]) {
    const relevant = records.filter(relevantMutation);
    if (!relevant.length) return;
    if (
      relevant.some(
        (record) =>
          record.type === "childList" ||
          [
            "data-glass",
            "data-frosted",
            "data-glass-scope",
            "data-glass-mounted",
          ].includes(record.attributeName ?? ""),
      )
    )
      this.groups = undefined;
    for (const observer of this.observers()) observer.onMutation(relevant);
  }

  /** Mounted surfaces of one configuration group. */
  discover(id: string) {
    // Include pending mounts before their MutationObserver callback is delivered.
    this.mutated(this.mutationObserver.takeRecords());
    if (!this.groups) {
      this.groups = new Map();
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-glass="true"]',
      )) {
        const scope = element.dataset.glassScope;
        if (!scope || element.dataset.glassMounted === "false") continue;
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

  observe(element: HTMLElement, owner: GlassObserver) {
    this.owners.set(element, owner);
    this.resizeObserver.observe(element);
    this.intersectionObserver.observe(element);
  }

  unobserve(element: HTMLElement) {
    this.owners.delete(element);
    this.resizeObserver.unobserve(element);
    this.intersectionObserver.unobserve(element);
  }

  /** Shares one native listener per target and event across all groups. */
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
      event = {
        callbacks,
        listener: (value) => {
          for (const handler of callbacks) handler(value);
        },
        capture:
          typeof options === "boolean" ? options : Boolean(options.capture),
      };
      events.set(type, event);
      target.addEventListener(type, event.listener, options);
    }
    const registered = event;
    registered.callbacks.add(callback);
    return () => {
      registered.callbacks.delete(callback);
      if (registered.callbacks.size) return;
      target.removeEventListener(type, registered.listener, registered.capture);
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
