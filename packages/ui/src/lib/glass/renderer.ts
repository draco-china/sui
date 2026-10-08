/// <reference types="@webgpu/types" />

import {
  GlassContrastError,
  type GlassTextColor,
  maxGlassTextColors,
  resolveGlassContrastTint,
} from "./contrast";

export type GlassFrame = {
  width: number;
  height: number;
  margin: number;
  origin?: [number, number];
  radius: [number, number, number, number];
  radiusY?: [number, number, number, number];
  strength: number;
  blur: number;
  tint: [number, number, number];
  tintOpacity: number;
  foreground: [number, number, number];
  textColors?: readonly GlassTextColor[];
  minimumContrast?: number;
  highlight: number;
};

const shader = `
struct Params {
  surface: vec4f,
  source: vec4f,
  radii: vec4f,
  verticalRadii: vec4f,
  material: vec4f,
  tint: vec4f,
  foreground: vec4f,
  contrastMaterial: vec4f,
  textColors: array<vec4f, ${maxGlassTextColors}>,
};
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var background: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(positions[index], 0.0, 1.0);
}
fn luminance(rgb: vec3f) -> f32 {
  let linear = select(rgb / vec3f(12.92), pow((rgb + vec3f(0.055)) / vec3f(1.055), vec3f(2.4)), rgb > vec3f(0.04045));
  return dot(linear, vec3f(0.2126, 0.7152, 0.0722));
}
fn contrast(a: vec3f, b: vec3f) -> f32 {
  let x = luminance(a) + 0.05;
  let y = luminance(b) + 0.05;
  return max(x, y) / min(x, y);
}
fn supportsTextContrast(background: vec3f) -> bool {
  for (var index = 0u; index < u32(params.contrastMaterial.w); index++) {
    let text = params.textColors[index];
    let foreground = mix(background, text.xyz, text.w);
    if (contrast(background, foreground) < params.foreground.w) { return false; }
  }
  return true;
}
fn ellipseDistance(x: f32, y: f32, rx: f32, ry: f32) -> f32 {
  let k0 = sqrt(x * x / (rx * rx) + y * y / (ry * ry));
  let k1 = sqrt(x * x / (rx * rx * rx * rx) + y * y / (ry * ry * ry * ry));
  if (k1 == 0.0) { return -min(rx, ry); }
  return k0 * (k0 - 1.0) / k1;
}
fn roundedDistance(p: vec2f) -> f32 {
  let width = params.surface.x;
  let height = params.surface.y;
  var distance = max(max(-p.x, p.x - width), max(-p.y, p.y - height));
  if (params.radii.x > 0.0 && params.verticalRadii.x > 0.0 && p.x < params.radii.x && p.y < params.verticalRadii.x) {
    distance = max(distance, ellipseDistance(p.x - params.radii.x, p.y - params.verticalRadii.x, params.radii.x, params.verticalRadii.x));
  }
  if (params.radii.y > 0.0 && params.verticalRadii.y > 0.0 && p.x > width - params.radii.y && p.y < params.verticalRadii.y) {
    distance = max(distance, ellipseDistance(p.x - (width - params.radii.y), p.y - params.verticalRadii.y, params.radii.y, params.verticalRadii.y));
  }
  if (params.radii.z > 0.0 && params.verticalRadii.z > 0.0 && p.x > width - params.radii.z && p.y > height - params.verticalRadii.z) {
    distance = max(distance, ellipseDistance(p.x - (width - params.radii.z), p.y - (height - params.verticalRadii.z), params.radii.z, params.verticalRadii.z));
  }
  if (params.radii.w > 0.0 && params.verticalRadii.w > 0.0 && p.x < params.radii.w && p.y > height - params.verticalRadii.w) {
    distance = max(distance, ellipseDistance(p.x - params.radii.w, p.y - (height - params.verticalRadii.w), params.radii.w, params.verticalRadii.w));
  }
  return distance;
}
fn sourceColor(p: vec2f) -> vec3f {
  let uv = clamp((p + params.source.zw) / params.source.xy, vec2f(0.0), vec2f(1.0));
  return textureSampleLevel(background, linearSampler, uv, 0.0).rgb;
}
@fragment fn fragmentMain(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let p = pixel.xy * params.surface.xy / params.surface.zw;
  let distance = roundedDistance(p);
  let gradient = vec2f(
    roundedDistance(p + vec2f(0.4, 0.0)) - roundedDistance(p - vec2f(0.4, 0.0)),
    roundedDistance(p + vec2f(0.0, 0.4)) - roundedDistance(p - vec2f(0.0, 0.4))
  ) + vec2f(0.00001);
  let normal = gradient / max(length(gradient), 0.00001);
  let depth = max(-distance, 0.0);
  let bevel = pow(clamp(1.0 - depth / 17.0, 0.0, 1.0), 2.0);
  let displaced = p - normal * bevel * params.material.w * 0.45;
  let split = normal * bevel * min(params.material.w * 0.014, 0.45);
  let sampled = vec3f(sourceColor(displaced + split).r, sourceColor(displaced).g, sourceColor(displaced - split).b);
  let luminanceValue = dot(sampled, vec3f(0.2126, 0.7152, 0.0722));
  let saturated = mix(vec3f(luminanceValue), sampled, 1.12);
  var result = mix(saturated, params.tint.xyz, params.material.y);
  result = clamp(result, vec3f(0.0), vec3f(1.0));
  if (params.foreground.w > 0.0 && !supportsTextContrast(result)) {
    let safeTint = params.contrastMaterial.xyz;
    for (var index = 0; index < 8; index++) {
      if (supportsTextContrast(result)) { break; }
      result = mix(result, safeTint, 0.18);
    }
    if (!supportsTextContrast(result)) { result = safeTint; }
  }
  return vec4f(result, 1.0 - smoothstep(-0.65, 0.65, distance));
}`;

const gaussianShader = `
struct BlurParams {
  size: vec2f,
  step: vec2f,
  sigma: f32,
  radius: f32,
  padding: vec2f,
};
@group(0) @binding(0) var<uniform> params: BlurParams;
@group(0) @binding(1) var background: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;
@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(positions[index], 0.0, 1.0);
}
@fragment fn fragmentMain(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let uv = pixel.xy / params.size;
  var result = textureSampleLevel(background, linearSampler, uv, 0.0);
  var weight = 1.0;
  for (var offset = 1.0; offset <= params.radius; offset += 2.0) {
    let first = exp(-0.5 * pow(offset / params.sigma, 2.0));
    let second = select(0.0, exp(-0.5 * pow((offset + 1.0) / params.sigma, 2.0)), offset + 1.0 <= params.radius);
    let pairWeight = first + second;
    let delta = params.step * (offset + second / pairWeight);
    result += (textureSampleLevel(background, linearSampler, uv + delta, 0.0) + textureSampleLevel(background, linearSampler, uv - delta, 0.0)) * pairWeight;
    weight += 2.0 * pairWeight;
  }
  return result / weight;
}`;

type Resource = GPUTexture | GPUBuffer;
type Background = {
  texture: GPUTexture;
  width: number;
  height: number;
  filtered: Map<number, GPUTexture>;
};

export class GlassRenderer {
  private pipeline?: GPURenderPipeline;
  private gaussianPipeline?: GPURenderPipeline;
  private readonly blurUniforms: [GPUBuffer, GPUBuffer];
  private readonly uniform: GPUBuffer;
  private readonly sampler: GPUSampler;
  private readonly resources = new Set<Resource>();
  private readonly backgrounds = new Map<HTMLCanvasElement, Background>();
  private readonly contrastTints = new Map<string, [number, number, number]>();
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;
  private failure?: Error;
  private readonly abort = () => this.destroy();
  private readonly gpuError = (event: Event) => {
    this.failure = new Error((event as GPUUncapturedErrorEvent).error.message);
  };

  private constructor(
    private readonly device: GPUDevice,
    private readonly signal?: AbortSignal,
  ) {
    this.uniform = device.createBuffer({
      label: "Glass material",
      size: 128 + maxGlassTextColors * 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.resources.add(this.uniform);
    const createBlurUniform = () => {
      const buffer = device.createBuffer({
        label: "Glass Gaussian blur parameters",
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.resources.add(buffer);
      return buffer;
    };
    this.blurUniforms = [createBlurUniform(), createBlurUniform()];

    this.sampler = device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    signal?.addEventListener("abort", this.abort, { once: true });
    device.addEventListener("uncapturederror", this.gpuError);
    void device.lost.then((info) => {
      if (!this.disposed)
        this.failure = new Error(info.message || "Glass GPU device lost");
    });
  }

  static async create(signal?: AbortSignal): Promise<GlassRenderer> {
    if (signal?.aborted)
      throw new DOMException("Glass initialization cancelled", "AbortError");
    if (typeof navigator === "undefined" || !navigator.gpu)
      throw new Error("WebGPU unavailable");
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "low-power",
    });
    if (signal?.aborted)
      throw new DOMException("Glass initialization cancelled", "AbortError");
    if (!adapter) throw new Error("WebGPU adapter unavailable");
    const device = await adapter.requestDevice();
    if (signal?.aborted) {
      device.destroy();
      throw new DOMException("Glass initialization cancelled", "AbortError");
    }
    let renderer: GlassRenderer | undefined;
    try {
      renderer = new GlassRenderer(device, signal);
      if (signal?.aborted) renderer.destroy();
      renderer.assertActive();
      const module = device.createShaderModule({
        label: "Glass refraction",
        code: shader,
      });
      const compilation = await module.getCompilationInfo();
      const errors = compilation.messages.filter(
        (message) => message.type === "error",
      );
      if (errors.length)
        throw new Error(errors.map((message) => message.message).join("\n"));
      renderer.assertActive();
      renderer.pipeline = await device.createRenderPipelineAsync({
        label: "Glass refraction",
        layout: "auto",
        vertex: { module, entryPoint: "vertexMain" },
        fragment: {
          module,
          entryPoint: "fragmentMain",
          targets: [{ format: "rgba8unorm" }],
        },
        primitive: { topology: "triangle-list" },
      });
      renderer.assertActive();
      const gaussian = device.createShaderModule({
        label: "Glass Gaussian blur",
        code: gaussianShader,
      });
      const gaussianCompilation = await gaussian.getCompilationInfo();
      const gaussianErrors = gaussianCompilation.messages.filter(
        (message) => message.type === "error",
      );
      if (gaussianErrors.length)
        throw new Error(
          gaussianErrors.map((message) => message.message).join("\n"),
        );
      renderer.assertActive();
      renderer.gaussianPipeline = await device.createRenderPipelineAsync({
        label: "Glass Gaussian blur",
        layout: "auto",
        vertex: { module: gaussian, entryPoint: "vertexMain" },
        fragment: {
          module: gaussian,
          entryPoint: "fragmentMain",
          targets: [{ format: "rgba8unorm" }],
        },
        primitive: { topology: "triangle-list" },
      });
      renderer.assertActive();
      return renderer;
    } catch (error) {
      if (renderer) renderer.destroy();
      else device.destroy();
      throw error;
    }
  }

  private assertActive() {
    if (this.disposed) throw new Error("Glass renderer disposed");
    if (this.failure) throw this.failure;
  }

  private releaseBackground(source: HTMLCanvasElement) {
    const background = this.backgrounds.get(source);
    if (!background) return;
    this.backgrounds.delete(source);
    if (this.resources.delete(background.texture)) background.texture.destroy();
    for (const texture of background.filtered.values())
      if (this.resources.delete(texture)) texture.destroy();
  }

  private background(source: HTMLCanvasElement): GPUTexture {
    const cached = this.backgrounds.get(source);
    if (
      cached &&
      cached.width === source.width &&
      cached.height === source.height
    ) {
      this.backgrounds.delete(source);
      this.backgrounds.set(source, cached);
      return cached.texture;
    }
    this.releaseBackground(source);
    const texture = this.device.createTexture({
      label: "Glass background",
      size: [source.width, source.height],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.resources.add(texture);
    try {
      this.device.queue.copyExternalImageToTexture(
        { source, flipY: false },
        { texture, premultipliedAlpha: false },
        [source.width, source.height],
      );
      this.backgrounds.set(source, {
        texture,
        width: source.width,
        height: source.height,
        filtered: new Map(),
      });
      if (this.backgrounds.size > 4) {
        const oldest = this.backgrounds.keys().next().value;
        if (oldest) this.releaseBackground(oldest);
      }
      return texture;
    } catch (error) {
      if (this.resources.delete(texture)) texture.destroy();
      throw error;
    }
  }

  private filteredBackground(
    source: HTMLCanvasElement,
    blur: number,
    track: <T extends Resource>(resource: T) => T,
  ): GPUTexture {
    const texture = this.background(source);
    if (blur <= 0) return texture;
    const background = this.backgrounds.get(source);
    const pipeline = this.gaussianPipeline;
    if (!background || !pipeline)
      throw new Error("Glass blur pipeline unavailable");
    const cached = background.filtered.get(blur);
    if (cached) {
      background.filtered.delete(blur);
      background.filtered.set(blur, cached);
      return cached;
    }
    // Blurred snapshots can use half-resolution above 2 CSS pixels; the original
    // upload and all sampling coordinates remain shared and in CSS pixels.
    const scale = blur >= 2 ? 0.5 : 1;
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const makeTexture = (label: string) =>
      this.device.createTexture({
        label,
        size: [width, height],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
      });
    const horizontal = track(makeTexture("Glass Gaussian intermediate"));
    const vertical = makeTexture("Glass blurred background");
    this.resources.add(vertical);
    background.filtered.set(blur, vertical);
    if (background.filtered.size > 3) {
      const oldest = background.filtered.keys().next().value;
      if (oldest !== undefined) {
        const oldTexture = background.filtered.get(oldest);
        if (oldTexture && this.resources.delete(oldTexture))
          oldTexture.destroy();
        background.filtered.delete(oldest);
      }
    }
    const sigma = blur * scale;
    const radius = Math.ceil(sigma * 3);
    const encoder = this.device.createCommandEncoder();
    const stages = [
      { input: texture, output: horizontal, step: [1 / width, 0] },
      { input: horizontal, output: vertical, step: [0, 1 / height] },
    ];
    for (const [index, stage] of stages.entries()) {
      const uniform = this.blurUniforms[index];
      this.device.queue.writeBuffer(
        uniform,
        0,
        new Float32Array([width, height, ...stage.step, sigma, radius, 0, 0]),
      );
      const group = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniform } },
          { binding: 1, resource: stage.input.createView() },
          { binding: 2, resource: this.sampler },
        ],
      });
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: stage.output.createView(),
            clearValue: [0, 0, 0, 0],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.draw(3);
      pass.end();
    }
    this.device.queue.submit([encoder.finish()]);
    return vertical;
  }

  render(source: HTMLCanvasElement, frame: GlassFrame): Promise<Blob> {
    const operation = this.queue.then(() => this.renderFrame(source, frame));
    this.queue = operation.then(
      () => {},
      () => {},
    );
    return operation;
  }

  private async renderFrame(
    source: HTMLCanvasElement,
    frame: GlassFrame,
  ): Promise<Blob> {
    this.assertActive();
    const pipeline = this.pipeline;
    if (!pipeline) throw new Error("Glass pipeline unavailable");
    const textColors: readonly GlassTextColor[] = frame.textColors ?? [
      [...frame.foreground, 1],
    ];
    if (
      textColors.length > maxGlassTextColors ||
      textColors.some(
        (color) =>
          color.length !== 4 ||
          color.some(
            (channel) =>
              !Number.isFinite(channel) || channel < 0 || channel > 1,
          ),
      )
    )
      throw new GlassContrastError("Unsupported glass text colors");
    const minimum = frame.minimumContrast ?? 4.5;
    const contrastMinimum = minimum > 0 ? minimum + 0.05 : 0;
    const contrastKey = JSON.stringify([
      frame.tint,
      textColors,
      contrastMinimum,
    ]);
    let contrastTint = this.contrastTints.get(contrastKey);
    if (!contrastTint) {
      contrastTint = resolveGlassContrastTint(
        frame.tint,
        textColors,
        contrastMinimum,
      );
      if (!contrastTint)
        throw new GlassContrastError(
          "Glass text colors have no shared contrast background",
        );
      if (this.contrastTints.size >= 64) this.contrastTints.clear();
      this.contrastTints.set(contrastKey, contrastTint);
    }
    if (
      ![
        frame.width,
        frame.height,
        frame.margin,
        frame.strength,
        frame.blur,
        frame.tintOpacity,
        frame.highlight,
        frame.minimumContrast ?? 4.5,
        ...(frame.origin ?? [frame.margin, frame.margin]),
        ...frame.radius,
        ...(frame.radiusY ?? frame.radius),
        ...frame.tint,
        ...frame.foreground,
      ].every(Number.isFinite) ||
      frame.blur < 0 ||
      frame.blur > 24 ||
      frame.width <= 0 ||
      frame.height <= 0 ||
      source.width <= 0 ||
      source.height <= 0
    )
      throw new Error("Invalid glass frame dimensions or material");
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5);
    const width = Math.max(1, Math.round(frame.width * scale));
    const height = Math.max(1, Math.round(frame.height * scale));
    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    if (
      Math.max(width, height, source.width, source.height) >
        this.device.limits.maxTextureDimension2D ||
      bytesPerRow * height > this.device.limits.maxBufferSize
    )
      throw new Error("Glass frame exceeds GPU limits");
    const resources: Resource[] = [];
    const track = <T extends Resource>(resource: T): T => {
      resources.push(resource);
      this.resources.add(resource);
      return resource;
    };
    let readback: GPUBuffer | undefined;
    let scopeOpen = true;
    this.device.pushErrorScope("validation");
    try {
      const input = this.filteredBackground(source, frame.blur, track);
      const output = track(
        this.device.createTexture({
          label: "Glass frame",
          size: [width, height],
          format: "rgba8unorm",
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        }),
      );
      readback = track(
        this.device.createBuffer({
          label: "Glass pixel readback",
          size: bytesPerRow * height,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        }),
      );
      this.device.queue.writeBuffer(
        this.uniform,
        0,
        new Float32Array([
          frame.width,
          frame.height,
          width,
          height,
          source.width,
          source.height,
          ...(frame.origin ?? [frame.margin, frame.margin]),
          ...frame.radius,
          ...(frame.radiusY ?? frame.radius),
          frame.blur,
          frame.tintOpacity,
          frame.highlight,
          frame.strength,
          ...frame.tint,
          0,
          ...frame.foreground,
          contrastMinimum,
          ...contrastTint,
          textColors.length,
          ...textColors.flat(),
          ...new Array((maxGlassTextColors - textColors.length) * 4).fill(0),
        ]),
      );
      const group = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniform } },
          { binding: 1, resource: input.createView() },
          { binding: 2, resource: this.sampler },
        ],
      });
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: output.createView(),
            clearValue: [0, 0, 0, 0],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.draw(3);
      pass.end();
      encoder.copyTextureToBuffer(
        { texture: output },
        { buffer: readback, bytesPerRow },
        [width, height],
      );
      this.device.queue.submit([encoder.finish()]);
      const validation = await this.device.popErrorScope();
      scopeOpen = false;
      if (validation) throw new Error(validation.message);
      this.assertActive();
      await readback.mapAsync(GPUMapMode.READ);
      this.assertActive();
      const bytes = new Uint8Array(readback.getMappedRange());
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to export glass pixels");
      const image = context.createImageData(width, height);
      for (let row = 0; row < height; row++)
        image.data.set(
          bytes.subarray(row * bytesPerRow, row * bytesPerRow + width * 4),
          row * width * 4,
        );
      readback.unmap();
      context.putImageData(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Unable to export glass frame"));
        }, "image/png"),
      );
      canvas.width = canvas.height = 1;
      this.assertActive();
      return blob;
    } catch (error) {
      this.releaseBackground(source);
      throw error;
    } finally {
      if (scopeOpen) await this.device.popErrorScope().catch(() => {});
      if (readback?.mapState === "mapped") readback.unmap();
      for (const resource of resources) {
        if (this.resources.delete(resource)) resource.destroy();
      }
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.signal?.removeEventListener("abort", this.abort);
    this.device.removeEventListener("uncapturederror", this.gpuError);
    for (const resource of this.resources) resource.destroy();
    this.resources.clear();
    this.backgrounds.clear();
    this.contrastTints.clear();
    this.pipeline = undefined;
    this.gaussianPipeline = undefined;
    this.device.destroy();
  }
}
