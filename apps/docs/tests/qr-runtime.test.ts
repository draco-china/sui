import { expect, test } from "bun:test";
import { cssForHappyDOM } from "./fixtures/css-color";
import { describeFixture } from "./support/fixture";

test("DOM fixture translates native OKLCH colors to equivalent sRGB without changing other CSS", () => {
  expect(
    cssForHappyDOM(
      ":root{--white:oklch(1 0 0);--black:oklch(0 0 0);--gray:oklch(0.5 0 0);--blue:oklch(0.52196619 0.1770896 255.82973);--radius:1rem}",
    ),
  ).toBe(
    ":root{--white:#ffffff;--black:#000000;--gray:#636363;--blue:#0066cc;--radius:1rem}",
  );
});

describeFixture(
  "QRCode generation, image feedback and cleanup",
  "qr-runtime.tsx",
);

describeFixture(
  "QR finder geometry on the real encoder",
  "qr-finder-runtime.ts",
);
