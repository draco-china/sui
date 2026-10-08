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

export function glassEdge(
  width: number,
  height: number,
  radii: [string, string, string, string],
  highlight: number,
  color: readonly number[] = [1, 1, 1],
) {
  if (highlight <= 0 || width <= 0 || height <= 0) return "none";
  const corners = glassRadii(width, height, radii);
  const outline = (inset: number) => {
    const [tl, tr, br, bl] = corners.map((radius) => ({
      x: Math.max(0, radius.x - inset),
      y: Math.max(0, radius.y - inset),
    }));
    const right = width - inset;
    const bottom = height - inset;
    return `M${inset + tl.x} ${inset}H${right - tr.x}A${tr.x} ${tr.y} 0 0 1 ${right} ${inset + tr.y}V${bottom - br.y}A${br.x} ${br.y} 0 0 1 ${right - br.x} ${bottom}H${inset + bl.x}A${bl.x} ${bl.y} 0 0 1 ${inset} ${bottom - bl.y}V${inset + tl.y}A${tl.x} ${tl.y} 0 0 1 ${inset + tl.x} ${inset}Z`;
  };
  const opacity = Math.min(1, highlight * 2);
  const stroke = `rgb(${color
    .slice(0, 3)
    .map((channel) => Math.round((0.8 + channel * 0.2) * 255))
    .join(" ")})`;
  const [topLeft, , bottomRight] = corners;
  const arc = 1 - Math.SQRT1_2;
  const reach = Math.max(12, Math.min(width, height) * 0.7);
  const reachX = Math.max(reach, width * 0.65);
  const reachY = Math.max(reach, height * 0.65);
  const lights = [
    { x: topLeft.x * arc, y: topLeft.y * arc },
    { x: width - bottomRight.x * arc, y: height - bottomRight.y * arc },
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
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
        <feGaussianBlur stdDeviation=".55"/>
      </filter>
    </defs>
    ${lights
      .map(
        (_, index) =>
          `<path d="${outline(0.65)}" fill="none" stroke="url(#light${index})" stroke-width=".9" opacity="${index === 0 ? opacity : opacity * 0.7}" filter="url(#soft)"/>`,
      )
      .join("")}
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function glassShadow(highlight: number) {
  if (highlight <= 0) return "0 0 #0000";
  const opacity = Number(Math.min(highlight / 3, 0.28).toFixed(3));
  return `1px -1px 2px -0.5px rgb(0 0 0 / ${opacity}), -1px 1px 2px -0.5px rgb(0 0 0 / ${Number((opacity * 0.7).toFixed(3))})`;
}
