"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { SensitiveInput } from "@workspace/ui/components/sensitive-input";
import { useId, useRef, useState } from "react";
import type { ExampleProps } from "../types";

export default function SensitiveInputControlled({ locale }: ExampleProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("example-api-key");
  const [visible, setVisible] = useState(false);
  const [copyMatchesInput, setCopyMatchesInput] = useState<boolean | null>(
    null,
  );
  const [copyFailed, setCopyFailed] = useState(false);
  const [nativeCopyEvents, setNativeCopyEvents] = useState(0);
  const chinese = locale === "zh-CN";
  const stateLabels = chinese
    ? {
        idle: "尚未复制",
        failed: "复制失败，请重试",
        matched: "复制值与当前输入匹配",
        mismatched: "复制值与当前输入不匹配",
      }
    : {
        idle: "Not copied yet",
        failed: "Copy failed. Try again.",
        matched: "Copied value matches the current input.",
        mismatched: "Copied value does not match the current input.",
      };

  let copyFeedback = stateLabels.idle;
  if (copyFailed) copyFeedback = stateLabels.failed;
  else if (copyMatchesInput !== null)
    copyFeedback = copyMatchesInput
      ? stateLabels.matched
      : stateLabels.mismatched;

  return (
    <div className="grid w-full max-w-sm gap-4">
      <Field>
        <FieldLabel htmlFor={id}>{chinese ? "API 密钥" : "API key"}</FieldLabel>
        <SensitiveInput
          ref={inputRef}
          id={id}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setCopyMatchesInput(null);
            setCopyFailed(false);
          }}
          visible={visible}
          onVisibleChange={setVisible}
          onCopy={() => setNativeCopyEvents((count) => count + 1)}
          onCopySuccess={(copiedValue) => {
            setCopyFailed(false);
            setCopyMatchesInput(copiedValue === inputRef.current?.value);
          }}
          onCopyError={() => {
            setCopyFailed(true);
            setCopyMatchesInput(null);
          }}
          resetDelay={1500}
          autoComplete="off"
          aria-describedby={`${id}-description`}
          labels={
            chinese
              ? {
                  reveal: "点击显示",
                  instruction: "点击或按 Enter 显示内容",
                  hidden: "内容已隐藏",
                  show: "显示密钥",
                  hide: "隐藏密钥",
                  copy: "复制密钥",
                  pending: "正在复制密钥…",
                  copied: "已复制密钥",
                  failed: "复制失败，请重试",
                }
              : undefined
          }
        />
        <FieldDescription id={`${id}-description`}>
          {chinese
            ? "点击遮罩或按 Enter 显示。Escape 或离开输入组会请求隐藏；受控 visible 决定最终状态。选中显示的文字后复制，可观察原生 onCopy 事件"
            : "Click the mask or press Enter to reveal. Escape or leaving the group requests hiding; controlled visible remains authoritative. Select revealed text to exercise native onCopy."}
        </FieldDescription>
      </Field>
      <Button type="button" variant="outline" onClick={() => setVisible(false)}>
        {chinese ? "从外部隐藏" : "Hide from outside"}
      </Button>
      <output
        className="grid gap-1 text-muted-foreground text-sm"
        aria-live="polite"
      >
        <span>{copyFeedback}</span>
        <span>
          {chinese
            ? `原生复制事件：${nativeCopyEvents}`
            : `Native copy events: ${nativeCopyEvents}`}
        </span>
      </output>
    </div>
  );
}
