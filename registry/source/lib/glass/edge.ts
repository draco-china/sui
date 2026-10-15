import { type GlassEdge, glassDefaultEdge } from "@/lib/glass/defaults";

export function glassRadii(
  width: number,
  height: number,
  radii: [string, string, string, string],
) {
  const corners = radii.map((value) => {
    const [horizontal = "0", vertical = horizontal] = value.split(/\s+/);
    const resolve = (length: string, size: number) =>
      Math.max(
        0,
        (Number.parseFloat(length) || 0) *
          (length.endsWith("%") ? size / 100 : 1),
      );
    return { x: resolve(horizontal, width), y: resolve(vertical, height) };
  });
  const [tl, tr, br, bl] = corners;
  const scale = Math.min(
    1,
    width / (tl.x + tr.x),
    width / (bl.x + br.x),
    height / (tl.y + bl.y),
    height / (tr.y + br.y),
  );
  return corners.map((radius) => ({
    x: radius.x * scale,
    y: radius.y * scale,
  }));
}

function brightness(color: readonly number[]) {
  return Math.min(
    1,
    Math.max(0, color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722),
  );
}

function surfaceBrightness(
  foreground: readonly number[],
  background?: readonly number[],
) {
  return background ? brightness(background) : 1 - brightness(foreground);
}

type Corner = { x: number; y: number };

/** Rounded outline inset by a distance, following elliptical corners. */
function outlinePath(
  width: number,
  height: number,
  corners: Corner[],
  requestedInset: number,
) {
  const inset = Math.min(requestedInset, width / 2, height / 2);
  const [tl, tr, br, bl] = corners.map((radius) => ({
    x: Math.max(0, radius.x - inset),
    y: Math.max(0, radius.y - inset),
  }));
  const right = width - inset;
  const bottom = height - inset;
  return `M${inset + tl.x} ${inset}H${right - tr.x}A${tr.x} ${tr.y} 0 0 1 ${right} ${inset + tr.y}V${bottom - br.y}A${br.x} ${br.y} 0 0 1 ${right - br.x} ${bottom}H${inset + bl.x}A${bl.x} ${bl.y} 0 0 1 ${inset} ${bottom - bl.y}V${inset + tl.y}A${tl.x} ${tl.y} 0 0 1 ${inset + tl.x} ${inset}Z`;
}

type EdgeShape = {
  width: number;
  height: number;
  corners: Corner[];
  opacity: number;
  pixelRatio: number;
};

/**
 * The SUI 1.1 rim: a thin stroke lit from the top-left and bottom-right
 * corners, fading along the sides.
 */
function diagonalEdge(
  { width, height, corners, opacity, pixelRatio }: EdgeShape,
  color: readonly number[],
) {
  const density = Math.max(pixelRatio, 1);
  // The 1.1 stroke up to 2x, narrowing continuously on denser phone screens.
  const line = Math.min(0.9, Math.max(0.6, 1.8 / density));
  const softness = 0.55 * Math.min(1, 2 / density);
  const stroke = `rgb(${color
    .slice(0, 3)
    .map((channel) => Math.round((0.8 + channel * 0.2) * 255))
    .join(" ")})`;
  const [topLeft, , bottomRight] = corners;
  // Each light sits on its corner arc and reaches along both adjacent sides.
  const arc = 1 - Math.SQRT1_2;
  const reach = Math.max(12, Math.min(width, height) * 0.7);
  const reachX = Math.max(reach, width * 0.65);
  const reachY = Math.max(reach, height * 0.65);
  const lights = [
    { x: topLeft.x * arc, y: topLeft.y * arc, opacity },
    {
      x: width - bottomRight.x * arc,
      y: height - bottomRight.y * arc,
      opacity: opacity * 0.7,
    },
  ];
  const outline = outlinePath(width, height, corners, line * (0.65 / 0.9));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      ${lights
        .map(
          (
            light,
            index,
          ) => `<radialGradient id="light${index}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${light.x} ${light.y}) scale(${reachX} ${reachY})">
        <stop stop-color="${stroke}" stop-opacity=".85"/>
        <stop offset=".5" stop-color="${stroke}" stop-opacity=".36"/>
        <stop offset=".85" stop-color="${stroke}" stop-opacity=".06"/>
        <stop offset="1" stop-color="${stroke}" stop-opacity="0"/>
      </radialGradient>`,
        )
        .join("")}
      <filter id="soft" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="${softness}"/>
      </filter>
    </defs>
    ${lights
      .map(
        (light, index) =>
          `<path d="${outline}" fill="none" stroke="url(#light${index})" stroke-width="${line}" opacity="${light.opacity}" filter="url(#soft)"/>`,
      )
      .join("")}
  </svg>`;
}

/** The SUI 1.3 bevel, lit by top and bottom reflections. */
function verticalEdge({
  width,
  height,
  corners,
  opacity,
  pixelRatio,
}: EdgeShape) {
  const outline = (inset: number) => outlinePath(width, height, corners, inset);
  // Tiny surfaces such as a pressed Switch or Slider thumb keep a visible rim.
  const bevel = Math.min(2.5, Math.max(1.25, Math.min(width, height) * 0.045));
  // Small controls on 1x screens would light a sub-pixel band that breaks into dots,
  // so the height map keeps at least about one device pixel.
  const device = 1 / Math.max(pixelRatio, 1);
  const softness = Math.max(bevel * 0.46, device * 0.6);
  const reflections = [
    { id: "top", azimuth: 270, opacity, stops: [0.95, 0.72, 0.5] },
    {
      id: "bottom",
      azimuth: 90,
      opacity: opacity * 0.85,
      stops: [0.5, 0.72, 0.95],
    },
  ];
  // A blurred silhouette supplies bevel normals. Lighting varies through its thickness,
  // rather than painting a constant-width bright stroke around the whole surface.
  // Saturated band coverage clips the feather without dimming subpixel bevels twice.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <clipPath id="inside"><path d="${outline(0)}"/></clipPath>
      <filter id="soft" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="${bevel * 0.2}" result="soft"/>
        <feComponentTransfer in="SourceAlpha" result="band"><feFuncA type="linear" slope="2"/></feComponentTransfer>
        <feComposite in="soft" in2="band" operator="in"/>
      </filter>
      <mask id="bevel" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
        <path d="${outline(bevel / 2)}" fill="none" stroke="white" stroke-width="${bevel}" filter="url(#soft)"/>
      </mask>
      ${reflections
        .map(
          ({ id, azimuth, stops }) => `
      <linearGradient id="${id}Fade">
        <stop stop-color="white" stop-opacity="${stops[0]}"/>
        <stop offset=".5" stop-color="white" stop-opacity="${stops[1]}"/>
        <stop offset="1" stop-color="white" stop-opacity="${stops[2]}"/>
      </linearGradient>
      <mask id="${id}Light" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="url(#${id}Fade)"/>
      </mask>
      <filter id="${id}Reflection" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="${softness}" result="height"/>
        <feSpecularLighting in="height" surfaceScale="${softness * (1.12 / 0.46)}" specularConstant="1.6" specularExponent="26" lighting-color="white">
          <feDistantLight azimuth="${azimuth}" elevation="32"/>
        </feSpecularLighting>
        <feComposite in2="SourceAlpha" operator="in"/>
      </filter>`,
        )
        .join("")}
    </defs>
    <g clip-path="url(#inside)" mask="url(#bevel)">
      ${reflections
        .map(
          ({ id, opacity: strength }) => `
      <g mask="url(#${id}Light)" opacity="${strength}">
        <path d="${outline(0)}" fill="white" filter="url(#${id}Reflection)"/>
      </g>`,
        )
        .join("")}
    </g>
  </svg>`;
}

export type GlassEdgeOptions = {
  /** Built-in strength from {@link glassHighlight}. */
  highlight: number;
  style?: GlassEdge;
  /** Foreground color, which tints the diagonal rim. */
  color?: readonly number[];
  /** Surface tint, which dims the vertical bevel over bright materials. */
  background?: readonly number[];
  pixelRatio?: number;
};

/** The edge highlight as a CSS background image. */
export function glassEdge(
  width: number,
  height: number,
  radii: [string, string, string, string],
  {
    highlight,
    style = glassDefaultEdge,
    color = [1, 1, 1],
    background,
    pixelRatio = 1,
  }: GlassEdgeOptions,
) {
  if (highlight <= 0 || width <= 0 || height <= 0) return "none";
  const shape = {
    width,
    height,
    corners: glassRadii(width, height, radii),
    pixelRatio,
  };
  const svg =
    style === "vertical"
      ? verticalEdge({
          ...shape,
          opacity:
            Math.min(1, highlight * 1.7) *
            (0.9 - surfaceBrightness(color, background) * 0.25),
        })
      : diagonalEdge({ ...shape, opacity: Math.min(1, highlight * 2) }, color);
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Edge highlight strength: full from 2x, dimmer where device pixels are larger. */
export function glassHighlight(pixelRatio = 1) {
  return Math.min(0.3, Math.max(0.15, 0.15 * pixelRatio));
}

export function glassShadow(
  color: readonly number[] = [1, 1, 1],
  background?: readonly number[],
) {
  const opacity = Number(
    Math.min(
      0.1 * (1 + surfaceBrightness(color, background) * 0.3),
      0.28,
    ).toFixed(3),
  );
  // One soft drop shadow: two diagonal offsets read as a dark ring on small screens.
  return `0 1px 3px -1px rgb(0 0 0 / ${opacity})`;
}
