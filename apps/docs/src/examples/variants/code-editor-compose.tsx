"use client";
import { Badge } from "@workspace/ui/components/badge";
import {
  CodeEditorActions,
  CodeEditorContent,
  CodeEditorRoot,
  CodeEditorTitle,
  CodeEditorToolbar,
  CodeEditorToolbarButton,
  codeEditorLabelsZhCN,
  copy,
  useCodeEditor,
} from "@workspace/ui/components/code-editor";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import type { ExampleProps } from "../types";

const initialValue = '{\n  "name": "sui",\n  "private": true\n}';
const plugins = [copy()];

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [value, setValue] = useState(initialValue);
  const editor = useCodeEditor({
    value,
    onChange: setValue,
    language: "json",
    height: 200,
    labels: chinese ? codeEditorLabelsZhCN : undefined,
    plugins,
  });
  const dirty = value !== initialValue;
  return (
    <CodeEditorRoot editor={editor}>
      <CodeEditorToolbar>
        <CodeEditorTitle>package.json</CodeEditorTitle>
        {dirty && (
          <Badge variant="secondary">{chinese ? "未保存" : "Unsaved"}</Badge>
        )}
        <CodeEditorActions>
          <CodeEditorToolbarButton
            tooltip={chinese ? "撤销全部" : "Revert"}
            disabled={!dirty}
            onClick={() => setValue(initialValue)}
          >
            <Undo2 />
          </CodeEditorToolbarButton>
        </CodeEditorActions>
      </CodeEditorToolbar>
      <CodeEditorContent />
    </CodeEditorRoot>
  );
}
