/// <reference types="@webgpu/types" />

import {
  type Effect,
  effect,
  type Gpu,
  frame as gpuFrame,
  init,
  sampler,
  type Texture,
  target,
  texture,
} from "vgpu";

import {
  GlassContrastError,
  type GlassTextBounds,
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
  textBounds?: readonly GlassTextBounds[];
  minimumContrast?: number;
};

const shader = `
struct Params {
  surface: vec4f,
  source: vec4f,
  radii: vec4f,
  verticalRadii: vec4f,
  material: vec2f,
  tint: vec3f,
  minimumContrast: f32,
  contrastMaterial: vec4f,
  textColors: array<vec4f, ${maxGlassTextColors}>,
  textBounds: array<vec4f, ${maxGlassTextColors}>,
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
fn supportsTextContrast(background: vec3f, point: vec2f) -> bool {
  for (var index = 0u; index < u32(params.contrastMaterial.w); index++) {
    let bounds = params.textBounds[index];
    if (point.x < bounds.x || point.y < bounds.y || point.x > bounds.z || point.y > bounds.w) { continue; }
    let text = params.textColors[index];
    let foreground = mix(background, text.xyz, text.w);
    if (contrast(background, foreground) < params.minimumContrast) { return false; }
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
  let displaced = p - normal * bevel * params.material.y * 0.45;
  let split = normal * bevel * min(params.material.y * 0.014, 0.45);
  let sampled = vec3f(sourceColor(displaced + split).r, sourceColor(displaced).g, sourceColor(displaced - split).b);
  let luminanceValue = dot(sampled, vec3f(0.2126, 0.7152, 0.0722));
  let saturated = mix(vec3f(luminanceValue), sampled, 1.12);
  var result = mix(saturated, params.tint, params.material.x);
  result = clamp(result, vec3f(0.0), vec3f(1.0));
  if (params.minimumContrast > 0.0 && !supportsTextContrast(result, p)) {
    let safeTint = params.contrastMaterial.xyz;
    for (var index = 0; index < 8; index++) {
      if (supportsTextContrast(result, p)) { break; }
      result = mix(result, safeTint, 0.18);
    }
    if (!supportsTextContrast(result, p)) { result = safeTint; }
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

type Background = {
  texture: Texture;
  width: number;
  height: number;
  filtered: Map<number, Texture>;
};

export class GlassRenderer {
  private readonly refraction: Effect;
  private readonly gaussian: [Effect, Effect];
  private readonly linearSampler: ReturnType<typeof sampler>;
  private readonly resources = new Set<Texture>();
  private readonly backgrounds = new Map<HTMLCanvasElement, Background>();
  private readonly contrastTints = new Map<string, [number, number, number]>();
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;
  private failure?: Error;
  private readonly abort = () => this.destroy();
  private readonly unsubscribeError: () => void;

  private constructor(
    private readonly gpu: Gpu,
    private readonly signal?: AbortSignal,
  ) {
    this.unsubscribeError = gpu.onError((error) => {
      this.failure = new Error(error.message);
    });
    this.linearSampler = sampler(gpu, {
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    this.refraction = effect(gpu, shader, { label: "Glass refraction" });
    this.gaussian = [
      effect(gpu, gaussianShader, { label: "Glass horizontal blur" }),
      effect(gpu, gaussianShader, { label: "Glass vertical blur" }),
    ];
    signal?.addEventListener("abort", this.abort, { once: true });
    void gpu.gpu.lost.then((info) => {
      if (!this.disposed)
        this.failure = new Error(info.message || "Glass GPU device lost");
    });
  }

  static async create(signal?: AbortSignal): Promise<GlassRenderer> {
    if (signal?.aborted)
      throw new DOMException("Glass initialization cancelled", "AbortError");
    if (typeof navigator === "undefined" || !navigator.gpu)
      throw new Error("WebGPU unavailable");
    const gpu = await init({ powerPreference: "low-power", label: "Glass" });
    if (signal?.aborted) {
      gpu.dispose();
      throw new DOMException("Glass initialization cancelled", "AbortError");
    }
    let renderer: GlassRenderer | undefined;
    try {
      renderer = new GlassRenderer(gpu, signal);
      await Promise.all([
        renderer.refraction.compile({ colors: ["rgba8unorm"] }),
        renderer.gaussian[0].compile({ colors: ["rgba8unorm"] }),
        renderer.gaussian[1].compile({ colors: ["rgba8unorm"] }),
      ]);
      renderer.assertActive();
      return renderer;
    } catch (error) {
      if (renderer) renderer.destroy();
      else gpu.dispose();
      throw error;
    }
  }

  private assertActive() {
    if (this.disposed) throw new Error("Glass renderer disposed");
    if (this.failure) throw this.failure;
  }

  private releaseTexture(image: Texture) {
    if (this.resources.delete(image)) image.destroy();
  }

  private releaseBackground(source: HTMLCanvasElement) {
    const background = this.backgrounds.get(source);
    if (!background) return;
    this.backgrounds.delete(source);
    this.releaseTexture(background.texture);
    for (const image of background.filtered.values())
      this.releaseTexture(image);
  }

  private background(source: HTMLCanvasElement): Texture {
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
    const image = texture(this.gpu, {
      kind: "2d",
      label: "Glass background",
      size: [source.width, source.height],
      format: "rgba8unorm",
      usage: ["texture_binding", "copy_dst", "render_attachment"],
    });
    this.resources.add(image);
    try {
      this.gpu.gpu.queue.copyExternalImageToTexture(
        { source, flipY: false },
        { texture: image.gpu, premultipliedAlpha: false },
        [source.width, source.height],
      );
      this.backgrounds.set(source, {
        texture: image,
        width: source.width,
        height: source.height,
        filtered: new Map(),
      });
      if (this.backgrounds.size > 4) {
        const oldest = this.backgrounds.keys().next().value;
        if (oldest) this.releaseBackground(oldest);
      }
      return image;
    } catch (error) {
      this.releaseTexture(image);
      throw error;
    }
  }

  private filteredBackground(
    source: HTMLCanvasElement,
    blur: number,
    temporary: Texture[],
  ): Texture {
    const image = this.background(source);
    if (blur <= 0) return image;
    const background = this.backgrounds.get(source);
    if (!background) throw new Error("Glass background unavailable");
    const cached = background.filtered.get(blur);
    if (cached) {
      background.filtered.delete(blur);
      background.filtered.set(blur, cached);
      return cached;
    }
    // Share the original upload and each blur level across surfaces. Above 2 CSS
    // pixels, half-resolution Gaussian targets bound memory and sampling cost.
    const scale = blur >= 2 ? 0.5 : 1;
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const makeTarget = (label: string) => {
      const output = target(this.gpu, {
        label,
        size: [width, height],
        format: "rgba8unorm",
        clearColor: [0, 0, 0, 0],
      });
      this.resources.add(output.color);
      return output;
    };
    const horizontal = makeTarget("Glass Gaussian intermediate");
    temporary.push(horizontal.color);
    const vertical = makeTarget("Glass blurred background");
    background.filtered.set(blur, vertical.color);
    if (background.filtered.size > 3) {
      const oldest = background.filtered.keys().next().value;
      if (oldest !== undefined) {
        const previous = background.filtered.get(oldest);
        if (previous) this.releaseTexture(previous);
        background.filtered.delete(oldest);
      }
    }
    const sigma = blur * scale;
    const radius = Math.ceil(sigma * 3);
    const stages = [
      { input: image, output: horizontal, step: [1 / width, 0] },
      { input: horizontal.color, output: vertical, step: [0, 1 / height] },
    ];
    for (const [index, stage] of stages.entries()) {
      this.gaussian[index].set({
        params: {
          size: [width, height],
          step: stage.step,
          sigma,
          radius,
          padding: [0, 0],
        },
        background: stage.input,
        linearSampler: this.linearSampler,
      });
    }
    gpuFrame(this.gpu, (frame) => {
      frame.pass(horizontal, this.gaussian[0]);
      frame.pass(vertical, this.gaussian[1]);
    });
    return vertical.color;
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
    const textBounds =
      frame.textBounds ??
      textColors.map(() => [0, 0, frame.width, frame.height]);
    if (
      textBounds.length !== textColors.length ||
      textBounds.some(
        (bounds) => bounds.length !== 4 || !bounds.every(Number.isFinite),
      )
    )
      throw new GlassContrastError("Unsupported glass text bounds");
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
        this.gpu.gpu.limits.maxTextureDimension2D ||
      bytesPerRow * height > this.gpu.gpu.limits.maxBufferSize
    )
      throw new Error("Glass frame exceeds GPU limits");
    const temporary: Texture[] = [];
    let scopeOpen = true;
    this.gpu.gpu.pushErrorScope("validation");
    try {
      const input = this.filteredBackground(source, frame.blur, temporary);
      const output = target(this.gpu, {
        label: "Glass frame",
        size: [width, height],
        format: "rgba8unorm",
        clearColor: [0, 0, 0, 0],
      });
      this.resources.add(output.color);
      temporary.push(output.color);
      const padding = () =>
        Array.from({ length: maxGlassTextColors }, () => [0, 0, 0, 0]);
      const colors = padding();
      const bounds = padding();
      textColors.forEach((color, index) => {
        colors[index] = [...color];
      });
      textBounds.forEach((region, index) => {
        bounds[index] = [...region];
      });
      this.refraction.set({
        params: {
          surface: [frame.width, frame.height, width, height],
          source: [
            source.width,
            source.height,
            ...(frame.origin ?? [frame.margin, frame.margin]),
          ],
          radii: frame.radius,
          verticalRadii: frame.radiusY ?? frame.radius,
          material: [frame.tintOpacity, frame.strength],
          tint: frame.tint,
          minimumContrast: contrastMinimum,
          contrastMaterial: [...contrastTint, textColors.length],
          textColors: colors,
          textBounds: bounds,
        },
        background: input,
        linearSampler: this.linearSampler,
      });
      gpuFrame(this.gpu, (frame) => frame.pass(output, this.refraction));
      await this.gpu.settled();
      const validation = await this.gpu.gpu.popErrorScope();
      scopeOpen = false;
      if (validation) throw new Error(validation.message);
      this.assertActive();
      const bytes = await output.color.read({ mipLevel: 0, region: "all" });
      this.assertActive();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to export glass pixels");
      const image = context.createImageData(width, height);
      image.data.set(bytes);
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
      if (scopeOpen) await this.gpu.gpu.popErrorScope().catch(() => {});
      for (const image of temporary) this.releaseTexture(image);
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.signal?.removeEventListener("abort", this.abort);
    this.unsubscribeError();
    for (const resource of this.resources) resource.destroy();
    this.resources.clear();
    this.backgrounds.clear();
    this.contrastTints.clear();
    this.gpu.dispose();
  }
}
