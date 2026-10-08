import type { GlassFrame } from "./renderer";

function roundedDistance(x: number, y: number, frame: GlassFrame) {
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

export function glassDisplacement(x: number, y: number, frame: GlassFrame) {
  const distance = roundedDistance(x, y, frame);
  if (distance <= -17) return [0, 0];
  const dx =
    roundedDistance(x + 0.4, y, frame) - roundedDistance(x - 0.4, y, frame);
  const dy =
    roundedDistance(x, y + 0.4, frame) - roundedDistance(x, y - 0.4, frame);
  const length = Math.hypot(dx, dy) || 1;
  const bevel = Math.max(0, 1 - Math.max(-distance, 0) / 17) ** 2;
  return [(-dx / length) * bevel * 0.45, (-dy / length) * bevel * 0.45];
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
  private backgrounds = new WeakMap<HTMLCanvasElement, string>();

  static async create() {
    // Probe actual pixel displacement, not merely CSS syntax acceptance.
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

  private normalMap(frame: GlassFrame) {
    const key = JSON.stringify([
      frame.width,
      frame.height,
      frame.radius,
      frame.radiusY,
    ]);
    const existing = this.maps.get(key);
    if (existing) return existing;
    const scale = Math.min(1, 1024 / Math.max(frame.width, frame.height));
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
        const [dx, dy] = glassDisplacement(px, py, frame);
        const offset = (y * canvas.width + x) * 4;
        pixels.data[offset] = Math.round(128 + dx * 256);
        pixels.data[offset + 1] = Math.round(128 + dy * 256);
        pixels.data[offset + 2] = 128;
        pixels.data[offset + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    const result = canvas.toDataURL("image/png");
    if (this.maps.size >= 4)
      this.maps.delete(this.maps.keys().next().value ?? "");
    this.maps.set(key, result);
    return result;
  }

  async render(source: HTMLCanvasElement, frame: GlassFrame) {
    if (this.disposed) throw new Error("SVG renderer disposed");
    if (
      ![
        frame.width,
        frame.height,
        frame.margin,
        ...(frame.origin ?? [frame.margin, frame.margin]),
        frame.strength,
        frame.blur,
        frame.tintOpacity,
        ...frame.tint,
        ...frame.radius,
        ...(frame.radiusY ?? frame.radius),
      ].every(Number.isFinite) ||
      frame.width <= 0 ||
      frame.height <= 0 ||
      frame.strength < 0 ||
      frame.strength > 64 ||
      frame.blur < 0 ||
      frame.blur > 24 ||
      frame.tintOpacity < 0 ||
      frame.tintOpacity > 1 ||
      [...frame.radius, ...(frame.radiusY ?? frame.radius)].some(
        (radius) => radius < 0,
      ) ||
      frame.tint.some((channel) => channel < 0 || channel > 1)
    )
      throw new Error("Invalid SVG glass geometry");
    let background = this.backgrounds.get(source);
    if (!background) {
      background = source.toDataURL("image/png");
      this.backgrounds.set(source, background);
    }
    const normal = this.normalMap(frame);
    const [tl, tr, br, bl] = frame.radius;
    const [ty, ry, by, ly] = frame.radiusY ?? frame.radius;
    const { width, height } = frame;
    const outline = `M${tl} 0H${width - tr}A${tr} ${ry} 0 0 1 ${width} ${ry}V${height - by}A${br} ${by} 0 0 1 ${width - br} ${height}H${bl}A${bl} ${ly} 0 0 1 0 ${height - ly}V${ty}A${tl} ${ty} 0 0 1 ${tl} 0Z`;
    const [x, y] = frame.origin ?? [frame.margin, frame.margin];
    const margin = frame.strength + frame.blur * 3 + 2;
    const tint = frame.tint
      .map((channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255))
      .join(" ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="outline"><path d="${outline}"/></clipPath><filter id="refract" filterUnits="userSpaceOnUse" x="${-margin}" y="${-margin}" width="${width + margin * 2}" height="${height + margin * 2}" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${Math.max(0, frame.blur)}" result="blurred"/><feImage href="${normal}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="encoded"/><feComponentTransfer in="encoded" result="normal"><feFuncR type="linear" slope="0.99609375"/><feFuncG type="linear" slope="0.99609375"/></feComponentTransfer><feDisplacementMap in="blurred" in2="normal" scale="${Math.max(0, frame.strength)}" xChannelSelector="R" yChannelSelector="G" result="refracted"/><feColorMatrix in="refracted" type="saturate" values="1.12"/></filter></defs><g clip-path="url(#outline)"><image href="${background}" x="${-x}" y="${-y}" width="${source.width}" height="${source.height}" filter="url(#refract)"/><path d="${outline}" fill="rgb(${tint})" fill-opacity="${Math.max(0, Math.min(1, frame.tintOpacity))}"/></g></svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }

  destroy() {
    this.disposed = true;
    this.maps.clear();
    this.backgrounds = new WeakMap();
  }
}
