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

export function glassEdge(
  width: number,
  height: number,
  radii: [string, string, string, string],
  highlight: number,
  color: readonly number[] = [1, 1, 1],
  background?: readonly number[],
) {
  if (highlight <= 0 || width <= 0 || height <= 0) return "none";
  const corners = glassRadii(width, height, radii);
  const outline = (requestedInset: number) => {
    const inset = Math.min(requestedInset, width / 2, height / 2);
    const [tl, tr, br, bl] = corners.map((radius) => ({
      x: Math.max(0, radius.x - inset),
      y: Math.max(0, radius.y - inset),
    }));
    const right = width - inset;
    const bottom = height - inset;
    return `M${inset + tl.x} ${inset}H${right - tr.x}A${tr.x} ${tr.y} 0 0 1 ${right} ${inset + tr.y}V${bottom - br.y}A${br.x} ${br.y} 0 0 1 ${right - br.x} ${bottom}H${inset + bl.x}A${bl.x} ${bl.y} 0 0 1 ${inset} ${bottom - bl.y}V${inset + tl.y}A${tl.x} ${tl.y} 0 0 1 ${inset + tl.x} ${inset}Z`;
  };
  const opacity =
    Math.min(1, highlight * 1.7) *
    (0.9 - surfaceBrightness(color, background) * 0.25);
  const bevel = Math.min(2.5, Math.min(width, height) * 0.045);
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
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
        <feGaussianBlur in="SourceAlpha" stdDeviation="${bevel * 0.46}" result="height"/>
        <feSpecularLighting in="height" surfaceScale="${bevel * 1.12}" specularConstant="1.6" specularExponent="26" lighting-color="white">
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
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function glassShadow(
  highlight: number,
  color: readonly number[] = [1, 1, 1],
  background?: readonly number[],
) {
  if (highlight <= 0) return "0 0 #0000";
  const opacity = Number(
    Math.min(
      (highlight / 3) * (1 + surfaceBrightness(color, background) * 0.3),
      0.28,
    ).toFixed(3),
  );
  return `1px -1px 2px -0.5px rgb(0 0 0 / ${opacity}), -1px 1px 2px -0.5px rgb(0 0 0 / ${Number((opacity * 0.7).toFixed(3))})`;
}
