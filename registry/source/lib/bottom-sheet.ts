/** The sheet's detents: `"default"` rests at about half height, `"lg"` fills it. */
export type BottomSheetSize = "default" | "lg";

/**
 * `"auto"` adds the `"lg"` size only when content outgrows `"default"`,
 * `"always"` keeps both, and `false` sizes a single detent to content.
 */
export type BottomSheetDetents = "auto" | "always" | false;

export type BottomSheetLayout = {
  /** Visible height at each size; both are equal for a single detent. */
  heights: Record<BottomSheetSize, number>;
  /** The sheet can grow from `"default"` to `"lg"`. */
  expandable: boolean;
  /** The sheet fills the available height, so it reads as expanded. */
  full: boolean;
};

export const bottomSheetDefaults = {
  /** The default size takes at most half the available height, as on iOS. */
  defaultRatio: 0.5,
  /** Body space the default size must keep beside its header and footer. */
  minimumBody: 80,
  /** Movement before a press becomes a drag. */
  dragThreshold: 6,
  /** Release velocity, in px/ms, that moves one size in its direction. */
  flickVelocity: 0.3,
  /** Samples older than this, in ms, no longer count toward velocity. */
  velocityWindow: 100,
} as const;

/**
 * Resolves the height of each size from the space above the keyboard and
 * below the top safe area, the content's natural height and its header and
 * footer.
 */
export function bottomSheetLayout({
  available,
  natural,
  chrome,
  detents,
  defaultRatio = bottomSheetDefaults.defaultRatio,
  minimumBody = bottomSheetDefaults.minimumBody,
}: {
  available: number;
  natural: number;
  /** Header and footer height, which the default size must fit. */
  chrome: number;
  detents: BottomSheetDetents;
  defaultRatio?: number;
  minimumBody?: number;
}): BottomSheetLayout {
  const maximum = Math.max(0, available);
  const content = Math.max(0, natural);
  const single = (height: number): BottomSheetLayout => ({
    heights: { default: height, lg: height },
    expandable: false,
    full: height >= maximum - 1,
  });
  if (detents === false) return single(Math.min(content, maximum));
  const limit = maximum * defaultRatio;
  if (content > limit && limit < chrome + minimumBody)
    return single(Math.min(content, maximum));
  if (detents === "auto" && content <= limit) return single(content);
  const base = Math.min(content, limit);
  if (maximum - base <= 1) return single(maximum);
  return {
    heights: { default: base, lg: maximum },
    expandable: true,
    full: false,
  };
}

/**
 * Places a visible height: above the default size the sheet grows toward
 * `"lg"`, below it the sheet keeps its height and slides down toward closing.
 */
export function bottomSheetFrame(extent: number, layout: BottomSheetLayout) {
  const { heights, full } = layout;
  const visible = Math.min(extent, heights.lg);
  if (visible < heights.default)
    return {
      height: heights.default,
      offset: heights.default - Math.max(0, visible),
      progress: full ? 1 : 0,
    };
  return {
    height: visible,
    offset: 0,
    progress: frameProgress(visible, layout),
  };
}

/** 0 at the default size and 1 at `"lg"`; a full sheet stays 1. */
function frameProgress(visible: number, layout: BottomSheetLayout) {
  const { heights, expandable, full } = layout;
  if (full) return 1;
  const range = heights.lg - heights.default;
  if (!expandable || range <= 0) return 0;
  return (visible - heights.default) / range;
}

/** Distance below the default size at which a slow release closes. */
export function bottomSheetCloseDistance(height: number) {
  return Math.min(Math.max(height * 0.35, 48), 180);
}

/**
 * Chooses where a drag settles. A flick moves one size in its direction;
 * otherwise the nearest size wins. A drag that began at `"lg"` cannot close
 * unless it was pulled below the default size first.
 */
export function resolveBottomSheetRelease({
  extent,
  velocity,
  layout,
  from,
  flickVelocity = bottomSheetDefaults.flickVelocity,
}: {
  /** Visible height at release. */
  extent: number;
  /** Upward velocity in px/ms; negative values move down. */
  velocity: number;
  layout: BottomSheetLayout;
  from: BottomSheetSize;
  flickVelocity?: number;
}): BottomSheetSize | "closed" {
  const { heights, expandable } = layout;
  const base = heights.default;
  const below = extent < base - 1;
  if (velocity >= flickVelocity) {
    if (expandable && extent >= base - 1) return "lg";
    return "default";
  }
  if (velocity <= -flickVelocity) {
    if (expandable && extent > base + 1) return "default";
    if (from === "lg" && expandable && !below) return "default";
    return below || extent <= base ? "closed" : "default";
  }
  if (below)
    return base - extent > bottomSheetCloseDistance(base)
      ? "closed"
      : "default";
  if (!expandable) return "default";
  return extent - base > (heights.lg - base) / 2 ? "lg" : "default";
}

/** Tracks recent pointer positions so a pause before release drops momentum. */
export function createVelocityTracker(
  window: number = bottomSheetDefaults.velocityWindow,
) {
  let samples: { time: number; position: number }[] = [];
  return {
    reset() {
      samples = [];
    },
    add(position: number, time: number) {
      samples.push({ position, time });
      while (samples.length > 2 && time - (samples[0]?.time ?? time) > window)
        samples.shift();
    },
    /** Velocity in px/ms along the tracked axis at `time`. */
    velocity(time: number) {
      const recent = samples.filter((sample) => time - sample.time <= window);
      const first = recent[0];
      const last = recent[recent.length - 1];
      if (!first || !last || last.time - first.time < 8) return 0;
      return (last.position - first.position) / (last.time - first.time);
    },
  };
}
