import {
  glassBevelWidth,
  glassMaxEdgeClarity,
  glassRefractionProfile,
  glassRefractionStrength,
} from "@/lib/glass/refraction";

type Corners = [number, number, number, number];

export type SvgGlassGeometry = {
  width: number;
  height: number;
  /** Horizontal corner radii: top-left, top-right, bottom-right, bottom-left. */
  radius: Corners;
  /** Vertical corner radii for elliptical corners; defaults to `radius`. */
  radiusY?: Corners;
  strength: number;
  blur?: number;
};

let filterSequence = 0;

/** Signed distance to the rounded outline: negative inside, positive outside. */
export function glassRoundedDistance(
  x: number,
  y: number,
  frame: SvgGlassGeometry,
) {
  const { width, height, radius } = frame;
  const vertical = frame.radiusY ?? radius;
  let distance = Math.max(-x, x - width, -y, y - height);
  let corner = -1;
  let centerX = 0;
  let centerY = 0;
  if (x < radius[0] && y < vertical[0]) {
    corner = 0;
    centerX = radius[0];
    centerY = vertical[0];
  } else if (x > width - radius[1] && y < vertical[1]) {
    corner = 1;
    centerX = width - radius[1];
    centerY = vertical[1];
  } else if (x > width - radius[2] && y > height - vertical[2]) {
    corner = 2;
    centerX = width - radius[2];
    centerY = height - vertical[2];
  } else if (x < radius[3] && y > height - vertical[3]) {
    corner = 3;
    centerX = radius[3];
    centerY = height - vertical[3];
  }
  if (corner < 0 || !radius[corner] || !vertical[corner]) return distance;
  const rx = radius[corner];
  const ry = vertical[corner];
  const px = x - centerX;
  const py = y - centerY;
  const k0 = Math.hypot(px / rx, py / ry);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry));
  distance = Math.max(
    distance,
    k1 === 0 ? -Math.min(rx, ry) : (k0 * (k0 - 1)) / k1,
  );
  return distance;
}

function glassOptics(x: number, y: number, frame: SvgGlassGeometry) {
  const distance = glassRoundedDistance(x, y, frame);
  const bevelWidth = glassBevelWidth(frame.width, frame.height);
  if (distance <= -bevelWidth) return [0, 0, 0];
  const gradientX =
    glassRoundedDistance(x + 0.4, y, frame) -
    glassRoundedDistance(x - 0.4, y, frame);
  const gradientY =
    glassRoundedDistance(x, y + 0.4, frame) -
    glassRoundedDistance(x, y - 0.4, frame);
  const length = Math.hypot(gradientX, gradientY) || 1;
  const bevel = glassRefractionProfile(Math.max(-distance, 0), bevelWidth);
  let dx = (-gradientX / length) * bevel * 0.45;
  let dy = (-gradientY / length) * bevel * 0.45;
  const clarity = Math.hypot(dx, dy) / 0.45;
  const vertical = frame.radiusY ?? frame.radius;
  let corner = x < frame.width / 2 ? 0 : 1;
  if (y >= frame.height / 2) corner = 3 - corner;
  const depthX = Math.min(x, frame.width - x);
  const depthY = Math.min(y, frame.height - y);
  if (
    depthX >= 0 &&
    depthY >= 0 &&
    depthX < bevelWidth &&
    depthY < bevelWidth &&
    frame.radius[corner] === 0 &&
    vertical[corner] === 0 &&
    frame.radius.every((radius) => radius <= frame.width / 2) &&
    vertical.every((radius) => radius <= frame.height / 2)
  ) {
    // Adjacent flat edges bend independently; curved corner regions stay intact.
    dx =
      (x < frame.width / 2 ? 1 : -1) *
      glassRefractionProfile(depthX, bevelWidth) *
      0.45;
    dy =
      (y < frame.height / 2 ? 1 : -1) *
      glassRefractionProfile(depthY, bevelWidth) *
      0.45;
  }
  return [dx, dy, clarity];
}

/** Share of the sharp edge layer kept at a device pixel ratio. */
export function glassEdgeDensity(pixelRatio = 1) {
  return pixelRatio >= 2 ? 1 : 0.4;
}

export function glassDisplacement(
  x: number,
  y: number,
  frame: SvgGlassGeometry,
) {
  const [dx, dy] = glassOptics(x, y, frame);
  return [dx, dy];
}

async function decodedSvg(svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new window.Image();
  image.src = url;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      image.decode(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("SVG rendering timed out")),
          3000,
        );
      }),
    ]);
    return image;
  } finally {
    if (timer) clearTimeout(timer);
    URL.revokeObjectURL(url);
  }
}

export class SvgGlassRenderer {
  private disposed = false;
  private readonly maps = new Map<string, string>();
  private root: SVGSVGElement | undefined;
  private readonly filters = new Map<
    HTMLElement,
    { filter: SVGFilterElement; key: string }
  >();

  static async create() {
    if (!window.CSS?.supports("backdrop-filter", 'url("#glass-probe")'))
      throw new Error("Native SVG backdrop filtering unavailable");
    // WebKit parses URL filters but does not paint SVG backdrops (WebKit #245510).
    const agent = window.navigator.userAgent;
    if (/AppleWebKit\//.test(agent) && !/(Chrome|Chromium)\//.test(agent))
      throw new Error("Native SVG backdrop filtering unavailable");
    // Verify inline SVG displacement after excluding the unsupported backdrop engine.
    const image = await decodedSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="1"><defs><filter id="probe" filterUnits="userSpaceOnUse" x="0" y="0" width="4" height="1" color-interpolation-filters="sRGB"><feFlood flood-color="rgb(255,128,0)" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="2" xChannelSelector="R" yChannelSelector="G"/></filter></defs><g filter="url(#probe)"><rect width="2" height="1" fill="red"/><rect x="2" width="2" height="1" fill="blue"/></g></svg>`,
    );
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("SVG rasterization unavailable");
    context.drawImage(image, 0, 0);
    const pixel = context.getImageData(1, 0, 1, 1).data;
    if (pixel[2] < 200 || pixel[0] > 40)
      throw new Error("SVG displacement unavailable");
    return new SvgGlassRenderer();
  }

  private normalMap(frame: SvgGlassGeometry) {
    const key = JSON.stringify([
      frame.width,
      frame.height,
      frame.radius,
      frame.radiusY,
    ]);
    const existing = this.maps.get(key);
    if (existing) return existing;
    const scale = Math.min(2, 1024 / Math.max(frame.width, frame.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(frame.width * scale));
    canvas.height = Math.max(1, Math.ceil(frame.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("SVG displacement map unavailable");
    const pixels = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const px = ((x + 0.5) * frame.width) / canvas.width;
        const py = ((y + 0.5) * frame.height) / canvas.height;
        const [dx, dy, clarity] = glassOptics(px, py, frame);
        const offset = (y * canvas.width + x) * 4;
        pixels.data[offset] = Math.round(128 + dx * 256);
        pixels.data[offset + 1] = Math.round(128 + dy * 256);
        pixels.data[offset + 2] = Math.round(clarity * 255);
        pixels.data[offset + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    const result = canvas.toDataURL("image/png");
    if (this.maps.size >= 32)
      this.maps.delete(this.maps.keys().next().value ?? "");
    this.maps.set(key, result);
    return result;
  }

  filter(element: HTMLElement, frame: SvgGlassGeometry) {
    if (this.disposed) throw new Error("SVG renderer disposed");
    if (
      ![
        frame.width,
        frame.height,
        frame.strength,
        ...frame.radius,
        ...(frame.radiusY ?? frame.radius),
      ].every(Number.isFinite) ||
      frame.width <= 0 ||
      frame.height <= 0 ||
      frame.strength < 0 ||
      frame.strength > 64 ||
      [...frame.radius, ...(frame.radiusY ?? frame.radius)].some(
        (radius) => radius < 0,
      )
    )
      throw new Error("Invalid SVG glass geometry");
    // Displacing the unblurred backdrop aliases on low-density screens.
    const density = glassEdgeDensity(window.devicePixelRatio);
    const key = JSON.stringify([
      frame.width,
      frame.height,
      frame.radius,
      frame.radiusY,
      frame.strength,
      frame.blur,
      density,
    ]);
    let entry = this.filters.get(element);
    if (!entry) {
      const document = element.ownerDocument;
      if (!this.root) {
        this.root = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        this.root.setAttribute("data-glass-decoration", "true");
        this.root.setAttribute("aria-hidden", "true");
        this.root.style.cssText =
          "position:absolute;width:0;height:0;overflow:hidden";
        document.body.append(this.root);
      }
      const filter = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "filter",
      );
      filter.id = `glass-svg-${++filterSequence}`;
      this.root.append(filter);
      entry = { filter, key: "" };
      this.filters.set(element, entry);
    }
    if (entry.key !== key) {
      const { width, height } = frame;
      const normal = this.normalMap(frame);
      const strength = glassRefractionStrength(frame.strength, width, height);
      const clarity =
        Math.min(strength / glassBevelWidth(width, height), 1) *
        glassMaxEdgeClarity *
        density;
      const blur = frame.blur ?? 4;
      const margin = frame.strength + blur * 3 + 2;
      const filter = entry.filter;
      filter.setAttribute("filterUnits", "userSpaceOnUse");
      filter.setAttribute("x", String(-margin));
      filter.setAttribute("y", String(-margin));
      filter.setAttribute("width", String(width + margin * 2));
      filter.setAttribute("height", String(height + margin * 2));
      filter.setAttribute("color-interpolation-filters", "sRGB");
      // SourceGraphic is the live browser backdrop. Only the geometric normal
      // map is encoded; there is no DOM snapshot or background PNG here.
      // Material saturation follows in CSS after this filter.
      filter.innerHTML = `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blurred"/><feImage href="${normal}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="encoded"/><feComponentTransfer in="encoded" result="normal"><feFuncR type="linear" slope="0.99609375"/><feFuncG type="linear" slope="0.99609375"/></feComponentTransfer><feDisplacementMap in="blurred" in2="normal" scale="${strength}" xChannelSelector="R" yChannelSelector="G" result="refracted"/><feDisplacementMap in="SourceGraphic" in2="normal" scale="${strength}" xChannelSelector="R" yChannelSelector="G" result="sharp"/><feColorMatrix in="encoded" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${clarity} 0 0" result="clarity"/><feComposite in="sharp" in2="clarity" operator="in" result="edge"/><feComposite in="edge" in2="refracted" operator="over"/>`;
      entry.key = key;
    }
    return `url("#${entry.filter.id}")`;
  }

  release(element: HTMLElement) {
    this.filters.get(element)?.filter.remove();
    this.filters.delete(element);
  }

  destroy() {
    this.disposed = true;
    this.maps.clear();
    this.root?.remove();
    this.root = undefined;
    this.filters.clear();
  }
}
