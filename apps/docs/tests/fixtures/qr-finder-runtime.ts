import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";
import { applyQRCodeFinderGeometry } from "../../../../packages/ui/src/lib/qr-code/finder";

const window = new HappyWindow() as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
Object.assign(globalThis, { window, document: window.document });
const { default: QRCodeStyling } = await import("qr-code-styling");

function close(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-8,
    `${actual} must equal ${expected}`,
  );
}

for (const { value, size, margin } of [
  { value: "SUI", size: 160, margin: 0 },
  { value: "https://example.com/", size: 512, margin: 32 },
  { value: "文😀", size: 768, margin: 48 },
]) {
  const code = new QRCodeStyling({
    type: "svg",
    width: size,
    height: size,
    data: Array.from(new TextEncoder().encode(value), (byte) =>
      String.fromCharCode(byte),
    ).join(""),
    margin,
    qrOptions: { errorCorrectionLevel: "H", mode: "Byte" },
    dotsOptions: { type: "extra-rounded", color: "#FFFFFF" },
    cornersSquareOptions: { type: "extra-rounded", color: "#FFFFFF" },
    cornersDotOptions: { type: "square", color: "#FFFFFF" },
    backgroundOptions: { color: "#FFFFFF00" },
  });
  let moduleSize = 0;
  code.applyExtension((svg) => {
    const paths = [...svg.querySelectorAll("path")].map((path) =>
      path.getAttribute("d"),
    );
    const ordinaryRects = [
      ...svg.querySelectorAll('clipPath:not([id*="corners-dot"]) rect'),
    ].map((rect) => rect.outerHTML);
    moduleSize = applyQRCodeFinderGeometry(svg);
    assert.deepEqual(
      [...svg.querySelectorAll("path")].map((path) => path.getAttribute("d")),
      paths,
      "the real encoder's data and outer-ring paths remain unchanged",
    );
    assert.deepEqual(
      [...svg.querySelectorAll('clipPath:not([id*="corners-dot"]) rect')].map(
        (rect) => rect.outerHTML,
      ),
      ordinaryRects,
      "finder rounding cannot alter quiet-zone or data-module rectangles",
    );
  });
  const blob = await code.getRawData("svg");
  assert.ok(blob instanceof Blob, "the public encoder must produce SVG");
  const svg = new window.DOMParser().parseFromString(
    await blob.text(),
    "image/svg+xml",
  );
  const finders = [...svg.querySelectorAll('clipPath[id*="corners-dot"]')];
  assert.equal(finders.length, 3, "all three real finder patterns are tested");
  for (const finder of finders) {
    const rect = finder.querySelector("rect");
    assert.ok(rect);
    const path = svg
      .getElementById(finder.id.replace("corners-dot", "corners-square"))
      ?.querySelector("path");
    assert.ok(path, "each finder center must have its matching outer ring");
    const d = path.getAttribute("d") ?? "";
    const arcs = [...d.matchAll(/a ([\d.]+) ([\d.]+),/g)];
    const moves = [...d.matchAll(/M ([\d.]+) ([\d.]+)/g)];
    assert.equal(arcs.length, 8);
    assert.equal(moves.length, 2);
    const unit = Number(rect.getAttribute("width")) / 3;
    close(moduleSize, unit);
    for (const arc of arcs.slice(0, 4)) {
      close(Number(arc[1]), unit * 2.5);
      close(Number(arc[2]), unit * 2.5);
    }
    for (const arc of arcs.slice(4)) {
      close(Number(arc[1]), unit * 1.5);
      close(Number(arc[2]), unit * 1.5);
    }
    close(Number(rect.getAttribute("rx")), unit * 0.5);
    close(Number(rect.getAttribute("ry")), unit * 0.5);

    const outerX = Number(moves[0][1]);
    const outerY = Number(moves[0][2]) - unit * 2.5;
    const innerX = Number(moves[1][1]) - unit * 1.5;
    const innerY = Number(moves[1][2]);
    const centerX = Number(rect.getAttribute("x"));
    const centerY = Number(rect.getAttribute("y"));
    close(innerX - outerX, unit);
    close(innerY - outerY, unit);
    close(centerX - outerX, unit * 2);
    close(centerY - outerY, unit * 2);
    for (const axis of [
      [outerX, innerX, centerX],
      [outerY, innerY, centerY],
    ]) {
      close(axis[0] + unit * 2.5, axis[1] + unit * 1.5);
      close(axis[0] + unit * 2.5, axis[2] + unit * 0.5);
    }
    assert.equal(
      rect.getAttribute("transform"),
      path.getAttribute("transform"),
    );
  }
}

await window.happyDOM.abort();
console.log("Actual QR SVG finder radii and shared corner centers passed");
