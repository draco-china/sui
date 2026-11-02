import { describe, expect, test } from "bun:test";
import { AreaChart } from "@workspace/ui/charts/area-chart";
import { BarChart, numberFormatter } from "@workspace/ui/charts/bar-chart";
import { ComposedChart } from "@workspace/ui/charts/composed-chart";
import { chartLabelsZhCN, LineChart } from "@workspace/ui/charts/line-chart";
import { PieChart } from "@workspace/ui/charts/pie-chart";
import { RadarChart } from "@workspace/ui/charts/radar-chart";
import { RadialChart } from "@workspace/ui/charts/radial-chart";
import { SparklineChart } from "@workspace/ui/charts/sparkline-chart";
import { renderToStaticMarkup } from "react-dom/server";
import {
  seriesColor,
  toggleSeries,
} from "../../../packages/ui/src/charts/shared/series";

const data = [
  { month: "January", desktop: 1860, mobile: 800 },
  { month: "February", desktop: 3050, mobile: -200 },
];
const config = {
  month: { label: "Month" },
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile" },
};
const series = ["desktop", "mobile"];
const slices = [
  { browser: "chrome", visitors: 275 },
  { browser: "safari", visitors: 200 },
];
const sliceConfig = {
  chrome: { label: "Chrome" },
  safari: { label: "Safari" },
};

const charts = {
  AreaChart: (props: object) => (
    <AreaChart
      data={data}
      config={config}
      index="month"
      categories={series}
      {...props}
    />
  ),
  BarChart: (props: object) => (
    <BarChart
      data={data}
      config={config}
      index="month"
      categories={series}
      {...props}
    />
  ),
  LineChart: (props: object) => (
    <LineChart
      data={data}
      config={config}
      index="month"
      categories={series}
      {...props}
    />
  ),
  RadarChart: (props: object) => (
    <RadarChart
      data={data}
      config={config}
      index="month"
      categories={series}
      {...props}
    />
  ),
  ComposedChart: (props: object) => (
    <ComposedChart
      data={data}
      config={config}
      index="month"
      bars={["desktop"]}
      lines={["mobile"]}
      {...props}
    />
  ),
  SparklineChart: (props: object) => (
    <SparklineChart
      data={data}
      config={config}
      categories={series}
      {...props}
    />
  ),
  PieChart: (props: object) => (
    <PieChart
      data={slices}
      config={sliceConfig}
      nameKey="browser"
      valueKey="visitors"
      {...props}
    />
  ),
  RadialChart: (props: object) => (
    <RadialChart
      data={slices}
      config={sliceConfig}
      nameKey="browser"
      valueKey="visitors"
      {...props}
    />
  ),
};

describe.each(Object.entries(charts))("%s", (_, render) => {
  test("renders a labelled figure with a data table for screen readers", () => {
    const html = renderToStaticMarkup(render({ "aria-label": "Visitors" }));
    expect(html).toContain('<figure aria-label="Visitors"');
    expect(html).toContain('data-slot="chart"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(
      '<table class="sr-only"><caption>Visitors</caption>',
    );
  });

  test("shows loading and empty states instead of a blank canvas", () => {
    const loading = renderToStaticMarkup(render({ loading: true }));
    expect(loading).toContain('data-slot="chart-loading"');
    expect(loading).toContain('role="status"');
    expect(loading).not.toContain('data-slot="chart"');

    const empty = renderToStaticMarkup(
      render({ data: [], labels: chartLabelsZhCN }),
    );
    expect(empty).toContain('data-slot="chart-empty"');
    expect(empty).toContain("暂无数据");
  });
});

test("the screen reader table formats values with valueFormatter", () => {
  const html = renderToStaticMarkup(
    charts.BarChart({
      valueFormatter: numberFormatter({ notation: "compact" }, "en"),
    }),
  );
  expect(html).toContain(
    '<th scope="col">Month</th><th scope="col">Desktop</th>',
  );
  expect(html).toContain(
    '<th scope="row">January</th><td>1.9K</td><td>800</td>',
  );
});

test("cartesian legends toggle series; pie legends list slices without toggling", () => {
  const html = renderToStaticMarkup(charts.LineChart({ showLegend: true }));
  expect(html).toContain('data-slot="chart-legend"');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);

  const pie = renderToStaticMarkup(charts.PieChart({ showLegend: true }));
  expect(pie).toContain("Chrome");
  expect(pie).toContain("Safari");
  expect(pie).not.toContain("aria-pressed");
});

test("toggleSeries hides and shows a series without mutating state", () => {
  const empty = new Set<string>();
  const hidden = toggleSeries(empty, "desktop");
  expect([...hidden]).toEqual(["desktop"]);
  expect(empty.size).toBe(0);
  expect(toggleSeries(hidden, "desktop").size).toBe(0);
});

test("series without a configured color fall back to the theme palette", () => {
  expect(seriesColor("mobile", 1)).toBe("var(--color-mobile, var(--chart-2))");
  expect(seriesColor("other", 6)).toBe("var(--color-other, var(--chart-2))");
});

test("series keys keep distinct color variables", () => {
  expect(seriesColor("收入", 0)).toBe("var(--color-收入, var(--chart-1))");
  expect(seriesColor("支出", 1)).toBe("var(--color-支出, var(--chart-2))");
  expect(seriesColor("a b", 0)).toBe("var(--color-a\\20 b, var(--chart-1))");
  expect(seriesColor("a_b", 0)).toBe("var(--color-a_b, var(--chart-1))");
});
