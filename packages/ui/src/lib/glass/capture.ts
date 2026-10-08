type CaptureOptions = NonNullable<
  Parameters<typeof import("html-to-image").toSvg>[1]
>;

let library: Promise<typeof import("html-to-image")> | undefined;
type FontVersion = {
  value: number;
  leases: number;
  changed: () => void;
  cache: WeakMap<HTMLElement, { key: string; css: Promise<string> }>;
};
const fontVersions = new WeakMap<Document, FontVersion>();
const marker = "data-glass-capture-id";
let sequence = 0;
let capturing = false;
const unfinishedSamples = new Set<Promise<unknown>>();

function loadLibrary() {
  library ??= import("html-to-image").catch((error) => {
    library = undefined;
    throw error;
  });
  return library;
}

function bounded<T>(operation: Promise<T>, milliseconds: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Glass background capture timed out")),
      milliseconds,
    );
    operation.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function sample<T>(operation: Promise<T>, milliseconds: number) {
  // html-to-image has no cancellation API. A deadline returns to the CSS
  // fallback, but the real font/DOM task keeps the sampling lease until it ends.
  unfinishedSamples.add(operation);
  const release = () => unfinishedSamples.delete(operation);
  void operation.then(release, release);
  return bounded(operation, milliseconds);
}

function included(
  element: Element,
  blocked: Set<Element>,
  keepPlaceholder = false,
) {
  return (
    !element.closest(
      "script,iframe,video,[data-glass-exclude],[data-glass-decoration]",
    ) &&
    !Array.from(blocked).some(
      (item) =>
        (item === element && !keepPlaceholder) ||
        (item !== element && item.contains(element)),
    )
  );
}

type Placement = {
  element: HTMLElement;
  id: string;
  previous: string | null;
  rect: DOMRect;
  scrollLeft: number;
  scrollTop: number;
  pinned: boolean;
  hidden: boolean;
};

export function glassLayoutSize(
  element: HTMLElement,
  rect = element.getBoundingClientRect(),
) {
  const style = getComputedStyle(element);
  const dimension = (axis: "width" | "height") => {
    const value = Number.parseFloat(style[axis]);
    if (Number.isFinite(value) && value > 0) {
      if (style.boxSizing === "border-box") return value;
      const sides = axis === "width" ? ["Left", "Right"] : ["Top", "Bottom"];
      return (
        value +
        sides.reduce(
          (sum, side) =>
            sum +
            (Number.parseFloat(
              style.getPropertyValue(`padding-${side.toLowerCase()}`),
            ) || 0) +
            (Number.parseFloat(
              style.getPropertyValue(`border-${side.toLowerCase()}-width`),
            ) || 0),
          0,
        )
      );
    }
    return (
      (axis === "width" ? element.offsetWidth : element.offsetHeight) ||
      rect[axis]
    );
  };
  return { width: dimension("width"), height: dimension("height") };
}

function axisAligned(element: HTMLElement) {
  for (
    let current: HTMLElement | null = element;
    current;
    current = current.parentElement
  ) {
    const style = getComputedStyle(current);
    if (style.perspective && style.perspective !== "none") return false;
    if (
      style.rotate &&
      style.rotate !== "none" &&
      !/^0(?:deg|rad|turn)?$/.test(style.rotate)
    )
      return false;
    if (style.scale && style.scale !== "none") {
      const scale = style.scale.split(/\s+/).map(Number);
      if (scale.some((value) => !Number.isFinite(value) || value <= 0))
        return false;
    }
    const transform = style.transform;
    if (!transform || transform === "none") continue;
    const matrix = transform.match(/^matrix\(([^)]+)\)$/);
    if (matrix) {
      const values = matrix[1].split(",").map(Number);
      const [a, b, c, d, x, y] = values;
      if (
        values.length === 6 &&
        a > 0 &&
        d > 0 &&
        b === 0 &&
        c === 0 &&
        Number.isFinite(x) &&
        Number.isFinite(y)
      )
        continue;
    }
    const matrix3d = transform.match(/^matrix3d\(([^)]+)\)$/);
    if (matrix3d) {
      const values = matrix3d[1].split(",").map(Number);
      if (
        values.length === 16 &&
        values.every(Number.isFinite) &&
        values[0] > 0 &&
        values[5] > 0 &&
        values[10] === 1 &&
        values[15] === 1 &&
        [1, 2, 3, 4, 6, 7, 8, 9, 11, 14].every((index) => values[index] === 0)
      )
        continue;
    }
    return false;
  }
  return true;
}

function prepare(
  target: HTMLElement,
  blocked: Set<Element>,
  placements: Placement[],
) {
  for (const element of [
    target,
    ...target.querySelectorAll<HTMLElement>("*"),
  ]) {
    if (!included(element, blocked, true)) continue;
    const position = getComputedStyle(element).position;
    const hidden = blocked.has(element);
    const pinned =
      element !== target && (position === "fixed" || position === "sticky");
    if (!hidden && !pinned && !element.scrollTop && !element.scrollLeft)
      continue;
    const id = String(++sequence);
    placements.push({
      element,
      id,
      previous: element.getAttribute(marker),
      rect: element.getBoundingClientRect(),
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
      pinned,
      hidden,
    });
    element.setAttribute(marker, id);
  }
  return placements;
}

function restore(placements: Placement[]) {
  for (const { element, previous } of placements) {
    if (previous === null) element.removeAttribute(marker);
    else element.setAttribute(marker, previous);
  }
}

function repairClone(
  root: Element,
  placements: Placement[],
  target: HTMLElement,
) {
  const clones = new Map<HTMLElement, HTMLElement>();
  for (const item of placements) {
    const clone = root.matches(`[${marker}="${item.id}"]`)
      ? root
      : root.querySelector(`[${marker}="${item.id}"]`);
    if (clone) clones.set(item.element, clone as HTMLElement);
  }
  for (const item of placements) {
    const clone = clones.get(item.element);
    if (!clone) continue;
    if (item.hidden) {
      clone.style.visibility = "hidden";
      clone.style.backgroundImage = "none";
      clone.style.maskImage = "none";
      for (const attribute of ["src", "srcset", "href", "xlink:href"])
        clone.removeAttribute(attribute);
      clone.replaceChildren();
      continue;
    }
    if (!item.pinned) continue;
    let parent = item.element.parentElement;
    while (parent && parent !== target) {
      const style = getComputedStyle(parent);
      if (
        style.position !== "static" ||
        style.transform !== "none" ||
        parent.scrollTop ||
        parent.scrollLeft
      )
        break;
      parent = parent.parentElement;
    }
    parent ??= target;
    const bounds = parent.getBoundingClientRect();
    if (!axisAligned(parent) || !axisAligned(item.element))
      throw new Error("Glass pinned content has unsupported geometry");
    const parentSize = glassLayoutSize(parent, bounds);
    const scaleX = bounds.width / parentSize.width;
    const scaleY = bounds.height / parentSize.height;
    const width = item.rect.width / scaleX;
    const height = item.rect.height / scaleY;
    const itemSize = glassLayoutSize(item.element, item.rect);
    const localScaleX = width / itemSize.width;
    const localScaleY = height / itemSize.height;
    const scrollContainer = Boolean(parent.scrollTop || parent.scrollLeft);
    const padding = getComputedStyle(parent);
    const paddingTop = scrollContainer
      ? Number.parseFloat(padding.paddingTop) || 0
      : 0;
    const paddingLeft = scrollContainer
      ? Number.parseFloat(padding.paddingLeft) || 0
      : 0;
    if (getComputedStyle(item.element).position === "sticky") {
      const placeholder = clone.ownerDocument.createElement("div");
      placeholder.style.cssText = `width:${itemSize.width}px;height:${itemSize.height}px;flex-shrink:0;visibility:hidden`;
      clone.before(placeholder);
    }
    Object.assign(clone.style, {
      position: "absolute",
      top: `${(item.rect.top - bounds.top) / scaleY - parent.clientTop - paddingTop + parent.scrollTop}px`,
      left: `${(item.rect.left - bounds.left) / scaleX - parent.clientLeft - paddingLeft + parent.scrollLeft}px`,
      right: "auto",
      bottom: "auto",
      width: `${itemSize.width}px`,
      height: `${itemSize.height}px`,
      boxSizing: "border-box",
      margin: "0",
      transform:
        localScaleX === 1 && localScaleY === 1
          ? "none"
          : `scale(${localScaleX},${localScaleY})`,
      transformOrigin: "0 0",
      translate: "none",
      rotate: "none",
      scale: "none",
      zoom: "1",
    });
  }
  // Scroll offsets are not serialized by foreignObject. Move only the clone's
  // contents, retaining the original scroll container's clipping and background.
  for (const item of placements) {
    const clone = clones.get(item.element);
    if (!clone || item.hidden || (!item.scrollLeft && !item.scrollTop))
      continue;
    if (clone.matches("input,textarea,select")) {
      if (item.scrollLeft || item.scrollTop)
        throw new Error(
          "Scrolled native form content cannot be captured faithfully",
        );
      continue;
    }
    const contents = clone.ownerDocument.createElement("div");
    const style = getComputedStyle(item.element);
    const paddingX =
      (Number.parseFloat(style.paddingLeft) || 0) +
      (Number.parseFloat(style.paddingRight) || 0);
    const paddingY =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0);
    const width = item.element.clientWidth || item.rect.width;
    const height = item.element.clientHeight || item.rect.height;
    contents.style.cssText = `position:relative;width:${Math.max(0, width - paddingX)}px;height:${Math.max(0, height - paddingY)}px;transform:translate(${-item.scrollLeft}px,${-item.scrollTop}px);transform-origin:0 0`;
    for (const property of [
      "display",
      "flex-direction",
      "flex-wrap",
      "justify-content",
      "align-items",
      "align-content",
      "gap",
      "row-gap",
      "column-gap",
      "grid-template-columns",
      "grid-template-rows",
      "grid-auto-columns",
      "grid-auto-rows",
      "grid-auto-flow",
    ])
      contents.style.setProperty(property, style.getPropertyValue(property));
    clone.style.display = "block";
    contents.append(...clone.childNodes);
    clone.append(contents);
  }
  for (const clone of [root, ...root.querySelectorAll(`[${marker}]`)])
    clone.removeAttribute(marker);
  // html-to-image embeds the resolved background-image, but also copies the
  // original custom properties. A retained parent's blob-backed frame variable
  // is redundant in the clone and is not an external resource to fetch again.
  for (const clone of [
    root,
    ...root.querySelectorAll<HTMLElement>("[style]"),
  ]) {
    const style = (clone as HTMLElement).style;
    if (!style) continue;
    for (const property of Array.from(style)) {
      if (property.startsWith("--glass-")) style.removeProperty(property);
    }
  }
}

function fontVersion(document: Document) {
  let version = fontVersions.get(document);
  if (!version) {
    version = { value: 0, leases: 0, changed: () => {}, cache: new WeakMap() };
    const current = version;
    version.changed = () => current.value++;
    fontVersions.set(document, version);
  }
  return version;
}

export function acquireGlassCaptureFonts(document: Document) {
  const version = fontVersion(document);
  if (version.leases++ === 0) {
    // Fonts may have changed while no scope was sampling this document.
    version.value++;
    document.fonts?.addEventListener("loadingdone", version.changed);
    document.fonts?.addEventListener("loadingerror", version.changed);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--version.leases > 0) return;
    document.fonts?.removeEventListener("loadingdone", version.changed);
    document.fonts?.removeEventListener("loadingerror", version.changed);
    version.cache = new WeakMap();
  };
}

function fontKey(target: HTMLElement) {
  const version = fontVersion(target.ownerDocument);
  const families = new Set<string>();
  for (const node of [target, ...target.querySelectorAll("*")])
    families.add(getComputedStyle(node).fontFamily);
  const sheets = Array.from(target.ownerDocument.styleSheets, (sheet) => {
    try {
      return `${sheet.href ?? ""}:${Array.from(sheet.cssRules, (rule) => rule.cssText).join("")}`;
    } catch {
      return sheet.href ?? "";
    }
  });
  return `${sheets.join("|")}|${Array.from(families).sort().join("|")}|${target.ownerDocument.fonts?.status}|${version.value}`;
}

async function embeddedFonts(target: HTMLElement) {
  const key = fontKey(target);
  const fontCache = fontVersion(target.ownerDocument).cache;
  let cached = fontCache.get(target);
  if (cached?.key !== key) {
    const { getFontEmbedCSS } = await loadLibrary();
    const css = sample(
      getFontEmbedCSS(target, { preferredFontFormat: "woff2" }),
      4000,
    );
    cached = { key, css };
    fontCache.set(target, cached);
    css.catch(() => {
      if (fontCache.get(target)?.css === css) fontCache.delete(target);
    });
  }
  return cached.css;
}

async function imageReadiness(target: HTMLElement, blocked: Set<Element>) {
  const images = [
    ...(target.matches("img") ? [target as HTMLImageElement] : []),
    ...target.querySelectorAll<HTMLImageElement>("img"),
  ];
  await Promise.all(
    images.map(async (image) => {
      if (!included(image, blocked) || !image.getAttribute("src")) return;
      if (!image.complete) await bounded(image.decode(), 3000);
      if (!image.naturalWidth)
        throw new Error("Glass background contains a failed image");
    }),
  );
}

function validateResources(root: Element) {
  for (const image of root.querySelectorAll("img,image")) {
    const source =
      image.getAttribute("src") ??
      image.getAttribute("href") ??
      image.getAttribute("xlink:href");
    if (source && !source.startsWith("data:"))
      throw new Error("Glass background contains an unreadable image");
    if (source === "")
      throw new Error("Glass background image embedding failed");
  }
  const source = [root, ...root.querySelectorAll("*")]
    .map(
      (element) =>
        `${element.getAttribute("style") ?? ""}${element.localName === "style" ? element.textContent : ""}`,
    )
    .join("\n");
  for (const match of source.matchAll(
    /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^)'"\s]*))\s*\)/g,
  )) {
    const resource = match[1] ?? match[2] ?? match[3] ?? "";
    if (
      !resource ||
      (!resource.startsWith("data:") && !resource.startsWith("#"))
    )
      throw new Error("Glass background resource embedding failed");
  }
}

async function captureBackground(
  target: HTMLElement,
  blocked: Set<Element>,
): Promise<HTMLCanvasElement> {
  if (!target.isConnected || !included(target, blocked))
    throw new Error("Glass capture target unavailable");
  const bounds = target.getBoundingClientRect();
  if (!bounds.width || !bounds.height || !axisAligned(target))
    throw new Error("Glass capture target has unsupported geometry");
  const size = glassLayoutSize(target, bounds);
  const scaleX = bounds.width / size.width;
  const scaleY = bounds.height / size.height;
  await bounded(target.ownerDocument.fonts?.ready ?? Promise.resolve(), 1500);
  await imageReadiness(target, blocked);
  const { toSvg } = await loadLibrary();
  const fontEmbedCSS = await embeddedFonts(target);
  const placements: Placement[] = [];
  let svg: string;
  try {
    prepare(target, blocked, placements);
    const options: CaptureOptions = {
      width: size.width,
      height: size.height,
      fontEmbedCSS,
      pixelRatio: 1,
      style: {
        position: "relative",
        left: "0",
        top: "0",
        margin: "0",
        width: `${size.width}px`,
        height: `${size.height}px`,
        boxSizing: "border-box",
        maxWidth: "none",
        maxHeight: "none",
        animation: "none",
        transition: "none",
        transform: "none",
        translate: "none",
        scale: "none",
        rotate: "none",
        zoom: "1",
      },
      filter: (node) =>
        !(node instanceof Element) || included(node, blocked, true),
      onImageErrorHandler: (event) => {
        const failed = typeof event === "string" ? null : event.target;
        const marked =
          failed instanceof Element ? failed.closest(`[${marker}]`) : null;
        if (
          marked &&
          placements.some(
            (item) => item.hidden && marked.getAttribute(marker) === item.id,
          )
        )
          return;
        throw new Error("Glass background image embedding failed");
      },
    };
    svg = await sample(toSvg(target, options), 6000);
  } finally {
    restore(placements);
  }
  const comma = svg.indexOf(",");
  if (comma < 0 || !svg.startsWith("data:image/svg+xml"))
    throw new Error("Invalid glass capture SVG");
  const source = svg.slice(comma + 1);
  const xml = new DOMParser().parseFromString(
    svg.slice(0, comma).includes(";base64")
      ? new TextDecoder().decode(
          Uint8Array.from(atob(source), (character) => character.charCodeAt(0)),
        )
      : decodeURIComponent(source),
    "image/svg+xml",
  );
  if (xml.querySelector("parsererror"))
    throw new Error("Invalid glass capture SVG");
  const root = xml.documentElement;
  const foreign = root.querySelector("foreignObject");
  const content = foreign?.firstElementChild;
  if (!foreign || !content) throw new Error("Glass capture content missing");
  repairClone(content, placements, target);
  validateResources(root);
  root.setAttribute("width", String(innerWidth));
  root.setAttribute("height", String(innerHeight));
  root.setAttribute("viewBox", `0 0 ${innerWidth} ${innerHeight}`);
  foreign.setAttribute(
    "x",
    scaleX === 1 && scaleY === 1 ? String(bounds.left) : "0",
  );
  foreign.setAttribute(
    "y",
    scaleX === 1 && scaleY === 1 ? String(bounds.top) : "0",
  );
  foreign.setAttribute("width", String(size.width));
  foreign.setAttribute("height", String(size.height));
  if (scaleX !== 1 || scaleY !== 1)
    foreign.setAttribute(
      "transform",
      `matrix(${scaleX} 0 0 ${scaleY} ${bounds.left} ${bounds.top})`,
    );
  const image = new Image();
  const ready = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Glass background SVG rasterization failed"));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(root))}`;
  try {
    await bounded(ready, 3000);
  } finally {
    image.onload = image.onerror = null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Glass background canvas unavailable");
  context.drawImage(image, 0, 0);
  context.getImageData(0, 0, 1, 1);
  return canvas;
}

export async function captureGlassBackground(
  target: HTMLElement,
  blocked: Set<Element>,
): Promise<HTMLCanvasElement> {
  if (capturing || unfinishedSamples.size)
    throw new Error("Glass background capture still active");
  capturing = true;
  try {
    return await captureBackground(target, blocked);
  } finally {
    capturing = false;
  }
}
