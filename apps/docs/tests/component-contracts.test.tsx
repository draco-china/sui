import { describe, expect, test } from "bun:test";
import { useDataTableUrlState } from "@workspace/ui/blocks/data-table";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { Slider } from "@workspace/ui/components/slider";
import { Toggle } from "@workspace/ui/components/toggle";
import { renderToStaticMarkup } from "react-dom/server";

function thumbs(props: React.ComponentProps<typeof Slider>) {
  return [
    ...renderToStaticMarkup(<Slider {...props} />).matchAll(
      /data-slot="slider-thumb"/g,
    ),
  ].length;
}

describe("Slider value shape", () => {
  test("controlled and uncontrolled numbers have one accessible handle", () => {
    expect(thumbs({ value: 40 })).toBe(1);
    expect(thumbs({ defaultValue: 40 })).toBe(1);
    expect(thumbs({ value: 0 })).toBe(1);
    expect(thumbs({})).toBe(1);
  });
  test("arrays preserve single-handle and range shapes", () => {
    expect(thumbs({ value: [40] })).toBe(1);
    expect(thumbs({ defaultValue: [20, 80] })).toBe(2);
    expect(thumbs({ value: [10, 40, 80] })).toBe(3);
  });
});

test("Button and Toggle execute Base UI state class callbacks", () => {
  const button = renderToStaticMarkup(
    <Button
      disabled
      className={(state) =>
        state.disabled ? "disabled-probe" : "enabled-probe"
      }
    >
      Save
    </Button>,
  );
  expect(button).toContain("disabled-probe");
  expect(button).not.toContain("enabled-probe");
  expect(button).toContain("group/button");
  const toggle = renderToStaticMarkup(
    <Toggle
      pressed
      className={(state) => (state.pressed ? "pressed-probe" : "idle-probe")}
    >
      Pin
    </Toggle>,
  );
  expect(toggle).toContain("pressed-probe");
  expect(toggle).toContain("group/toggle");
});

test("chart content forwards native and glass attributes without leaking Recharts configuration", () => {
  const tooltip = renderToStaticMarkup(
    <ChartContainer config={{ count: { label: "Count" } }}>
      <ChartTooltipContent
        glass
        active
        payload={[
          {
            name: "count",
            dataKey: "count",
            value: 3,
            graphicalItemId: "series",
          },
        ]}
        id="tooltip-probe"
        aria-label="Count details"
        style={{ maxWidth: 240 }}
        offset={12}
        animationDuration={0}
      />
    </ChartContainer>,
  );
  expect(tooltip).toContain('id="tooltip-probe"');
  expect(tooltip).toContain('aria-label="Count details"');
  expect(tooltip).toContain('data-glass="true"');
  expect(tooltip).toContain("max-width:240px");
  expect(tooltip).not.toContain('offset="12"');
  expect(tooltip).not.toContain("animationDuration=");
  const legend = renderToStaticMarkup(
    <ChartContainer config={{ count: { label: "Count" } }}>
      <ChartLegendContent
        payload={[{ value: "count", dataKey: "count" }]}
        id="legend-probe"
        aria-label="Series"
        style={{ opacity: 0.8 }}
        iconSize={12}
      />
    </ChartContainer>,
  );
  expect(legend).toContain('id="legend-probe"');
  expect(legend).toContain('aria-label="Series"');
  expect(legend).toContain("opacity:0.8");
  expect(legend).not.toContain("iconSize=");
});

function pagination(
  search: Record<string, unknown>,
  defaults?: { defaultPage?: number; defaultPageSize?: number },
) {
  let result: unknown;
  function Probe() {
    result = useDataTableUrlState({
      search,
      navigate: () => {},
      pagination: defaults,
    }).initialState.pagination;
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return result;
}

describe("URL pagination normalization", () => {
  test("fractions below one fall back to valid pages and sizes", () => {
    expect(pagination({ page: 0.5, pageSize: "0.5" })).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
    expect(
      pagination(
        { page: 0.5, pageSize: 0.5 },
        { defaultPage: 2, defaultPageSize: 20 },
      ),
    ).toEqual({ pageIndex: 1, pageSize: 20 });
  });
  test("normal values remain stable and positive fractions are floored", () => {
    expect(pagination({ page: "3", pageSize: "25" })).toEqual({
      pageIndex: 2,
      pageSize: 25,
    });
    expect(pagination({ page: 3.5, pageSize: 25.7 })).toEqual({
      pageIndex: 2,
      pageSize: 25,
    });
  });
  test("invalid defaults and non-finite search cannot create invalid state", () => {
    expect(
      pagination(
        { page: Infinity, pageSize: -1 },
        { defaultPage: NaN, defaultPageSize: Infinity },
      ),
    ).toEqual({ pageIndex: 0, pageSize: 10 });
    expect(pagination({}, { defaultPage: 0.5, defaultPageSize: 0.5 })).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });
});

test("Calendar markup is independent of the host's default Intl locale", () => {
  const props = {
    defaultMonth: new Date(2026, 9, 1),
    captionLayout: "dropdown" as const,
    mode: "single" as const,
  };
  const originalMonth = Date.prototype.toLocaleString;
  const originalDate = Date.prototype.toLocaleDateString;
  const english = renderToStaticMarkup(<Calendar {...props} />);
  try {
    Date.prototype.toLocaleString = function (
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      return originalMonth.call(this, locales ?? "zh-CN", options);
    };
    Date.prototype.toLocaleDateString = function (
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      return originalDate.call(this, locales ?? "zh-CN", options);
    };
    const chineseHost = renderToStaticMarkup(<Calendar {...props} />);
    expect(chineseHost).toBe(english);
  } finally {
    Date.prototype.toLocaleString = originalMonth;
    Date.prototype.toLocaleDateString = originalDate;
  }
});
