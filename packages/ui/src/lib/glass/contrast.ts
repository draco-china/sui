export type GlassTextColor = [number, number, number, number];
export const maxGlassTextColors = 32;

export class GlassContrastError extends Error {
  override name = "GlassContrastError";
}

export function parseGlassColor(color: string): GlassTextColor {
  if (!color || color === "transparent") return [0, 0, 0, 0];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return [0.5, 0.5, 0.5, 1];
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const bytes = context.getImageData(0, 0, 1, 1).data;
  return [bytes[0] / 255, bytes[1] / 255, bytes[2] / 255, bytes[3] / 255];
}

function luminance(color: readonly number[]) {
  const linear = color
    .slice(0, 3)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function glassTextContrast(
  background: readonly number[],
  text: GlassTextColor,
) {
  const foreground = text
    .slice(0, 3)
    .map(
      (channel, index) => channel * text[3] + background[index] * (1 - text[3]),
    );
  const first = luminance(background) + 0.05;
  const second = luminance(foreground) + 0.05;
  return Math.max(first, second) / Math.min(first, second);
}

export function resolveGlassContrastTint(
  tint: [number, number, number],
  colors: readonly GlassTextColor[],
  minimum: number,
): [number, number, number] | undefined {
  const passes = (candidate: [number, number, number]) =>
    colors.every((color) => glassTextContrast(candidate, color) >= minimum);
  if (passes(tint)) return tint;
  let result: [number, number, number] | undefined;
  let distance = Number.POSITIVE_INFINITY;
  const consider = (candidate: [number, number, number]) => {
    const delta = candidate.reduce(
      (total, channel, index) => total + (channel - tint[index]) ** 2,
      0,
    );
    if (delta < distance && passes(candidate)) {
      result = candidate;
      distance = delta;
    }
  };
  for (let step = 0; step <= 255; step++) {
    const value = step / 255;
    consider([value, value, value]);
    for (const endpoint of [0, 1])
      consider(
        tint.map(
          (channel) =>
            Math.round((channel * (1 - value) + endpoint * value) * 255) / 255,
        ) as [number, number, number],
      );
  }
  return result;
}

export class GlassTextContrastCache {
  private revision = 0;
  private readonly entries = new WeakMap<
    HTMLElement,
    {
      revision: number;
      colors: GlassTextColor[];
      controls: {
        element: HTMLInputElement | HTMLTextAreaElement;
        filled: boolean;
        placeholder: string;
      }[];
    }
  >();

  invalidate() {
    this.revision++;
  }

  read(surface: HTMLElement): GlassTextColor[] {
    const cached = this.entries.get(surface);
    if (
      cached?.revision === this.revision &&
      cached.controls.every(
        ({ element, filled, placeholder }) =>
          Boolean(element.value) === filled &&
          element.placeholder === placeholder,
      )
    )
      return cached.colors;
    const colors = new Map<string, GlassTextColor>();
    const controls: {
      element: HTMLInputElement | HTMLTextAreaElement;
      filled: boolean;
      placeholder: string;
    }[] = [];
    const add = (color: string, opacity = 1) => {
      const parsed = parseGlassColor(color);
      parsed[3] *= opacity;
      if (parsed[3] <= 0) return;
      colors.set(parsed.join(","), parsed);
    };
    const visit = (element: Element, opacity: number) => {
      if (element !== surface && element.getAttribute("data-glass") === "true")
        return;
      const style = getComputedStyle(element);
      const alpha = Number.parseFloat(style.opacity);
      const effectiveOpacity = opacity * (Number.isFinite(alpha) ? alpha : 1);
      if (
        effectiveOpacity <= 0 ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        element.hasAttribute("hidden") ||
        element.getAttribute("aria-hidden") === "true" ||
        ["SCRIPT", "STYLE", "TEMPLATE", "SVG", "IFRAME"].includes(
          element.tagName.toUpperCase(),
        )
      )
        return;
      if (
        element !== surface &&
        ((style.backgroundImage && style.backgroundImage !== "none") ||
          parseGlassColor(style.backgroundColor)[3] > 0)
      )
        return;
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        if (element.tagName === "INPUT" && input.type === "hidden") return;
        controls.push({
          element: input,
          filled: Boolean(input.value),
          placeholder: input.placeholder,
        });
        if (input.value) add(style.color, effectiveOpacity);
        else if (input.placeholder) {
          const placeholder = getComputedStyle(element, "::placeholder");
          const placeholderOpacity = Number.parseFloat(placeholder.opacity);
          add(
            placeholder.color || style.color,
            effectiveOpacity *
              (Number.isFinite(placeholderOpacity) ? placeholderOpacity : 1),
          );
        }
        return;
      }
      if (
        [...element.childNodes].some(
          (node) => node.nodeType === 3 && Boolean(node.textContent?.trim()),
        )
      )
        add(style.color, effectiveOpacity);
      for (const child of element.children) visit(child, effectiveOpacity);
    };
    visit(surface, 1);
    if (!colors.size) add(getComputedStyle(surface).color);
    const result = [...colors.values()];
    this.entries.set(surface, {
      revision: this.revision,
      colors: result,
      controls,
    });
    return result;
  }
}
