import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import { scenario } from "../support/scenario";

let creates = 0;
let destroyed = 0;
let reject = false;
let pending: Promise<void> | undefined;
let accessibility = false;
Object.assign(globalThis, {
  window: { matchMedia: () => ({ matches: accessibility }) },
});
mock.module("../../../../packages/ui/src/lib/glass/svg-renderer", () => ({
  SvgGlassRenderer: {
    create: async () => {
      creates++;
      const wait = pending;
      pending = undefined;
      await wait;
      if (reject) throw new Error("No SVG displacement");
      return { destroy: () => destroyed++ };
    },
  },
}));
const { prepareGlassRenderer, releaseGlassRenderers, failGlassRenderer } =
  await import("../../../../packages/ui/src/lib/glass/backend");
scenario("every scope shares one renderer initialization");
const choices = await Promise.all(
  Array.from({ length: 8 }, () => prepareGlassRenderer()),
);
assert.equal(creates, 1, "all scopes share one renderer initialization");
assert.ok(choices[0] && choices.every((choice) => choice === choices[0]));
scenario("a failed renderer keeps CSS and is not retried by each surface");
failGlassRenderer();
assert.equal(destroyed, 1);
assert.equal(await prepareGlassRenderer(), undefined, "a failure keeps CSS");
assert.equal(creates, 1, "a failed renderer is not retried by each surface");
scenario("an initialization failure leaves the CSS base");
releaseGlassRenderers();
reject = true;
assert.equal(
  await prepareGlassRenderer(),
  undefined,
  "an initialization failure leaves the CSS base",
);
scenario("reduced transparency never requests SVG");
releaseGlassRenderers();
reject = false;
accessibility = true;
const beforeAccessible = creates;
assert.equal(await prepareGlassRenderer(), undefined);
assert.equal(creates, beforeAccessible, "reduced transparency skips SVG");
scenario(
  "a released provider destroys an abandoned renderer and starts afresh",
);
accessibility = false;
let finish!: () => void;
pending = new Promise((resolve) => {
  finish = resolve;
});
const abandoned = prepareGlassRenderer();
await Promise.resolve();
const destroyedBefore = destroyed;
releaseGlassRenderers();
finish();
assert.equal(await abandoned, undefined);
assert.equal(
  destroyed,
  destroyedBefore + 1,
  "an abandoned initialization destroys its renderer",
);
assert.ok(await prepareGlassRenderer(), "a new provider gets a fresh session");
releaseGlassRenderers();
