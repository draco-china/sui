export type CodeViewerLabels = {
  copy: string;
  loading: string;
  error: string;
  empty: string;
  expand: string;
  collapse: string;
  writing: string;
  ready: string;
  copied: string;
  copyFailed: string;
  /** Text of the button that unfolds a folded block. */
  foldedLines: (count: number) => string;
};

/** English defaults. Pass overrides or `codeViewerLabelsZhCN` through `labels`. */
export const codeViewerLabels: CodeViewerLabels = {
  copy: "Copy code",
  loading: "Loading...",
  error: "Unable to highlight code",
  empty: "No code",
  expand: "Expand",
  collapse: "Collapse",
  writing: "Writing",
  ready: "Ready",
  copied: "Copied",
  copyFailed: "Copy failed",
  foldedLines: (count) => `${count} ${count === 1 ? "line" : "lines"}`,
};

export const codeViewerLabelsZhCN: CodeViewerLabels = {
  copy: "复制代码",
  loading: "正在加载",
  error: "无法高亮代码",
  empty: "没有代码",
  expand: "展开",
  collapse: "收起",
  writing: "正在生成",
  ready: "就绪",
  copied: "已复制",
  copyFailed: "复制失败",
  foldedLines: (count) => `${count} 行`,
};
