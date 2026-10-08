"use client";
import { Button } from "@workspace/ui/components/button";
import { Editor } from "@workspace/ui/components/editor";
import { useState } from "react";
import type { ExampleProps } from "../types";

const initialValue = 'export const theme = { name: "bamboo", enabled: true };';
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const stateLabels = chinese
    ? {
        enable: "允许编辑",
        readOnly: "设为只读",
      }
    : {
        enable: "Enable editing",
        readOnly: "Make read-only",
      };
  const [value, setValue] = useState(initialValue);
  const [disabled, setDisabled] = useState(false);
  return (
    <div className="grid w-full gap-4">
      <Button
        variant="outline"
        className="justify-self-start"
        type="button"
        onClick={() => setDisabled((current) => !current)}
      >
        {disabled ? stateLabels.enable : stateLabels.readOnly}
      </Button>
      <Editor
        value={value}
        onChange={setValue}
        disabled={disabled}
        language="typescript"
        height={260}
        toolbarTitle="theme.ts"
        toolbarMode={false}
        fullscreen={{ mode: "fixed" }}
        toolbar={({ format, disabled }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={format}
            >
              {chinese ? "格式化" : "Format"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => setValue(initialValue)}
            >
              {chinese ? "恢复示例" : "Reset example"}
            </Button>
          </div>
        )}
        labels={
          chinese
            ? {
                copied: "已复制",
                copyFailed: "复制失败",
                loading: "正在加载编辑器",
                loadingPreview: "正在加载预览",
                error: "无法加载编辑器",
                preview: "预览",
                hidePreview: "隐藏预览",
                split: "并排",
                copy: "复制",
                fullscreen: "全屏",
                exitFullscreen: "退出全屏",
              }
            : undefined
        }
      />
    </div>
  );
}
