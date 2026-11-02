"use client";
import { Button } from "@workspace/ui/components/button";
import {
  CodeEditor,
  codeEditorLabelsZhCN,
  copy,
  format,
  fullscreen,
} from "@workspace/ui/components/code-editor";
import { useState } from "react";
import type { ExampleProps } from "../types";

const initialValue = 'export const theme = { name: "bamboo", enabled: true };';
const plugins = [format(), copy(), fullscreen({ mode: "fixed" })];

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [value, setValue] = useState(initialValue);
  const [disabled, setDisabled] = useState(false);
  let toggleLabel = chinese ? "设为只读" : "Make read-only";
  if (disabled) toggleLabel = chinese ? "允许编辑" : "Enable editing";
  return (
    <div className="grid w-full gap-4">
      <Button
        variant="outline"
        className="justify-self-start"
        type="button"
        onClick={() => setDisabled((current) => !current)}
      >
        {toggleLabel}
      </Button>
      <CodeEditor
        value={value}
        onChange={setValue}
        disabled={disabled}
        language="typescript"
        height={260}
        title="theme.ts"
        labels={chinese ? codeEditorLabelsZhCN : undefined}
        plugins={plugins}
        toolbar={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => setValue(initialValue)}
          >
            {chinese ? "恢复示例" : "Reset example"}
          </Button>
        }
      />
    </div>
  );
}
