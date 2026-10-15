export const metrics = {
  svgFilter: [] as number[],
  frames: [] as number[],
  commits: 0,
  reactMilliseconds: 0,
  longTasks: [] as number[],
};

export function resetMetrics() {
  metrics.svgFilter.length = 0;
  metrics.frames.length = 0;
  metrics.longTasks.length = 0;
  metrics.commits = 0;
  metrics.reactMilliseconds = 0;
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

/** Frame intervals from requestAnimationFrame; not a certified display rate. */
function frameRate() {
  const total = metrics.frames.reduce((sum, interval) => sum + interval, 0);
  return total ? Math.round((metrics.frames.length * 1000) / total) : null;
}

export function snapshot() {
  return {
    svgFilter: summary(metrics.svgFilter),
    frames: { ...summary(metrics.frames), framesPerSecond: frameRate() },
    reactCommits: metrics.commits,
    reactActualMs: metrics.reactMilliseconds,
    longTasks: summary(metrics.longTasks),
  };
}

let previousFrame = 0;
function tick(now: number) {
  if (previousFrame && !document.hidden)
    metrics.frames.push(now - previousFrame);
  previousFrame = now;
  requestAnimationFrame(tick);
}

export function recordFrames() {
  requestAnimationFrame(tick);
}

export const auditEnabled = new URLSearchParams(location.search).has("audit");
