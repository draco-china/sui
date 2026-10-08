import { strict as assert } from "node:assert";
import { Window as HappyWindow } from "happy-dom";
import {
  type GlassTextColor,
  GlassTextContrastCache,
  glassTextContrast,
  resolveGlassContrastTint,
} from "../../../../packages/ui/src/lib/glass/contrast";

const window = new HappyWindow() as unknown as Window &
  typeof globalThis & { happyDOM: { abort: () => Promise<void> } };
Object.assign(globalThis, { window, document: window.document });
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value: () => ({
    fillStyle: "rgb(0, 0, 0)",
    fillRect() {},
    getImageData() {
      const channels = this.fillStyle
        .match(/^rgba?\(([^)]+)\)$/)?.[1]
        .split(",")
        .map(Number);
      assert.ok(channels, `fixture color must use RGB: ${this.fillStyle}`);
      return {
        data: new Uint8ClampedArray([
          channels[0],
          channels[1],
          channels[2],
          (channels[3] ?? 1) * 255,
        ]),
      };
    },
  }),
});
let reads = 0;
const computed = window.getComputedStyle.bind(window);
Object.assign(globalThis, {
  getComputedStyle: (element: Element, pseudo?: string) => {
    reads++;
    if (pseudo === "::placeholder") {
      return {
        color:
          element.getAttribute("data-placeholder-color") ??
          "rgb(100, 100, 100)",
        opacity: "1",
      };
    }
    return computed(element);
  },
});
const surface = document.createElement("div");
surface.style.color = "rgb(20, 20, 20)";
surface.innerHTML = `
  Root text
  <p style="color:rgb(90,90,90)">Muted text</p>
  <p style="color:rgb(90,90,90)">Same muted color</p>
  <a style="color:rgb(0,88,204)">Semantic link</a>
  <span style="color:rgb(180,20,20)">Danger text</span>
  <span hidden style="color:rgb(240,0,0)">Hidden</span>
  <span style="visibility:hidden;color:rgb(240,1,0)">Invisible</span>
  <span style="display:none;color:rgb(240,2,0)">Closed</span>
  <div style="background-color:rgb(230,230,230)"><span style="color:rgb(240,3,0)">Independent surface</span></div>
  <div style="background-image:linear-gradient(white,black)"><span style="color:rgb(240,4,0)">Gradient surface</span></div>
  <div data-glass="true" style="color:rgb(240,5,0)">Nested glass</div>
  <input placeholder="Search" data-placeholder-color="rgb(100,100,100)" />
  <textarea placeholder="Message" data-placeholder-color="rgb(105,105,105)"></textarea>
  <input value="Actual input" style="color:rgb(110,110,110)" />
  <span style="color:rgba(80,80,80,0.8)">Transparent text</span>
`;
document.body.append(surface);
const cache = new GlassTextContrastCache();
const colors = cache.read(surface);
assert.equal(
  colors.length,
  8,
  "only distinct text owned by this surface is collected",
);
for (const channels of [
  [20, 20, 20],
  [90, 90, 90],
  [0, 88, 204],
  [180, 20, 20],
  [100, 100, 100],
  [105, 105, 105],
  [110, 110, 110],
  [80, 80, 80],
])
  assert.ok(
    colors.some((color) =>
      channels.every((channel, index) => color[index] === channel / 255),
    ),
  );
assert.equal(colors.at(-1)?.[3], 204 / 255, "RGBA text alpha is preserved");
const scanned = reads;
assert.equal(cache.read(surface), colors);
assert.equal(reads, scanned, "unchanged frames reuse the DOM/style scan");
Object.defineProperty(surface, "getBoundingClientRect", {
  value: () => new window.DOMRect(100, 200, 300, 160),
});
const link = surface.querySelector("a");
assert.ok(link);
let linkLeft = 120;
Object.defineProperty(link, "getBoundingClientRect", {
  value: () => new window.DOMRect(linkLeft, 220, 80, 20),
});
const linkColor = colors.findIndex((color) => color[2] === 204 / 255);
assert.deepEqual(cache.readBounds(surface)[linkColor], [20, 20, 100, 40]);
linkLeft = 140;
assert.deepEqual(cache.readBounds(surface)[linkColor], [40, 20, 120, 40]);
assert.equal(
  reads,
  scanned,
  "moving text updates bounds without rescanning styles",
);
window.dispatchEvent(new window.Event("scroll"));
assert.equal(cache.read(surface), colors);
assert.equal(reads, scanned, "scrolling alone cannot invalidate text colors");
const paragraph = surface.querySelector("p");
assert.ok(paragraph);
paragraph.style.color = "rgb(95,95,95)";
cache.invalidate();
assert.ok(cache.read(surface).some((color) => color[0] === 95 / 255));
assert.ok(reads > scanned, "DOM/theme revisions read current text styles");
const input = surface.querySelector("input");
assert.ok(input);
input.value = "Edited";
input.style.color = "rgb(115,115,115)";
const edited = cache.read(surface);
assert.ok(edited.some((color) => color[0] === 115 / 255));
assert.ok(!edited.some((color) => color[0] === 100 / 255));
assert.notEqual(
  edited,
  colors,
  "controlled value changes detect placeholder visibility without an input event",
);
assert.equal(paragraph.style.color, "rgb(95, 95, 95)");
assert.equal(surface.querySelector("a")?.style.color, "rgb(0, 88, 204)");

const cases: { tint: [number, number, number]; colors: GlassTextColor[] }[] = [
  {
    tint: [1, 1, 1],
    colors: [
      [0.08, 0.08, 0.08, 1],
      [0.35, 0.35, 0.35, 1],
      [0, 0.3, 0.7, 1],
      [0.7, 0.08, 0.08, 1],
    ],
  },
  {
    tint: [0.1, 0.1, 0.1],
    colors: [
      [0.96, 0.96, 0.96, 1],
      [0.75, 0.75, 0.75, 1],
      [0.7, 0.85, 1, 0.9],
    ],
  },
  {
    tint: [1, 1, 1],
    colors: [
      [0, 0, 0, 1],
      [1, 1, 1, 1],
    ],
  },
];
for (const { tint, colors: textColors } of cases) {
  const safe = resolveGlassContrastTint(tint, textColors, 4.55);
  assert.ok(safe, "normal semantic colors must have a shared safe backdrop");
  for (const color of textColors)
    assert.ok(glassTextContrast(safe, color) >= 4.55);
  for (let sample = 0; sample <= 255; sample += 5) {
    let result = [
      sample / 255,
      ((sample * 3) % 256) / 255,
      ((sample * 7) % 256) / 255,
    ];
    const passes = () =>
      textColors.every((color) => glassTextContrast(result, color) >= 4.55);
    for (let step = 0; step < 8 && !passes(); step++)
      result = result.map(
        (channel, index) => channel * 0.82 + safe[index] * 0.18,
      );
    if (!passes()) result = safe;
    const pixels = result.map((channel) => Math.round(channel * 255) / 255);
    for (const color of textColors)
      assert.ok(
        glassTextContrast(pixels, color) >= 4.5,
        "shared shader correction retains text contrast after PNG quantization",
      );
  }
}
assert.equal(
  resolveGlassContrastTint(
    [1, 1, 1],
    [
      [0, 0.4, 0.8, 1],
      [1, 1, 1, 1],
    ],
    4.55,
  ),
  undefined,
  "incompatible unbacked semantic colors do not silently lose a constraint",
);
assert.equal(
  resolveGlassContrastTint([1, 1, 1], [[0, 0, 0, 0.05]], 4.55),
  undefined,
  "very transparent text may have no safe material background",
);
await window.happyDOM.abort();
console.log(
  "Owned glass text, placeholder colors, cached styles and contrast constraints passed",
);
