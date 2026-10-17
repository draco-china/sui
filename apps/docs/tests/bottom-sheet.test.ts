import { describe, expect, test } from "bun:test";
import {
  bottomSheetFrame,
  bottomSheetLayout,
  createVelocityTracker,
  resolveBottomSheetRelease,
} from "@workspace/ui/lib/bottom-sheet";
import { describeFixture } from "./support/fixture";

const expandable = bottomSheetLayout({
  available: 800,
  natural: 1200,
  chrome: 160,
  detents: "auto",
});

describe("BottomSheet layout", () => {
  test("the default size takes at most half the available height, as on iOS", () => {
    expect(expandable).toEqual({
      heights: { default: 400, lg: 800 },
      expandable: true,
      full: false,
    });
  });

  test("auto keeps one size while content fits the default size", () => {
    expect(
      bottomSheetLayout({
        available: 800,
        natural: 360,
        chrome: 160,
        detents: "auto",
      }),
    ).toEqual({
      heights: { default: 360, lg: 360 },
      expandable: false,
      full: false,
    });
  });

  test("always keeps the lg size for short content", () => {
    expect(
      bottomSheetLayout({
        available: 800,
        natural: 300,
        chrome: 160,
        detents: "always",
      }),
    ).toEqual({
      heights: { default: 300, lg: 800 },
      expandable: true,
      full: false,
    });
  });

  test("false sizes a single detent to content, up to the available height", () => {
    expect(
      bottomSheetLayout({
        available: 800,
        natural: 1200,
        chrome: 160,
        detents: false,
      }),
    ).toEqual({
      heights: { default: 800, lg: 800 },
      expandable: false,
      full: true,
    });
  });

  test("a default size without room for 80px of body uses the full height", () => {
    // Half of 300 is 150, less than a 160px header and footer plus 80px.
    expect(
      bottomSheetLayout({
        available: 300,
        natural: 900,
        chrome: 160,
        detents: "auto",
      }),
    ).toEqual({
      heights: { default: 300, lg: 300 },
      expandable: false,
      full: true,
    });
  });
});

describe("BottomSheet frame", () => {
  test("grows between sizes and slides below the default size", () => {
    expect(bottomSheetFrame(600, expandable)).toEqual({
      height: 600,
      offset: 0,
      progress: 0.5,
    });
    expect(bottomSheetFrame(300, expandable)).toEqual({
      height: 400,
      offset: 100,
      progress: 0,
    });
  });

  test("cannot be dragged past the lg size", () => {
    expect(bottomSheetFrame(900, expandable)).toEqual({
      height: 800,
      offset: 0,
      progress: 1,
    });
  });
});

describe("BottomSheet release", () => {
  const release = (
    extent: number,
    velocity: number,
    from: "default" | "lg",
    layout = expandable,
  ) => resolveBottomSheetRelease({ extent, velocity, layout, from });

  test("a slow release settles on the nearest size", () => {
    expect(release(720, 0, "default")).toBe("lg");
    expect(release(560, 0, "lg")).toBe("default");
  });

  test("a flick moves one size in its direction", () => {
    expect(release(410, 0.8, "default")).toBe("lg");
    expect(release(790, -0.8, "lg")).toBe("default");
  });

  test("a flick down from lg stops at the default size", () => {
    expect(release(401, -2, "lg")).toBe("default");
  });

  test("dragging below the default size closes past the close distance", () => {
    expect(release(360, 0, "default")).toBe("default");
    expect(release(200, 0, "default")).toBe("closed");
    expect(release(390, -0.8, "default")).toBe("closed");
  });

  test("a single detent closes or springs back", () => {
    const single = bottomSheetLayout({
      available: 800,
      natural: 400,
      chrome: 120,
      detents: false,
    });
    expect(release(380, 0, "default", single)).toBe("default");
    expect(release(380, -0.6, "default", single)).toBe("closed");
    expect(release(200, 0, "default", single)).toBe("closed");
  });
});

describe("BottomSheet velocity", () => {
  test("follows the last direction of travel", () => {
    const tracker = createVelocityTracker();
    tracker.add(0, 0);
    tracker.add(-200, 100);
    tracker.add(-180, 160);
    tracker.add(-140, 200);
    expect(tracker.velocity(200)).toBeGreaterThan(0);
  });

  test("a pause before release drops momentum", () => {
    const tracker = createVelocityTracker();
    tracker.add(0, 0);
    tracker.add(-120, 40);
    expect(tracker.velocity(40)).toBeLessThan(-1);
    expect(tracker.velocity(200)).toBe(0);
  });
});

describeFixture(
  "BottomSheet on top of Base UI Drawer",
  "bottom-sheet-runtime.tsx",
);
