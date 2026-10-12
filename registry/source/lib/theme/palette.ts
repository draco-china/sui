export function createThemeTokens(
  seed: string | null,
  dark: boolean,
  palette: readonly string[] = [],
): Record<string, string> {
  const ratio = (first: string, second: string) => {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map((offset) => {
        const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return (
        (channels[0] ?? 0) * 0.2126 +
        (channels[1] ?? 0) * 0.7152 +
        (channels[2] ?? 0) * 0.0722
      );
    };
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const mix = (first: string, second: string, amount: number) =>
    `#${[1, 3, 5]
      .map((offset) =>
        Math.round(
          Number.parseInt(first.slice(offset, offset + 2), 16) * (1 - amount) +
            Number.parseInt(second.slice(offset, offset + 2), 16) * amount,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  const background = dark ? "#0A0A0A" : "#FFFFFF";
  const surface = dark ? "#171717" : "#F5F5F5";
  const target = dark ? "#FFFFFF" : "#000000";
  const primary = seed ?? (dark ? "#FAFAFA" : "#171717");
  const accent = mix(background, primary, dark ? 0.2 : 0.1);
  const raisedSurface = dark ? "#2E2E2E" : "#EEEEEE";
  const backgrounds = [
    background,
    surface,
    accent,
    raisedSurface,
    ...(dark ? ["#161617", "#1D1D1F", "#2C2C2E"] : ["#F5F5F7", "#E8E8ED"]),
  ];
  const accessible = (color: string, minimum: number) => {
    for (let step = 0; step <= 100; step++) {
      const adjusted = mix(color, target, step / 100);
      if (
        backgrounds.every(
          (background) => ratio(adjusted, background) >= minimum,
        )
      )
        return adjusted;
    }
    return target;
  };
  const foreground = (color: string) =>
    ratio(color, "#000000") >= ratio(color, "#FFFFFF") ? "#000000" : "#FFFFFF";
  const link = accessible(primary, 4.5);
  const ring = accessible(primary, 3);
  const toOklch = (hex: string) => {
    if (hex.toLowerCase() === "#ffffff") return "oklch(1 0 0)";
    const [red, green, blue] = [1, 3, 5].map((offset) => {
      const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
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
    const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    let chroma = Math.hypot(a, b);
    let hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    if (chroma < 0.0000001) {
      chroma = 0;
      hue = 0;
    }
    return `oklch(${Number(lightness.toFixed(8))} ${Number(chroma.toFixed(8))} ${Number(hue.toFixed(5))})`;
  };
  const tokens = {
    "--primary": primary,
    "--primary-foreground": foreground(primary),
    "--ring": ring,
    "--accent": accent,
    "--accent-foreground": accessible(primary, 4.5),
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": foreground(primary),
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": link,
    "--sidebar-ring": ring,
    "--chart-1": palette[0] ?? primary,
    "--chart-2": palette[1] ?? mix(primary, target, 0.18),
    "--chart-3": palette[2] ?? mix(primary, target, 0.34),
    "--chart-4": palette[3] ?? mix(primary, background, 0.24),
    "--chart-5": palette[4] ?? mix(primary, background, 0.43),
  };
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [name, toOklch(value)]),
  );
}
