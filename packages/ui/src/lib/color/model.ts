export interface HSVColor {
  h: number;
  s: number;
  v: number;
  a: number;
}

export function clampColor(value: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function parseHexColor(value: string): HSVColor | null {
  let hex = value.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex))
    return null;
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join("");
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  let a = 1;
  if (hex.length === 8) a = Number.parseInt(hex.slice(6, 8), 16) / 255;
  return { h, s: max === 0 ? 0 : delta / max, v: max, a };
}

export function colorToRGB(color: HSVColor) {
  const h = (((color.h % 360) + 360) % 360) / 60;
  const s = clampColor(color.s);
  const v = clampColor(color.v);
  const chroma = v * s;
  const x = chroma * (1 - Math.abs((h % 2) - 1));
  const offset = v - chroma;
  const sectors = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ];
  return (sectors[Math.floor(h)] ?? sectors[0] ?? [0, 0, 0]).map((channel) =>
    Math.round((channel + offset) * 255),
  ) as [number, number, number];
}

export function colorToHex(color: HSVColor, alpha = false) {
  const channels = colorToRGB(color);
  if (alpha) channels.push(Math.round(clampColor(color.a) * 255));
  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function colorToCSS(color: HSVColor) {
  return `rgba(${colorToRGB(color).join(", ")}, ${clampColor(color.a)})`;
}

export type ColorFormat = "hex" | "rgb" | "hsl" | "hsb" | "oklch";

export function formatColor(
  color: HSVColor,
  format: ColorFormat,
  alpha = false,
) {
  if (format === "hex") return colorToHex(color, alpha);
  const opacity = Math.round(clampColor(color.a) * 10000) / 10000;
  const suffix = alpha ? ` / ${opacity}` : "";
  if (format === "oklch") {
    const { l, c, h } = colorToOKLCH(color);
    return `oklch(${Number((l * 100).toFixed(5))}% ${Number(c.toFixed(7))} ${Number(h.toFixed(5))}${suffix})`;
  }
  if (format === "rgb") return `rgb(${colorToRGB(color).join(" ")}${suffix})`;
  const hue = Math.round(color.h);
  if (format === "hsb")
    return `hsb(${hue} ${Math.round(color.s * 100)}% ${Math.round(color.v * 100)}%${suffix})`;
  const lightness = color.v * (1 - color.s / 2);
  let saturation = 0;
  if (lightness > 0 && lightness < 1)
    saturation = (color.v - lightness) / Math.min(lightness, 1 - lightness);
  return `hsl(${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%${suffix})`;
}

export function parseColor(
  value: string,
  format: ColorFormat,
): HSVColor | null {
  if (format === "hex") return parseHexColor(value);
  if (format === "oklch") return parseOKLCH(value);
  const match = value
    .trim()
    .match(
      /^(rgb|hsl|hsb)\(\s*([+-]?[\d.]+)[ ,]+([+-]?[\d.]+)(%)?[ ,]+([+-]?[\d.]+)(%)?(?:\s*[/,]\s*([\d.]+)(%)?)?\s*\)$/i,
    );
  if (!match || match[1]?.toLowerCase() !== format) return null;
  const first = Number(match[2]);
  const second = Number(match[3]);
  const third = Number(match[5]);
  let a = 1;
  if (match[7]) a = Number(match[7]) / (match[8] ? 100 : 1);
  if (![first, second, third, a].every(Number.isFinite) || a < 0 || a > 1)
    return null;
  if (format === "rgb") {
    if (
      match[4] ||
      match[6] ||
      [first, second, third].some((channel) => channel < 0 || channel > 255)
    )
      return null;
    const hex = [first, second, third]
      .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
      .join("");
    const color = parseHexColor(hex);
    return color ? { ...color, a } : null;
  }
  if (
    !match[4] ||
    !match[6] ||
    second < 0 ||
    second > 100 ||
    third < 0 ||
    third > 100
  )
    return null;
  const h = ((first % 360) + 360) % 360;
  if (format === "hsb") return { h, s: second / 100, v: third / 100, a };
  const lightness = third / 100;
  const v = lightness + (second / 100) * Math.min(lightness, 1 - lightness);
  return { h, s: v === 0 ? 0 : 2 * (1 - lightness / v), v, a };
}

export interface OKLCHColor {
  l: number;
  c: number;
  h: number;
  a: number;
}

export function colorToOKLCH(color: HSVColor): OKLCHColor {
  const [r, g, b] = colorToRGB(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const red = r ?? 0;
  const green = g ?? 0;
  const blue = b ?? 0;
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(a, bAxis);
  const achromatic = chroma < 1e-7;
  return {
    l: lightness,
    c: achromatic ? 0 : chroma,
    h: achromatic ? 0 : ((Math.atan2(bAxis, a) * 180) / Math.PI + 360) % 360,
    a: clampColor(color.a),
  };
}

function oklchLinearRGB(lightness: number, chroma: number, hue: number) {
  const angle = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(angle);
  const b = chroma * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklchToColor(color: OKLCHColor): HSVColor {
  const lightness = clampColor(color.l);
  const hue = ((color.h % 360) + 360) % 360;
  // Chroma reduction preserves lightness and hue while fitting the sRGB gamut.
  let chroma = clampColor(color.c, 0, 4);
  let channels = oklchLinearRGB(lightness, chroma, hue);
  const inGamut = (values: number[]) =>
    values.every(
      (channel) =>
        Number.isFinite(channel) && channel >= -1e-7 && channel <= 1 + 1e-7,
    );
  if (!inGamut(channels)) {
    let low = 0;
    let high = chroma;
    for (let iteration = 0; iteration < 32; iteration++) {
      const middle = (low + high) / 2;
      if (inGamut(oklchLinearRGB(lightness, middle, hue))) low = middle;
      else high = middle;
    }
    chroma = low;
    channels = oklchLinearRGB(lightness, chroma, hue);
  }
  const hex = channels
    .map((channel) => {
      const linear = clampColor(channel);
      const value =
        linear <= 0.0031308
          ? linear * 12.92
          : 1.055 * linear ** (1 / 2.4) - 0.055;
      return Math.round(clampColor(value) * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
  return {
    ...(parseHexColor(hex) ?? { h: 0, s: 0, v: lightness, a: 1 }),
    a: clampColor(color.a),
  };
}

const cssNumber = "[+-]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][+-]?\\d+)?";
const oklchPattern = new RegExp(
  `^oklch\\(\\s*(${cssNumber})(%)?\\s+(${cssNumber})(%)?\\s+(${cssNumber})(deg|rad|grad|turn)?(?:\\s*\\/\\s*(${cssNumber})(%)?)?\\s*\\)$`,
  "i",
);
function parseOKLCH(value: string): HSVColor | null {
  const match = value.trim().match(oklchPattern);
  if (!match) return null;
  const lightness = Number(match[1]) / (match[2] ? 100 : 1);
  const chroma = Number(match[3]) * (match[4] ? 0.004 : 1);
  let hue = Number(match[5]);
  const units = match[6]?.toLowerCase();
  if (units === "rad") hue = (hue * 180) / Math.PI;
  else if (units === "grad") hue *= 0.9;
  else if (units === "turn") hue *= 360;
  const alpha = Number(match[7] ?? 1) / (match[8] ? 100 : 1);
  if (
    ![lightness, chroma, hue, alpha].every(Number.isFinite) ||
    lightness < 0 ||
    lightness > 1 ||
    chroma < 0 ||
    alpha < 0 ||
    alpha > 1
  )
    return null;
  return oklchToColor({ l: lightness, c: chroma, h: hue, a: alpha });
}
