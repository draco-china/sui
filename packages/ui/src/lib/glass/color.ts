export type GlassColor = [number, number, number, number];

let colorContext: CanvasRenderingContext2D | null | undefined;

/** Resolves any CSS color, including oklch and color-mix, to sRGB channels. */
export function parseGlassColor(color: string): GlassColor {
  if (!color || color === "transparent") return [0, 0, 0, 0];
  if (colorContext === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    colorContext = canvas.getContext("2d", { willReadFrequently: true });
  }
  const context = colorContext;
  if (!context) return [0.5, 0.5, 0.5, 1];
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = "#000";
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const bytes = context.getImageData(0, 0, 1, 1).data;
  return [bytes[0] / 255, bytes[1] / 255, bytes[2] / 255, bytes[3] / 255];
}
