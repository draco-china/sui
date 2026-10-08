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
  const shape = outline(0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="light" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#fff" stop-opacity=".9"/>
        <stop offset=".3" stop-color="#fff" stop-opacity=".18"/>
        <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".8" stop-color="#fff" stop-opacity=".08"/>
        <stop offset="1" stop-color="#fff" stop-opacity=".5"/>
      </linearGradient>
      <filter id="soft" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation=".35"/>
      </filter>
    </defs>
    <path d="${shape} ${outline(1)}" fill="url(#light)" fill-rule="evenodd" opacity="${opacity}" filter="url(#soft)"/>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
