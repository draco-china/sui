import { SvgGlassRenderer } from "../../../../packages/ui/src/lib/glass/svg-renderer";

// DOM diagnostics cannot read the browser's composed backdrop pixels. Keep
// this definition audit separate from native screenshot/pixel acceptance.
export async function svgFilterAudit() {
  const renderer = await SvgGlassRenderer.create();
  const element = document.createElement("div");
  document.body.append(element);
  try {
    const filter = renderer.filter(element, {
      width: 120,
      height: 80,
      radius: [16, 16, 16, 16],
      strength: 22,
    });
    const id = filter.match(/#([^"]+)/)?.[1];
    const definition = id ? document.getElementById(id) : null;
    return {
      nativeFilter: filter,
      definitionAttached: Boolean(definition?.isConnected),
      blurPx: definition
        ?.querySelector("feGaussianBlur")
        ?.getAttribute("stdDeviation"),
      displacementLayers:
        definition?.querySelectorAll("feDisplacementMap").length,
      pixelAcceptance:
        "Requires external native browser screenshots; DOM metadata is insufficient",
    };
  } finally {
    element.remove();
    renderer.destroy();
  }
}
