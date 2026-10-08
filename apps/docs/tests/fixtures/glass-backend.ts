import { mock } from "bun:test";
import { strict as assert } from "node:assert";

let gpuCreates = 0;
let svgCreates = 0;
let gpuDestroyed = 0;
let svgDestroyed = 0;
let rejectGpu = false;
let rejectSvg = false;
let pending: Promise<void> | undefined;
let accessibility = false;
Object.assign(globalThis, {
  window: { matchMedia: () => ({ matches: accessibility }) },
});
mock.module("../../../../packages/ui/src/lib/glass/renderer", () => ({
  GlassRenderer: {
    create: async () => {
      gpuCreates++;
      const wait = pending;
      pending = undefined;
      await wait;
      if (rejectGpu) throw new Error("No adapter");
      return { render: async () => new Blob(), destroy: () => gpuDestroyed++ };
    },
  },
}));
mock.module("../../../../packages/ui/src/lib/glass/svg-renderer", () => ({
  SvgGlassRenderer: {
    create: async () => {
      svgCreates++;
      if (rejectSvg) throw new Error("No SVG displacement");
      return { render: async () => new Blob(), destroy: () => svgDestroyed++ };
    },
  },
}));
const { prepareGlassRenderer, releaseGlassRenderers, failGlassRenderer } =
  await import("../../../../packages/ui/src/lib/glass/backend");
assert.equal(await prepareGlassRenderer("css"), undefined);
assert.equal(gpuCreates + svgCreates, 0);
const choices = await Promise.all(
  Array.from({ length: 8 }, () => prepareGlassRenderer("auto")),
);
assert.equal(gpuCreates, 1, "all scopes share one device initialization");
assert.ok(
  choices.every((choice) => choice === choices[0] && choice?.kind === "vgpu"),
);
assert.equal(svgCreates, 0, "the SVG renderer loads only when needed");
failGlassRenderer("vgpu");
assert.equal((await prepareGlassRenderer("auto"))?.kind, "svg");
assert.equal(gpuDestroyed, 1);
assert.equal(svgCreates, 1);
assert.equal((await prepareGlassRenderer("auto"))?.kind, "svg");
assert.equal(gpuCreates, 1, "a failed device is not retried by each surface");
failGlassRenderer("svg");
assert.equal(await prepareGlassRenderer("auto"), undefined);
assert.equal(svgDestroyed, 1);
releaseGlassRenderers();
rejectGpu = true;
assert.equal(
  (await prepareGlassRenderer("auto"))?.kind,
  "svg",
  "initialization failure uses SVG directly",
);
releaseGlassRenderers();
const beforeSvgMode = gpuCreates;
assert.equal((await prepareGlassRenderer("svg"))?.kind, "svg");
assert.equal(gpuCreates, beforeSvgMode, "explicit SVG never requests a GPU");
releaseGlassRenderers();
rejectSvg = true;
assert.equal(
  await prepareGlassRenderer("auto"),
  undefined,
  "both failed probes leave the CSS base",
);
releaseGlassRenderers();
accessibility = true;
const beforeAccessible = gpuCreates + svgCreates;
assert.equal(await prepareGlassRenderer("auto"), undefined);
assert.equal(gpuCreates + svgCreates, beforeAccessible);
accessibility = false;
rejectGpu = false;
rejectSvg = false;
let finish!: () => void;
pending = new Promise((resolve) => {
  finish = resolve;
});
const abandoned = prepareGlassRenderer("auto");
await Promise.resolve();
const destroyedBefore = gpuDestroyed;
releaseGlassRenderers();
finish();
assert.equal(await abandoned, undefined);
assert.equal(
  gpuDestroyed,
  destroyedBefore + 1,
  "an abandoned initialization destroys its device",
);
assert.equal(
  (await prepareGlassRenderer("auto"))?.kind,
  "vgpu",
  "a new provider gets a fresh session",
);
releaseGlassRenderers();
console.log(
  "shared provider capability detection and three-tier fallback passed",
);
