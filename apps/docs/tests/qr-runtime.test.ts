import { expect, test } from "bun:test";
import { cssForHappyDOM } from "./fixtures/css-color";

test("DOM fixture translates native OKLCH colors to equivalent sRGB without changing other CSS", () => {
  expect(
    cssForHappyDOM(
      ":root{--white:oklch(1 0 0);--black:oklch(0 0 0);--gray:oklch(0.5 0 0);--blue:oklch(0.52196619 0.1770896 255.82973);--radius:1rem}",
    ),
  ).toBe(
    ":root{--white:#ffffff;--black:#000000;--gray:#636363;--blue:#0066cc;--radius:1rem}",
  );
});

test("QRCode asynchronous generation, image feedback and cleanup stay isolated", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/qr-runtime.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "QR async state, stale values, image feedback, logo readiness, instance isolation and cleanup passed",
  );
});

test("real QR encoder preserves concentric finder radii and corner centers", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/qr-finder-runtime.ts", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Actual QR SVG finder radii and shared corner centers passed",
  );
});
