export type DiffViewerLabels = {
  before: string;
  after: string;
  split: string;
  unified: string;
  writing: string;
  loading: string;
  ready: string;
  error: string;
  copy: string;
  copied: string;
  copyFailed: string;
};

/** English defaults. Pass overrides or `diffViewerLabelsZhCN` through `labels`. */
export const diffViewerLabels: DiffViewerLabels = {
  before: "Before",
  after: "After",
  split: "Split",
  unified: "Unified",
  writing: "Writing",
  loading: "Loading...",
  ready: "Ready",
  error: "Unable to highlight diff",
  copy: "Copy updated code",
  copied: "Copied",
  copyFailed: "Copy failed",
};

export const diffViewerLabelsZhCN: DiffViewerLabels = {
  before: "修改前",
  after: "修改后",
  split: "并排",
  unified: "合并",
  writing: "正在生成",
  loading: "正在加载",
  ready: "就绪",
  error: "无法高亮对比",
  copy: "复制修改后代码",
  copied: "已复制",
  copyFailed: "复制失败",
};
