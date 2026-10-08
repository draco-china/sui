import { mock } from "bun:test";
import { strict as assert } from "node:assert";
import * as vgpu from "vgpu";
import { getMockGPUDeviceInstrumentation, init as mockInit } from "vgpu/mock";
import type { GlassFrame } from "../../../../packages/ui/src/lib/glass/renderer";

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const actual = { ...vgpu };

type ResourceState = { destroyed: number };
type DeviceState = Awaited<ReturnType<typeof instrumentedGpu>>;
let current: DeviceState | undefined;
let initialize: () => Promise<vgpu.Gpu> = async () => {
  if (!current) throw new Error("WebGPU adapter unavailable");
  return current.gpu;
};

function watch(image: vgpu.Texture, label: string) {
  const state = { destroyed: 0 };
  image.onDestroy(() => state.destroyed++);
  if (label === "Glass background") current?.inputs.push(state);
  else if (label === "Glass blurred background") current?.filtered.push(state);
  else current?.outputs.push(state);
  return image;
}

// Keep the real vgpu effect/reflection/frame/target/readback implementation. Only
// replace its hardware acquisition with the library's deterministic adapter.
mock.module("vgpu", () => ({
  ...actual,
  init: () => initialize(),
  texture: (...args: Parameters<typeof vgpu.texture>) =>
    watch(actual.texture(...args), args[1].label ?? ""),
  target: (...args: Parameters<typeof vgpu.target>) => {
    const output = actual.target(...args);
    watch(output.color, args[1].label ?? "");
    return output;
  },
}));
const { GlassRenderer } = await import(
  "../../../../packages/ui/src/lib/glass/renderer"
);

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { gpu: {} },
});
Object.assign(globalThis, {
  window: { devicePixelRatio: 1 },
  document: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData() {},
      }),
      toBlob: (done: (value: Blob) => void) => done(new Blob(["frame"])),
    }),
  },
});

async function instrumentedGpu(readGate?: Promise<void>) {
  const gpu = await mockInit();
  const lost = deferred<GPUDeviceLostInfo>();
  Object.assign(gpu.gpu, {
    lost: lost.promise,
    pushErrorScope() {},
    popErrorScope: async () => null,
  });
  const inputs: ResourceState[] = [];
  const outputs: ResourceState[] = [];
  const filtered: ResourceState[] = [];
  const uploads: HTMLCanvasElement[] = [];
  const uniforms: Float32Array[] = [];
  const blurUniforms: Float32Array[] = [];
  let failUpload = false;
  let reads = 0;
  const queue = gpu.gpu.queue;
  const write = queue.writeBuffer.bind(queue);
  Object.assign(queue, {
    copyExternalImageToTexture: ({ source }: { source: HTMLCanvasElement }) => {
      if (failUpload) {
        failUpload = false;
        throw new Error("Background upload failed");
      }
      uploads.push(source);
    },
    writeBuffer: (buffer: GPUBuffer, offset: number, data: ArrayBuffer) => {
      write(buffer, offset, data);
      const values = new Float32Array(data.slice(0));
      (values.length > 8 ? uniforms : blurUniforms).push(values);
    },
  });
  const read = gpu.device.readback.readTexture.bind(gpu.device.readback);
  gpu.device.readback.readTexture = async (...args) => {
    if (++reads === 1 && readGate) await readGate;
    return read(...args);
  };
  return {
    gpu,
    lost,
    inputs,
    outputs,
    filtered,
    uploads,
    uniforms,
    blurUniforms,
    instrumentation: getMockGPUDeviceInstrumentation(gpu.gpu),
    failNextUpload: () => {
      failUpload = true;
    },
  };
}
async function configureDevice(readGate?: Promise<void>) {
  current = await instrumentedGpu(readGate);
  return current;
}

await assert.rejects(GlassRenderer.create(), /adapter unavailable/);
const early = new AbortController();
early.abort();
await assert.rejects(GlassRenderer.create(early.signal), /cancelled/);

const arriving = await configureDevice();
const arrival = deferred<vgpu.Gpu>();
const normalInit = initialize;
initialize = () => arrival.promise;
const abortArrival = new AbortController();
const waiting = GlassRenderer.create(abortArrival.signal);
abortArrival.abort();
arrival.resolve(arriving.gpu);
await assert.rejects(waiting, /cancelled/);
assert.equal(
  arriving.gpu.disposed,
  true,
  "a context arriving after cancellation is released",
);
initialize = normalInit;

const failed = await configureDevice();
failed.gpu.gpu.createRenderPipelineAsync = async () => {
  throw new Error("WGSL compilation failed");
};
await assert.rejects(GlassRenderer.create(), /pipeline compilation failed/);
assert.equal(
  failed.gpu.disposed,
  true,
  "failed pipeline initialization disposes vgpu caches",
);

const building = await configureDevice();
const pipeline = deferred<GPURenderPipeline>();
building.gpu.gpu.createRenderPipelineAsync = () => pipeline.promise;
const abortBuild = new AbortController();
const initializing = GlassRenderer.create(abortBuild.signal);
await new Promise((done) => setTimeout(done, 0));
assert.ok(building.instrumentation.calls.createShaderModule >= 2);
abortBuild.abort();
pipeline.resolve({} as GPURenderPipeline);
await assert.rejects(initializing, /disposed/);
assert.equal(building.gpu.disposed, true);

const frame: GlassFrame = {
  width: 16,
  height: 16,
  margin: 0,
  radius: [4, 4, 4, 4],
  strength: 22,
  blur: 8,
  tint: [1, 1, 1],
  tintOpacity: 0.28,
  foreground: [0, 0, 0],
};
const source = { width: 16, height: 16 } as HTMLCanvasElement;
const running = await configureDevice();
const renderer = await GlassRenderer.create();
running.lost.resolve({
  reason: "unknown",
  message: "GPU device lost during capture",
} as GPUDeviceLostInfo);
await Promise.resolve();
await assert.rejects(renderer.render(source, frame), /GPU device lost/);
renderer.destroy();
renderer.destroy();
assert.equal(running.gpu.disposed, true);

const queued = await configureDevice();
const disposed = await GlassRenderer.create();
const operation = disposed.render(source, frame);
disposed.destroy();
await assert.rejects(operation, /disposed/);
assert.equal(queued.gpu.disposed, true);

const shared = await configureDevice();
const sharedRenderer = await GlassRenderer.create();
const viewport = { width: 640, height: 480 } as HTMLCanvasElement;
await Promise.all([
  sharedRenderer.render(viewport, { ...frame, origin: [12, 34] }),
  sharedRenderer.render(viewport, { ...frame, origin: [200, 80] }),
  sharedRenderer.render(viewport, { ...frame, margin: 5 }),
]);
assert.equal(shared.uploads.length, 1, "multiple surfaces share one upload");
assert.equal(shared.inputs.length, 1);
assert.equal(shared.inputs[0]?.destroyed, 0, "input survives frame readback");
assert.equal(
  shared.filtered.length,
  1,
  "equal blur levels share their filtered texture",
);
assert.equal(shared.filtered[0]?.destroyed, 0);
assert.equal(
  shared.blurUniforms.length,
  2,
  "real vgpu Gaussian effects run once per snapshot and blur level",
);
assert.deepEqual(
  Array.from(shared.blurUniforms[0]?.slice(0, 6) ?? []),
  [320, 240, 1 / 320, 0, 4, 12].map(Math.fround),
);
assert.deepEqual(
  Array.from(shared.blurUniforms[1]?.slice(2, 6) ?? []),
  [0, 1 / 240, 4, 12].map(Math.fround),
);
assert.deepEqual(
  Array.from(shared.uniforms[0]?.slice(4, 8) ?? []),
  [640, 480, 12, 34],
);
assert.deepEqual(Array.from(shared.uniforms[1]?.slice(6, 8) ?? []), [200, 80]);
assert.deepEqual(Array.from(shared.uniforms[2]?.slice(6, 8) ?? []), [5, 5]);
assert.equal(
  shared.uniforms[0]?.length,
  284,
  "refraction packing uses a 112-byte base plus two text arrays",
);
assert.deepEqual(
  Array.from(shared.uniforms[0]?.slice(16, 18) ?? []),
  [frame.tintOpacity, frame.strength].map(Math.fround),
);
assert.equal(
  shared.uniforms[0]?.[23],
  Math.fround(4.55),
  "minimum contrast shares the tint alignment slot",
);
assert.equal(shared.uniforms[0]?.[17], 22);
assert.equal(shared.uniforms[0]?.[27], 1);
assert.ok(
  shared.instrumentation.calls.createCommandEncoder >= 4,
  "vgpu encodes blur and refraction frames",
);
const textColors: [number, number, number, number][] = [
  [0.08, 0.08, 0.08, 1],
  [0.35, 0.35, 0.35, 1],
  [0, 0.3, 0.7, 0.9],
];
const textBounds: [number, number, number, number][] = [
  [4, 8, 30, 20],
  [40, 8, 68, 20],
  [80, 8, 110, 20],
];
await sharedRenderer.render(viewport, { ...frame, textColors, textBounds });
assert.equal(shared.uniforms.at(-1)?.[27], textColors.length);
assert.deepEqual(
  Array.from(shared.uniforms.at(-1)?.slice(28, 40) ?? []),
  textColors.flat().map(Math.fround),
);
assert.deepEqual(
  Array.from(shared.uniforms.at(-1)?.slice(156, 168) ?? []),
  textBounds.flat(),
  "vgpu reflection packs bounds into WGSL arrays",
);
await assert.rejects(
  sharedRenderer.render(viewport, {
    ...frame,
    textColors,
    textBounds: [[0, 0, Number.NaN, 12]],
  }),
  { name: "GlassContrastError", message: "Unsupported glass text bounds" },
);
await assert.rejects(
  sharedRenderer.render(viewport, {
    ...frame,
    textColors: [
      [0, 0.4, 0.8, 1],
      [1, 1, 1, 1],
    ],
  }),
  {
    name: "GlassContrastError",
    message: "Glass text colors have no shared contrast background",
  },
);
await assert.rejects(
  sharedRenderer.render(viewport, {
    ...frame,
    textColors: Array.from({ length: 33 }, () => [0, 0, 0, 1]),
  }),
  { name: "GlassContrastError", message: "Unsupported glass text colors" },
);
assert.ok(shared.outputs.every((output) => output.destroyed === 1));
const beforeZero = shared.blurUniforms.length;
await sharedRenderer.render(viewport, { ...frame, blur: 0 });
assert.equal(shared.blurUniforms.length, beforeZero);
for (const blur of [6, 4, 2])
  await sharedRenderer.render(viewport, { ...frame, blur });
assert.equal(
  shared.uploads.length,
  1,
  "material changes reuse uploaded snapshots",
);
assert.equal(shared.filtered.length, 4);
assert.equal(shared.filtered[0]?.destroyed, 1);
assert.equal(
  shared.filtered.filter((image) => image.destroyed === 0).length,
  3,
);
await assert.rejects(
  sharedRenderer.render(viewport, { ...frame, minimumContrast: Number.NaN }),
  /Invalid glass frame/,
);
await assert.rejects(
  sharedRenderer.render(viewport, { ...frame, blur: -1 }),
  /Invalid glass frame/,
);

const isolated = await configureDevice();
const isolatedRenderer = await GlassRenderer.create();
await isolatedRenderer.render(viewport, frame);
assert.equal(isolated.uploads.length, 1, "contexts own separate textures");
isolatedRenderer.destroy();
assert.equal(isolated.inputs[0]?.destroyed, 1);
assert.ok(isolated.filtered.every((image) => image.destroyed === 1));
assert.equal(shared.inputs[0]?.destroyed, 0);
current = shared;
const siblings = Array.from(
  { length: 4 },
  () => ({ width: 640, height: 480 }) as HTMLCanvasElement,
);
for (const background of siblings.slice(0, 3))
  await sharedRenderer.render(background, frame);
await sharedRenderer.render(viewport, { ...frame, origin: [14, 36] });
assert.equal(
  shared.uploads.length,
  4,
  "movement only updates reflected uniforms",
);
await sharedRenderer.render(siblings[3] as HTMLCanvasElement, frame);
assert.equal(
  shared.inputs[1]?.destroyed,
  1,
  "evicts least recently used input",
);
assert.equal(shared.inputs[0]?.destroyed, 0);
assert.equal(shared.inputs.filter((image) => image.destroyed === 0).length, 4);
viewport.width = 800;
await sharedRenderer.render(viewport, frame);
assert.equal(shared.inputs[0]?.destroyed, 1, "resized input is invalidated");
shared.failNextUpload();
const failedSource = { width: 100, height: 100 } as HTMLCanvasElement;
await assert.rejects(
  sharedRenderer.render(failedSource, frame),
  /upload failed/,
);
assert.equal(shared.inputs.at(-1)?.destroyed, 1);
await sharedRenderer.render(failedSource, frame);
assert.equal(
  shared.uploads.at(-1),
  failedSource,
  "failed uploads can be retried",
);
await assert.rejects(
  sharedRenderer.render(viewport, { ...frame, origin: [Number.NaN, 0] }),
  /Invalid glass frame/,
);
sharedRenderer.destroy();
sharedRenderer.destroy();
assert.ok(
  [...shared.filtered, ...shared.inputs, ...shared.outputs].every(
    (image) => image.destroyed === 1,
  ),
);
assert.equal(shared.gpu.disposed, true);

const readGate = deferred<void>();
const serial = await configureDevice(readGate.promise);
const serialRenderer = await GlassRenderer.create();
const firstFrame = serialRenderer.render(viewport, {
  ...frame,
  origin: [20, 30],
});
const secondFrame = serialRenderer.render(viewport, {
  ...frame,
  origin: [40, 50],
});
await new Promise((done) => setTimeout(done, 0));
assert.equal(
  serial.uniforms.length,
  1,
  "readback serializes vgpu uniform updates",
);
assert.equal(serial.outputs.length, 2, "queued frame waits for readback");
readGate.resolve();
await Promise.all([firstFrame, secondFrame]);
assert.equal(serial.uploads.length, 1);
assert.deepEqual(Array.from(serial.uniforms[1]?.slice(6, 8) ?? []), [40, 50]);
serialRenderer.destroy();

const cancelledRead = deferred<void>();
const cancelled = await configureDevice(cancelledRead.promise);
const cancelSignal = new AbortController();
const cancelledRenderer = await GlassRenderer.create(cancelSignal.signal);
const cancelledFrame = cancelledRenderer.render(viewport, frame);
await new Promise((done) => setTimeout(done, 0));
cancelSignal.abort();
cancelledRead.resolve();
await assert.rejects(cancelledFrame, /disposed|destroyed/);
assert.ok(
  [...cancelled.inputs, ...cancelled.outputs, ...cancelled.filtered].every(
    (image) => image.destroyed === 1,
  ),
);
assert.equal(cancelled.gpu.disposed, true);
console.log(
  "real vgpu effects, reflected WGSL uniforms, Gaussian frame passes, library readback, bounded snapshot caches, cancellation and idempotent cleanup passed",
);
