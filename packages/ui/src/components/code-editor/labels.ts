/** English defaults. Pass overrides or `codeEditorLabelsZhCN` through `labels`. */
export const codeEditorLabels = {
  copied: "Copied",
  copyFailed: "Copy failed",
  loading: "Loading editor",
  loadingPreview: "Loading preview…",
  language: "Language",
  error: "Unable to load editor",
  preview: "Preview",
  hidePreview: "Hide preview",
  split: "Split",
  copy: "Copy",
  format: "Format",
  fullscreen: "Fullscreen",
  exitFullscreen: "Exit fullscreen",
};

export type CodeEditorLabels = typeof codeEditorLabels;
export type CodeEditorLabelOverrides = Partial<CodeEditorLabels>;

export const codeEditorLabelsZhCN: CodeEditorLabelOverrides = {
  copied: "已复制",
  copyFailed: "复制失败",
  loading: "正在加载编辑器",
  loadingPreview: "正在加载预览…",
  language: "语言",
  error: "无法加载编辑器",
  preview: "预览",
  hidePreview: "隐藏预览",
  split: "并排",
  copy: "复制",
  format: "格式化",
  fullscreen: "全屏",
  exitFullscreen: "退出全屏",
};
