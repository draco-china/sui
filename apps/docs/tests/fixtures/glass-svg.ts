import { strict as assert } from "node:assert";
import { Window } from "happy-dom";
import { scenario } from "../support/scenario";

const window = new Window();
const document = window.document as unknown as Document;
Object.assign(globalThis, {
  window,
  document,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
});

import { glassRefractionStrength } from "../../../../packages/ui/src/lib/glass/refraction";
import { SvgGlassRenderer } from "../../../../packages/ui/src/lib/glass/svg-renderer";

// Only displacement-map canvas work is mocked. Definitions use real HappyDOM SVG nodes.
const maps: { width: number; height: number; data: Uint8ClampedArray }[] = [];
let encodes = 0;
Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  value(this: HTMLCanvasElement, type: string) {
    assert.equal(type, "2d");
    return {
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: ({ data }: { data: Uint8ClampedArray }) =>
        maps.push({ width: this.width, height: this.height, data }),
      drawImage() {
        throw new Error("native filter must not draw a sampled background");
      },
      getImageData() {
        throw new Error("HappyDOM does not prove browser displacement support");
      },
    };
  },
});
Object.defineProperty(window.HTMLCanvasElement.prototype, "toDataURL", {
  value() {
    encodes++;
    return "data:image/png;base64,AA==";
  },
});
Object.defineProperty(window.HTMLCanvasElement.prototype, "toBlob", {
  value() {
    throw new Error("native filter must not encode a sampled background");
  },
});

const originalCSS = window.CSS;
const syntaxChecks: [string, string][] = [];
Object.defineProperty(window, "CSS", {
  configurable: true,
  value: {
    supports(property: string, value: string) {
      syntaxChecks.push([property, value]);
      return false;
    },
  },
});
scenario("browsers without SVG backdrop syntax fail before any probe");
await assert.rejects(
  SvgGlassRenderer.create(),
  /backdrop filtering unavailable/,
);
assert.deepEqual(syntaxChecks, [["backdrop-filter", 'url("#glass-probe")']]);
assert.equal(
  encodes,
  0,
  "unsupported syntax exits before any pixel probe or map encoding",
);
scenario(
  "WebKit fails before rasterizing a probe while Chromium keeps its pixel probe",
);
// WebKit accepts URL syntax and inline SVG displacement, but ignores SVG backdrops.
Object.defineProperty(window, "CSS", {
  configurable: true,
  value: { supports: () => true },
});
const originalAgent = Object.getOwnPropertyDescriptor(
  window.navigator,
  "userAgent",
);
const originalImage = window.Image;
let probes = 0;
Object.assign(window, {
  Image: class {
    decode() {
      probes++;
      throw new Error("SVG pixel probe started");
    }
  },
});
for (const agent of [
  "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15",
  "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/143.0 Mobile Safari/604.1",
  "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/144.0 Mobile Safari/605.1.15",
]) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: agent,
  });
  await assert.rejects(
    SvgGlassRenderer.create(),
    /backdrop filtering unavailable/,
  );
}
assert.equal(probes, 0, "unsupported WebKit exits before rasterizing a probe");
for (const agent of [
  "Mozilla/5.0 AppleWebKit/537.36 Chrome/143.0 Safari/537.36",
  "Mozilla/5.0 AppleWebKit/537.36 Chrome/143.0 Safari/537.36 Edg/143.0",
]) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: agent,
  });
  await assert.rejects(SvgGlassRenderer.create(), /SVG pixel probe started/);
}
assert.equal(
  probes,
  2,
  "Chromium retains its existing displacement pixel probe",
);
if (originalAgent)
  Object.defineProperty(window.navigator, "userAgent", originalAgent);
else Reflect.deleteProperty(window.navigator, "userAgent");
Object.assign(window, { Image: originalImage });
Object.defineProperty(window, "CSS", {
  configurable: true,
  value: originalCSS,
});

scenario(
  "a filter URL references an SVG definition with the Clear blur and both maps",
);
const renderer = new SvgGlassRenderer();
const first = document.createElement("div") as unknown as HTMLElement;
const second = document.createElement("div") as unknown as HTMLElement;
document.body.append(first, second);
const geometry = {
  width: 36,
  height: 36,
  radius: [18, 18, 18, 18] as [number, number, number, number],
  strength: 22,
};
function definition(url: string) {
  const match = /^url\(["']?#([^"')]+)["']?\)$/.exec(url);
  assert.ok(match, "synchronous filter URL references a local SVG definition");
  const filter = document.getElementById(match[1]);
  assert.ok(filter, "referenced definition exists");
  assert.equal(filter.namespaceURI, "http://www.w3.org/2000/svg");
  assert.equal(filter.localName, "filter");
  return filter;
}
const firstUrl = renderer.filter(first, geometry);
assert.equal(typeof firstUrl, "string");
const firstFilter = definition(firstUrl);
const root = firstFilter.closest("svg");
assert.ok(
  root?.isConnected,
  "definitions root is attached to the actual document",
);
assert.equal(
  firstFilter.querySelector("feGaussianBlur")?.getAttribute("stdDeviation"),
  "4",
);
assert.equal(firstFilter.querySelectorAll("feDisplacementMap").length, 2);
assert.equal(
  firstFilter.querySelector("feDisplacementMap")?.getAttribute("scale"),
  String(glassRefractionStrength(22, 36, 36)),
);
const [normalMap, clarityMap] = maps;
assert.equal(normalMap.width, 72);
assert.equal(normalMap.height, 72);
assert.ok(
  normalMap.data.every((value, index) => index % 4 !== 2 || value === 0),
  "the normal map carries displacement only",
);
// Clarity is gray, which wide-gamut color management leaves unchanged.
assert.ok(
  clarityMap.data.every(
    (value, index) =>
      index % 4 === 3 || value === clarityMap.data[index - (index % 4)],
  ),
);
assert.ok(clarityMap.data.some((value, index) => index % 4 === 0 && !value));
assert.ok(
  clarityMap.data.some((value, index) => index % 4 === 0 && value > 200),
);
assert.equal(encodes, 2);
scenario("stable geometry never re-encodes its maps");
assert.equal(renderer.filter(first, { ...geometry }), firstUrl);
assert.equal(document.querySelectorAll("filter").length, 1);
assert.equal(encodes, 2, "stable geometry never re-encodes its maps");

scenario(
  "elements own their definitions but share geometry maps across strengths",
);
const secondUrl = renderer.filter(second, geometry);
assert.notEqual(
  secondUrl,
  firstUrl,
  "different elements own independent definitions",
);
assert.equal(document.querySelectorAll("filter").length, 2);
assert.equal(encodes, 2, "same shapes share geometry maps across elements");
assert.equal(renderer.filter(first, { ...geometry, strength: 0 }), firstUrl);
assert.equal(
  definition(firstUrl)
    .querySelector("feDisplacementMap")
    ?.getAttribute("scale"),
  "0",
);
assert.equal(encodes, 2, "strength changes reuse the geometry maps");
assert.equal(
  definition(firstUrl)
    .querySelector("feGaussianBlur")
    ?.getAttribute("stdDeviation"),
  "4",
);

scenario(
  "new dimensions and radii update the geometry while recent shapes stay cached",
);
const changed = {
  ...geometry,
  width: 40,
  radiusY: [12, 12, 12, 12] as [number, number, number, number],
};
assert.equal(renderer.filter(first, changed), firstUrl);
assert.equal(encodes, 4, "dimensions and elliptical radii update geometry");
assert.equal(maps[2].width, 80);
assert.equal(maps[2].height, 72);
const shapes = Array.from({ length: 5 }, (_, index) => ({
  ...geometry,
  width: 45 + index,
}));
for (const shape of shapes) renderer.filter(first, shape);
const prepared = encodes;
for (const shape of shapes) renderer.filter(first, shape);
assert.equal(encodes, prepared, "a small group of shapes stays cached");
assert.equal(document.querySelectorAll("filter").length, 2);
scenario("invalid geometry throws without adding definitions");
for (const invalid of [
  { ...geometry, width: 0 },
  { ...geometry, strength: Number.NaN },
  { ...geometry, radius: [-1, 18, 18, 18] as [number, number, number, number] },
])
  assert.throws(() => renderer.filter(first, invalid), /geometry/);
assert.equal(
  document.querySelectorAll("filter").length,
  2,
  "invalid geometry does not add definitions",
);
scenario("release removes only its own element's definition");
renderer.release(first);
assert.equal(document.querySelectorAll("filter").length, 1);
assert.ok(
  definition(secondUrl).isConnected,
  "release preserves other elements' definitions",
);
renderer.release(first);
const reacquired = renderer.filter(first, geometry);
assert.ok(definition(reacquired).isConnected);
assert.equal(encodes, prepared);
scenario("corner direction does not amplify edge clarity");
renderer.filter(first, {
  ...geometry,
  radius: [0, 0, 0, 0],
});
const squareMap = maps.at(-1);
assert.ok(squareMap);
const cornerBlue = squareMap.data[(8 * squareMap.width + 8) * 4 + 2];
const flatBlue = squareMap.data[(36 * squareMap.width + 8) * 4 + 2];
assert.ok(cornerBlue > 0 && cornerBlue < 255);
assert.equal(
  cornerBlue,
  flatBlue,
  "corner direction does not amplify clarity at the same edge depth",
);
renderer.filter(first, {
  ...geometry,
  radius: [0, 18, 18, 18],
});
const mixedMap = maps.at(-1);
assert.ok(mixedMap);
assert.equal(
  mixedMap.data[(8 * mixedMap.width + 8) * 4 + 2],
  mixedMap.data[(36 * mixedMap.width + 8) * 4 + 2],
  "a flat corner on a rounded surface retains scalar edge clarity",
);
scenario("destroy removes every definition and rejects later filters");
renderer.destroy();
assert.equal(root.isConnected, false);
assert.equal(document.querySelectorAll("filter").length, 0);
assert.throws(() => renderer.filter(first, geometry), /disposed/);
renderer.release(first);
renderer.destroy();
first.remove();
second.remove();
await window.happyDOM.close();
