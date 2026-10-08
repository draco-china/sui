export function applyQRCodeFinderGeometry(svg: SVGElement) {
  let moduleSize = 12;
  for (const rect of svg.querySelectorAll<SVGRectElement>(
    'clipPath[id*="corners-dot"] rect',
  )) {
    moduleSize = Number(rect.getAttribute("width")) / 3;
    const radius = moduleSize / 2;
    rect.setAttribute("rx", String(radius));
    rect.setAttribute("ry", String(radius));
  }
  return moduleSize;
}
