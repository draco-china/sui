import { expect, test } from "bun:test";
import { glassMaterial } from "../../../packages/ui/src/lib/glass/material";

const neutral = [1, 1, 1, 1] as [number, number, number, number];
const blue = [0, 0.3, 0.8, 1] as typeof neutral;
const defaults = {
  tint: neutral,
  opacity: 0.1,
  primary: blue,
  foreground: [0, 0, 0, 1] as typeof neutral,
  background: neutral,
  text: neutral,
};

test("opaque primary paint stays solid at every glass transparency", () => {
  for (const opacity of [0, 0.1, 1]) {
    const material = glassMaterial({ ...defaults, paint: blue, opacity });
    expect(material).toEqual({ tint: [0, 0.3, 0.8], opacity: 1 });
  }
});

test("translucent semantic paint is composited instead of multiplying its alpha", () => {
  for (const alpha of [0.1, 0.2, 0.8]) {
    const material = glassMaterial({ ...defaults, paint: [1, 0, 0, alpha] });
    const neutralAlpha = 0.1 * (1 - alpha);
    expect(material.opacity).toBeCloseTo(alpha + neutralAlpha);
    expect(material.tint[0]).toBe(1);
    expect(material.tint[1]).toBeCloseTo(neutralAlpha / material.opacity);
    const clear = glassMaterial({
      ...defaults,
      paint: [1, 0, 0, alpha],
      opacity: 0,
    });
    expect(clear).toEqual({ tint: [1, 0, 0], opacity: alpha });
  }
});

test("black and white primary themes retain their solid fill", () => {
  for (const color of [0, 1]) {
    const paint = [color, color, color, 1] as typeof neutral;
    expect(glassMaterial({ ...defaults, primary: paint, paint }).opacity).toBe(
      1,
    );
  }
});

test("neutral surfaces and transparent controls retain clear glass", () => {
  expect(glassMaterial({ ...defaults, paint: neutral }).opacity).toBe(0.1);
  expect(glassMaterial({ ...defaults, paint: [0, 0, 0, 0] })).toEqual({
    tint: [1, 1, 1],
    opacity: 0.1,
  });
  expect(
    glassMaterial({ ...defaults, paint: [0.5, 0.5, 0.5, 0.2] }).opacity,
  ).toBeCloseTo(0.28);
  expect(
    glassMaterial({ ...defaults, paint: [0.5, 0.5, 0.5, 0.2], opacity: 0 })
      .opacity,
  ).toBeCloseTo(0.2);
});

test("a custom glass tint changes neutral material while semantic fill remains intact", () => {
  const tint = [0, 1, 0, 1] as typeof neutral;
  expect(
    glassMaterial({ ...defaults, paint: neutral, overrideTint: tint }),
  ).toEqual({ tint: [0, 1, 0], opacity: 0.1 });
  expect(
    glassMaterial({ ...defaults, paint: blue, overrideTint: tint }),
  ).toEqual({ tint: [0, 0.3, 0.8], opacity: 1 });
});

test("choosing a tint identical to an accent cannot erase the accent alpha", () => {
  const material = glassMaterial({
    ...defaults,
    paint: [1, 0, 0, 0.2],
    overrideTint: [1, 0, 0, 1],
  });
  expect(material.opacity).toBeCloseTo(0.28);
  expect(material.tint).toEqual([1, 0, 0]);
});

test("theme surface alpha modifiers use the selected material strength", () => {
  const surface = [0.28, 0.28, 0.29, 1] as typeof neutral;
  for (const opacity of [0, 0.1, 0.35]) {
    for (const alpha of [0.1, 0.3, 0.5, 1]) {
      expect(
        glassMaterial({
          ...defaults,
          opacity,
          surfaceColors: [surface],
          paint: [surface[0], surface[1], surface[2], alpha],
        }),
      ).toEqual({ tint: [surface[0], surface[1], surface[2]], opacity });
    }
  }
});

test("native low-alpha Canvas rounding still identifies themed surfaces", () => {
  // Actual Chrome Canvas readbacks: light Input /50 and Accent /10, dark Input /10.
  for (const [paintBytes, surfaceBytes] of [
    [
      [199, 199, 203, 128],
      [199, 199, 204, 255],
    ],
    [
      [226, 235, 255, 26],
      [232, 242, 255, 255],
    ],
    [
      [69, 69, 78, 26],
      [72, 72, 74, 255],
    ],
  ]) {
    const surface = surfaceBytes.map((byte) => byte / 255) as typeof neutral;
    const material = glassMaterial({
      ...defaults,
      paint: paintBytes.map((byte) => byte / 255) as typeof neutral,
      surfaceColors: [surface],
    });
    expect(material).toEqual({
      tint: [surface[0], surface[1], surface[2]],
      opacity: 0.1,
    });
  }
});

test("explicit custom paint keeps its alpha even when it matches a theme surface", () => {
  const surface = [0.5, 0.5, 0.5, 1] as typeof neutral;
  for (const opacity of [0, 0.1, 0.35]) {
    expect(
      glassMaterial({
        ...defaults,
        opacity,
        surfaceColors: [surface],
        paint: [0.5, 0.5, 0.5, 0.2],
        customPaint: true,
      }).opacity,
    ).toBeCloseTo(0.2 + opacity * 0.8);
    expect(
      glassMaterial({
        ...defaults,
        opacity,
        surfaceColors: [surface],
        paint: surface,
        customPaint: true,
      }),
    ).toEqual({ tint: [0.5, 0.5, 0.5], opacity: 1 });
  }
});

test("semantic roles take precedence when theme surface colors collide", () => {
  for (const value of [0, 0.5, 1]) {
    const paint = [value, value, value, 1] as typeof neutral;
    expect(
      glassMaterial({
        ...defaults,
        paint,
        primary: paint,
        surfaceColors: [paint],
      }).opacity,
    ).toBe(1);
    expect(
      glassMaterial({
        ...defaults,
        paint,
        destructive: paint,
        surfaceColors: [paint],
      }).opacity,
    ).toBe(1);
  }
  const black = [0, 0, 0, 1] as typeof neutral;
  expect(
    glassMaterial({ ...defaults, paint: black, surfaceColors: [black] })
      .opacity,
  ).toBe(1);
  expect(
    glassMaterial({
      ...defaults,
      paint: black,
      surfaceColors: [black],
      text: [0, 0, 0, 0],
    }).opacity,
  ).toBe(0.1);
});

test("colored theme surfaces remain material rather than semantic fills", () => {
  const accent = [0.2, 0.5, 0.4, 1] as typeof neutral;
  expect(
    glassMaterial({
      ...defaults,
      paint: [0.2, 0.5, 0.4, 0.2],
      surfaceColors: [accent],
    }),
  ).toEqual({ tint: [0.2, 0.5, 0.4], opacity: 0.1 });
  expect(
    glassMaterial({
      ...defaults,
      paint: accent,
      surfaceColors: [accent],
      overrideTint: [1, 0, 0, 0.5],
    }),
  ).toEqual({ tint: [1, 0, 0], opacity: 0.05 });
});

test("missing surfaces and transparent paint cannot acquire a neutral color identity", () => {
  expect(
    glassMaterial({
      ...defaults,
      paint: [0, 0, 0, 0],
      surfaceColors: [[0, 0, 0, 1]],
    }),
  ).toEqual({ tint: [1, 1, 1], opacity: 0.1 });
  expect(
    glassMaterial({
      ...defaults,
      paint: [0.5, 0.5, 0.5, 0.2],
      surfaceColors: [[0.5, 0.5, 0.5, 0]],
    }).opacity,
  ).toBeCloseTo(0.28);
});

test("native material follows themes, caller styles and independent cleanup", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-native-material.ts", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "explicit caller paint and cleanup passed",
  );
});
