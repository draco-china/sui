import { strict as assert } from "node:assert";
import {
  type GlassFrame,
  GlassRenderer,
} from "../../../../packages/ui/src/lib/glass/renderer";

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setGpu(requestAdapter: () => Promise<GPUAdapter | null>) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { gpu: { requestAdapter } },
  });
}
Object.assign(globalThis, {
  GPUBufferUsage: { UNIFORM: 64, COPY_DST: 8, MAP_READ: 1 },
  GPUTextureUsage: {
    TEXTURE_BINDING: 4,
    COPY_DST: 2,
    RENDER_ATTACHMENT: 16,
    COPY_SRC: 1,
  },
  GPUMapMode: { READ: 1 },
});
setGpu(async () => null);
await assert.rejects(GlassRenderer.create(), /adapter unavailable/);

const adapterRequest = deferred<GPUAdapter | null>();
let deviceRequests = 0;
const earlyAbort = new AbortController();
setGpu(() => adapterRequest.promise);
const early = GlassRenderer.create(earlyAbort.signal);
earlyAbort.abort();
adapterRequest.resolve({
  requestDevice: async () => {
    deviceRequests++;
    throw new Error("Should not request a device");
  },
} as unknown as GPUAdapter);
await assert.rejects(early, /cancelled/);
assert.equal(deviceRequests, 0);

function fakeDevice(compilationError = false) {
  const pipeline = deferred<GPURenderPipeline>();
  const lost = deferred<GPUDeviceLostInfo>();
  const counts = { device: 0, buffer: 0, pipeline: 0 };
  const device = {
    createBuffer: () => ({ destroy: () => counts.buffer++ }),
    createSampler: () => ({}),
    createShaderModule: () => ({
      getCompilationInfo: async () => ({
        messages: compilationError
          ? [{ type: "error", message: "WGSL compilation failed" }]
          : [],
      }),
    }),
    createRenderPipelineAsync: () => {
      counts.pipeline++;
      return pipeline.promise;
    },
    lost: lost.promise,
    addEventListener() {},
    removeEventListener() {},
    destroy: () => {
      counts.device++;
    },
  } as unknown as GPUDevice;
  setGpu(
    async () =>
      ({ requestDevice: async () => device }) as unknown as GPUAdapter,
  );
  return { pipeline, lost, counts, device };
}
const pendingDevice = fakeDevice();
const deviceRequest = deferred<GPUDevice>();
setGpu(
  async () =>
    ({ requestDevice: () => deviceRequest.promise }) as unknown as GPUAdapter,
);
const deviceAbort = new AbortController();
const waitingDevice = GlassRenderer.create(deviceAbort.signal);
await Promise.resolve();
deviceAbort.abort();
deviceRequest.resolve(pendingDevice.device);
await assert.rejects(waitingDevice, /cancelled/);
assert.equal(
  pendingDevice.counts.device,
  1,
  "a device arriving after cancellation must be destroyed",
);
assert.equal(pendingDevice.counts.buffer, 0);

const failed = fakeDevice(true);
await assert.rejects(GlassRenderer.create(), /WGSL compilation failed/);
assert.equal(failed.counts.pipeline, 0);
assert.equal(failed.counts.device, 1);
assert.equal(failed.counts.buffer, 3);

const building = fakeDevice();
const abort = new AbortController();
const initialized = GlassRenderer.create(abort.signal);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(building.counts.pipeline, 1);
abort.abort();
building.pipeline.resolve({} as GPURenderPipeline);
await assert.rejects(initialized, /disposed/);
assert.equal(
  building.counts.device,
  1,
  "aborting an asynchronous pipeline must destroy its device exactly once",
);
assert.equal(building.counts.buffer, 3);

const source = { width: 16, height: 16 } as HTMLCanvasElement;
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
  highlight: 0.3,
};
const running = fakeDevice();
running.pipeline.resolve({} as GPURenderPipeline);
const renderer = await GlassRenderer.create();
running.lost.resolve({
  reason: "unknown",
  message: "GPU device lost during capture",
} as GPUDeviceLostInfo);
await Promise.resolve();
await assert.rejects(renderer.render(source, frame), /GPU device lost/);
renderer.destroy();
renderer.destroy();
assert.equal(running.counts.device, 1, "destroy must be idempotent");
assert.equal(running.counts.buffer, 3);

const queued = fakeDevice();
queued.pipeline.resolve({} as GPURenderPipeline);
const disposed = await GlassRenderer.create();
const operation = disposed.render(source, frame);
disposed.destroy();
await assert.rejects(operation, /disposed/);
assert.equal(queued.counts.device, 1);

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

function renderDevice(readGate?: Promise<void>) {
  const base = fakeDevice();
  const inputs: { destroyed: number; source?: HTMLCanvasElement }[] = [];
  const outputs: { destroyed: number }[] = [];
  const filtered: { destroyed: number }[] = [];
  const blurUniforms: Float32Array[] = [];
  const buffers: { destroyed: number }[] = [];
  const uploads: HTMLCanvasElement[] = [];
  const uniforms: Float32Array[] = [];
  let failUpload = false;
  let reads = 0;
  const device = base.device;
  Object.assign(device, {
    limits: { maxTextureDimension2D: 8192, maxBufferSize: 2 ** 28 },
    createTexture: ({ label }: GPUTextureDescriptor) => {
      const state = { destroyed: 0 };
      if (label === "Glass background") inputs.push(state);
      else if (label === "Glass blurred background") filtered.push(state);
      else outputs.push(state);
      return {
        state,
        createView: () => ({}),
        destroy: () => state.destroyed++,
      };
    },
    createBuffer: ({ size }: GPUBufferDescriptor) => {
      const state = { destroyed: 0 };
      buffers.push(state);
      return {
        mapState: "unmapped",
        async mapAsync() {
          if (++reads === 1 && readGate) await readGate;
          this.mapState = "mapped";
        },
        getMappedRange: () => new ArrayBuffer(size),
        unmap() {
          this.mapState = "unmapped";
        },
        destroy: () => state.destroyed++,
      };
    },
    createBindGroup: () => ({}),
    createCommandEncoder: () => ({
      beginRenderPass: () => ({
        setPipeline() {},
        setBindGroup() {},
        draw() {},
        end() {},
      }),
      copyTextureToBuffer() {},
      finish: () => ({}),
    }),
    pushErrorScope() {},
    popErrorScope: async () => null,
    queue: {
      copyExternalImageToTexture: (
        { source }: { source: HTMLCanvasElement },
        { texture }: { texture: { state: (typeof inputs)[number] } },
      ) => {
        if (failUpload) {
          failUpload = false;
          throw new Error("Background upload failed");
        }
        uploads.push(source);
        texture.state.source = source;
      },
      writeBuffer: (_buffer: unknown, _offset: number, values: Float32Array) =>
        (values.length > 8 ? uniforms : blurUniforms).push(
          new Float32Array(values),
        ),
      submit() {},
    },
  });
  base.pipeline.resolve({
    getBindGroupLayout: () => ({}),
  } as unknown as GPURenderPipeline);
  return {
    ...base,
    inputs,
    outputs,
    filtered,
    blurUniforms,
    buffers,
    uploads,
    uniforms,
    failNextUpload: () => {
      failUpload = true;
    },
  };
}

const shared = renderDevice();
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
  "separable Gaussian passes run once per snapshot and blur level",
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
assert.equal(shared.uniforms[0]?.[19], 22, "strength remains in material data");
assert.equal(
  shared.uniforms[0]?.[31],
  1,
  "legacy callers retain their root text constraint",
);
const textColors: [number, number, number, number][] = [
  [0.08, 0.08, 0.08, 1],
  [0.35, 0.35, 0.35, 1],
  [0, 0.3, 0.7, 0.9],
];
await sharedRenderer.render(viewport, { ...frame, textColors });
assert.equal(shared.uniforms.at(-1)?.[31], textColors.length);
assert.deepEqual(
  Array.from(shared.uniforms.at(-1)?.slice(32, 44) ?? []),
  textColors.flat().map(Math.fround),
  "the shader receives all owned text colors and placeholder alpha",
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
assert.equal(
  shared.blurUniforms.length,
  beforeZero,
  "zero blur samples the original texture without Gaussian passes",
);
for (const blur of [6, 4, 2])
  await sharedRenderer.render(viewport, { ...frame, blur });
assert.equal(
  shared.uploads.length,
  1,
  "material changes reuse the original uploaded snapshot",
);
assert.equal(shared.filtered.length, 4);
assert.equal(
  shared.filtered[0]?.destroyed,
  1,
  "blur variants evict the least recent filtered texture",
);
assert.equal(
  shared.filtered.filter((texture) => texture.destroyed === 0).length,
  3,
  "filtered cache is bounded per snapshot",
);
await assert.rejects(
  sharedRenderer.render(viewport, { ...frame, minimumContrast: Number.NaN }),
  /Invalid glass frame/,
);
await assert.rejects(
  sharedRenderer.render(viewport, { ...frame, blur: -1 }),
  /Invalid glass frame/,
);

const isolated = renderDevice();
const isolatedRenderer = await GlassRenderer.create();
await isolatedRenderer.render(viewport, frame);
assert.equal(isolated.uploads.length, 1, "devices own separate textures");
isolatedRenderer.destroy();
assert.equal(isolated.inputs[0]?.destroyed, 1);
assert.ok(isolated.filtered.every((output) => output.destroyed === 1));
assert.equal(shared.inputs[0]?.destroyed, 0);

const siblings = Array.from(
  { length: 4 },
  () => ({ width: 640, height: 480 }) as HTMLCanvasElement,
);
for (const background of siblings.slice(0, 3))
  await sharedRenderer.render(background, frame);
await sharedRenderer.render(viewport, { ...frame, origin: [14, 36] });
assert.equal(shared.uploads.length, 4, "movement only updates uniforms");
await sharedRenderer.render(siblings[3] as HTMLCanvasElement, frame);
assert.equal(
  shared.inputs[1]?.destroyed,
  1,
  "evicts least recently used input",
);
assert.equal(
  shared.inputs[0]?.destroyed,
  0,
  "recently moved input is retained",
);
assert.equal(
  shared.inputs.filter((input) => input.destroyed === 0).length,
  4,
  "input cache is bounded",
);
viewport.width = 800;
await sharedRenderer.render(viewport, frame);
assert.equal(shared.inputs[0]?.destroyed, 1, "resized input is invalidated");
assert.equal(shared.uploads.at(-1), viewport);
shared.failNextUpload();
const failedSource = { width: 100, height: 100 } as HTMLCanvasElement;
await assert.rejects(
  sharedRenderer.render(failedSource, frame),
  /upload failed/,
);
assert.equal(shared.inputs.at(-1)?.destroyed, 1, "failed upload is released");
await sharedRenderer.render(failedSource, frame);
assert.equal(
  shared.uploads.at(-1),
  failedSource,
  "failed input can be retried",
);
await assert.rejects(
  sharedRenderer.render(viewport, { ...frame, origin: [Number.NaN, 0] }),
  /Invalid glass frame/,
);
sharedRenderer.destroy();
sharedRenderer.destroy();
assert.ok(shared.filtered.every((output) => output.destroyed === 1));
assert.ok(shared.inputs.every((input) => input.destroyed === 1));
assert.ok(shared.outputs.every((output) => output.destroyed === 1));
assert.ok(shared.buffers.every((buffer) => buffer.destroyed === 1));
assert.equal(shared.counts.device, 1);

const readGate = deferred<void>();
const serial = renderDevice(readGate.promise);
const serialRenderer = await GlassRenderer.create();
const firstFrame = serialRenderer.render(viewport, {
  ...frame,
  origin: [20, 30],
});
const secondFrame = serialRenderer.render(viewport, {
  ...frame,
  origin: [40, 50],
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(serial.uniforms.length, 1, "readback serializes uniform updates");
assert.equal(serial.outputs.length, 2, "queued frame waits for readback");
readGate.resolve();
await Promise.all([firstFrame, secondFrame]);
assert.equal(serial.uploads.length, 1);
assert.deepEqual(Array.from(serial.uniforms[1]?.slice(6, 8) ?? []), [40, 50]);
serialRenderer.destroy();

const cancelledRead = deferred<void>();
const cancelled = renderDevice(cancelledRead.promise);
const cancelledSignal = new AbortController();
const cancelledRenderer = await GlassRenderer.create(cancelledSignal.signal);
const cancelledFrame = cancelledRenderer.render(viewport, frame);
await new Promise((resolve) => setTimeout(resolve, 0));
cancelledSignal.abort();
cancelledRead.resolve();
await assert.rejects(cancelledFrame, /disposed/);
assert.ok(cancelled.inputs.every((input) => input.destroyed === 1));
assert.ok(cancelled.outputs.every((output) => output.destroyed === 1));
assert.ok(cancelled.filtered.every((output) => output.destroyed === 1));
assert.ok(cancelled.buffers.every((buffer) => buffer.destroyed === 1));
assert.equal(cancelled.counts.device, 1);
console.log(
  "adapter absence, cancelled initialization, shader failure, device loss, shared texture uploads, origin uniforms, bounded eviction, isolation and idempotent cleanup passed",
);
