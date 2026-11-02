import {
  type ImageLabelOverrides,
  imageLabelsZhCN,
} from "../../components/image";
import { type CodeViewerLabels, codeViewerLabelsZhCN } from "../code-viewer";

export type MarkdownViewerLabels = {
  empty: string;
  note: string;
  tip: string;
  important: string;
  warning: string;
  caution: string;
  code?: Partial<CodeViewerLabels>;
  image?: ImageLabelOverrides;
};

/** English defaults. Pass overrides or `markdownViewerLabelsZhCN` through `labels`. */
export const markdownViewerLabels: MarkdownViewerLabels = {
  empty: "No markdown content",
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

export const markdownViewerLabelsZhCN: MarkdownViewerLabels = {
  empty: "没有 Markdown 内容",
  note: "备注",
  tip: "提示",
  important: "重要",
  warning: "警告",
  caution: "注意",
  code: codeViewerLabelsZhCN,
  image: imageLabelsZhCN,
};
