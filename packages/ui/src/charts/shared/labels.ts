export type ChartLabels = {
  readonly empty: string;
  readonly loading: string;
  readonly toggleSeries: string;
};

/** English defaults. Pass overrides or `chartLabelsZhCN` through `labels`. */
export const chartLabels: ChartLabels = {
  empty: "No data",
  loading: "Loading chart",
  toggleSeries: "Toggle series",
};

export const chartLabelsZhCN: ChartLabels = {
  empty: "暂无数据",
  loading: "图表加载中",
  toggleSeries: "切换系列",
};
