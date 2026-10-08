export const metrics = {
  capture: [] as number[],
  render: [] as number[],
  uploads: 0,
  commits: 0,
  reactMilliseconds: 0,
  longTasks: [] as number[],
  debugInvalidations: [] as unknown[],
};

export async function measure<T>(
  name: "capture" | "render",
  operation: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await operation();
  } catch (error) {
    if (name === "capture" && diagnosticsEnabled) {
      diagnostic({
        kind: "capture-error",
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    throw error;
  } finally {
    metrics[name].push(performance.now() - start);
  }
}

export function resetMetrics() {
  metrics.capture.length = 0;
  metrics.render.length = 0;
  metrics.longTasks.length = 0;
  metrics.uploads = 0;
  metrics.commits = 0;
  metrics.reactMilliseconds = 0;
  metrics.debugInvalidations.length = 0;
}

export function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    medianMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0,
    p95Ms: sorted.length
      ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
      : 0,
    totalMs: sorted.reduce((sum, duration) => sum + duration, 0),
  };
}

export function snapshot() {
  return {
    capture: summary(metrics.capture),
    render: summary(metrics.render),
    uploads: metrics.uploads,
    reactCommits: metrics.commits,
    reactActualMs: metrics.reactMilliseconds,
    longTasks: summary(metrics.longTasks),
    ...(diagnosticsEnabled
      ? { debugInvalidations: [...metrics.debugInvalidations] }
      : {}),
  };
}

export const diagnosticsEnabled = new URLSearchParams(location.search).has(
  "diagnostic",
);

function diagnostic(entry: Record<string, unknown>) {
  if (!diagnosticsEnabled || metrics.debugInvalidations.length >= 3000) return;
  metrics.debugInvalidations.push({
    milliseconds: performance.now(),
    ...entry,
  });
}

export function debugInvalidation() {
  if (!diagnosticsEnabled) return;
  diagnostic({ kind: "invalidateScene", stack: new Error().stack });
}

export function debugSnapshot(entry: Record<string, unknown>) {
  diagnostic(entry);
}

export function debugMutationRecords(records: MutationRecord[]) {
  if (!diagnosticsEnabled) return;
  const concise = (value: string | null) =>
    (value ?? "").replace(/--glass-[^:;]+:[^;]+;?/g, "").slice(0, 500);
  diagnostic({
    kind: "nonGeometryMutations",
    records: records.slice(0, 30).map((record) => ({
      type: record.type,
      attribute: record.attributeName,
      slot:
        record.target instanceof HTMLElement
          ? record.target.dataset.slot
          : undefined,
      tag: record.target.nodeName,
      glass:
        record.target instanceof HTMLElement
          ? record.target.dataset.glass
          : undefined,
      frozenParent:
        record.target instanceof Element
          ? Boolean(record.target.closest('[data-glass-frozen="true"]'))
          : false,
      old: concise(record.oldValue),
      current:
        record.target instanceof Element && record.attributeName
          ? concise(record.target.getAttribute(record.attributeName))
          : undefined,
      added: [...record.addedNodes].map((node) => node.nodeName),
      removed: [...record.removedNodes].map((node) => node.nodeName),
    })),
  });
}

// This is only loaded by the local benchmark. Install before any renderer can
// request a device, while retaining native GPU objects and method receivers.
export function instrumentGpu() {
  if (!navigator.gpu) return;
  const requestAdapter = navigator.gpu.requestAdapter.bind(navigator.gpu);
  navigator.gpu.requestAdapter = async (options) => {
    const adapter = await requestAdapter(options);
    if (!adapter) return adapter;
    const requestDevice = adapter.requestDevice.bind(adapter);
    adapter.requestDevice = async (descriptor) => {
      const device = await requestDevice(descriptor);
      const upload = device.queue.copyExternalImageToTexture.bind(device.queue);
      device.queue.copyExternalImageToTexture = (...arguments_) => {
        metrics.uploads++;
        return upload(...arguments_);
      };
      return device;
    };
    return adapter;
  };
}

export const captureAuditEnabled = new URLSearchParams(location.search).has(
  "capture-audit",
);
export function recordCaptureAudit(
  canvas: HTMLCanvasElement,
  blocked: Set<Element>,
) {
  if (!captureAuditEnabled) return;
  const image = document.getElementById(
    "capture-audit-image",
  ) as HTMLImageElement | null;
  const metadata = document.getElementById("capture-audit-metadata");
  if (!image || image.hasAttribute("src") || !metadata) return;
  image.src = canvas.toDataURL("image/png");
  metadata.textContent = JSON.stringify(
    {
      width: canvas.width,
      height: canvas.height,
      excludedSurfaces: [...blocked].map((element) => ({
        slot: element.getAttribute("data-slot"),
        title:
          element.querySelector("h3")?.textContent ??
          element.textContent?.trim(),
      })),
    },
    null,
    2,
  );
}
