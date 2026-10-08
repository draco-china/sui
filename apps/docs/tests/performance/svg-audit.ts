import type { GlassFrame } from "../../../../packages/ui/src/lib/glass/renderer";
import { SvgGlassRenderer } from "../../../../packages/ui/src/lib/glass/svg-renderer";

export async function svgPixelAudit() {
  const renderer = await SvgGlassRenderer.create();
  try {
    const source = document.createElement("canvas");
    source.width = 160;
    source.height = 120;
    const context = source.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < 160; x++) {
        context.fillStyle = `rgb(${(x * 41) % 256},${(y * 37) % 256},${((x + y) * 29) % 256})`;
        context.fillRect(x, y, 1, 1);
      }
    }
    const frame: GlassFrame = {
      width: 120,
      height: 80,
      margin: 0,
      origin: [20, 20],
      radius: [16, 16, 16, 16],
      blur: 0,
      strength: 0,
      tint: [0, 0, 0],
      tintOpacity: 0,
      foreground: [1, 1, 1],
    };
    const raster = async (strength: number) => {
      const blob = await renderer.render(source, { ...frame, strength });
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 80;
        const rasterContext = canvas.getContext("2d");
        if (!rasterContext) throw new Error("Canvas unavailable");
        rasterContext.drawImage(image, 0, 0);
        return rasterContext.getImageData(0, 0, 120, 80).data;
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    const base = await raster(0);
    const refracted = await raster(22);
    const difference = (x: number, y: number) => {
      const index = (y * 120 + x) * 4;
      return (
        Math.abs(base[index] - refracted[index]) +
        Math.abs(base[index + 1] - refracted[index + 1]) +
        Math.abs(base[index + 2] - refracted[index + 2])
      );
    };
    const edges = {
      left: difference(2, 40),
      right: difference(117, 40),
      top: difference(60, 2),
      bottom: difference(60, 77),
    };
    return {
      probePassed: true,
      edges,
      allFourEdgesRefract: Object.values(edges).every((value) => value > 10),
      centerUnchanged: difference(60, 40) === 0,
    };
  } finally {
    renderer.destroy();
  }
}
