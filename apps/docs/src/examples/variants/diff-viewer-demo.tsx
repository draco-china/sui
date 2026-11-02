"use client";
import { Button } from "@workspace/ui/components/button";
import {
  DiffViewer,
  diffViewerLabelsZhCN,
} from "@workspace/ui/viewers/diff-viewer";
import { useState } from "react";
import type { ExampleProps } from "../types";

const oldCode =
  'export const theme = {\n  name: "default",\n  contrast: 4.5,\n};';
const revisedCode =
  'export const theme = {\n  name: "bamboo",\n  contrast: 4.5,\n  focusContrast: 3,\n};';
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const stateLabels = chinese
    ? {
        identical: "查看相同内容",
        changes: "查看修改",
      }
    : {
        identical: "Show identical content",
        changes: "Show changes",
      };
  const [changed, setChanged] = useState(true);
  return (
    <div className="grid w-full gap-3">
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() => setChanged((current) => !current)}
      >
        {changed ? stateLabels.identical : stateLabels.changes}
      </Button>
      <DiffViewer
        oldCode={oldCode}
        newCode={changed ? revisedCode : oldCode}
        title="theme.ts"
        oldTitle={
          chinese
            ? "原版本：设计令牌配置与完整的历史配色说明"
            : "Original: complete design token configuration and historical palette notes"
        }
        newTitle={chinese ? "新版本" : "Updated"}
        language="typescript"
        labels={chinese ? diffViewerLabelsZhCN : undefined}
      />
    </div>
  );
}
