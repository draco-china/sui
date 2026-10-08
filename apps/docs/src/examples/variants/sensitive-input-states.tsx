"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { SensitiveInput } from "@workspace/ui/components/sensitive-input";
import { useId, useRef, useState } from "react";
import type { ExampleProps } from "../types";

export default function SensitiveInputStates({ locale }: ExampleProps) {
  const id = useId();
  const readOnlyRef = useRef<HTMLInputElement>(null);
  const [copyResult, setCopyResult] = useState<
    "matched" | "mismatched" | "failed" | null
  >(null);
  const chinese = locale === "zh-CN";
  const stateLabels = chinese
    ? {
        idle: "尚未复制",
        failed: "复制失败，请重试",
        matched: "复制值与只读输入匹配",
        mismatched: "复制值与只读输入不匹配",
      }
    : {
        idle: "Not copied yet",
        failed: "Copy failed. Try again.",
        matched: "Copied value matches the read-only input.",
        mismatched: "Copied value does not match the read-only input.",
      };
  const labels = chinese
    ? {
        reveal: "点击显示",
        instruction: "点击或按 Enter 显示内容",
        hidden: "内容已隐藏",
        show: "显示内容",
        hide: "隐藏内容",
        copy: "复制内容",
        pending: "正在复制内容…",
        copied: "已复制内容",
        failed: "复制失败，请重试",
      }
    : undefined;

  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field>
        <FieldLabel htmlFor={`${id}-empty`}>
          {chinese ? "空值" : "Empty value"}
        </FieldLabel>
        <SensitiveInput
          id={`${id}-empty`}
          defaultValue=""
          placeholder={chinese ? "输入内容" : "Enter a value"}
          labels={labels}
        />
        <FieldDescription>
          {chinese
            ? "空值没有遮罩，可直接编辑；首次输入后显示内容，离开控件后重新遮罩。空值也可复制"
            : "An empty value can be edited directly. Typing reveals the value; leaving the group masks it again. Empty values can also be copied."}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-readonly`}>
          {chinese ? "只读密钥" : "Read-only key"}
        </FieldLabel>
        <SensitiveInput
          ref={readOnlyRef}
          id={`${id}-readonly`}
          defaultValue="read-only-example"
          readOnly
          labels={labels}
          onCopySuccess={(value) =>
            setCopyResult(
              value === readOnlyRef.current?.value ? "matched" : "mismatched",
            )
          }
          onCopyError={() => setCopyResult("failed")}
        />
        <FieldDescription>
          {chinese
            ? "只读内容可以点击或用键盘揭示，也可以复制，但不能编辑"
            : "Read-only values can be revealed by pointer or keyboard and copied, but cannot be edited."}
        </FieldDescription>
        <output className="text-muted-foreground text-sm" aria-live="polite">
          {stateLabels[copyResult ?? "idle"]}
        </output>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-disabled`}>
          {chinese ? "禁用" : "Disabled"}
        </FieldLabel>
        <SensitiveInput
          id={`${id}-disabled`}
          defaultValue="disabled-example"
          disabled
          labels={labels}
        />
        <FieldDescription>
          {chinese
            ? "输入、显隐和复制操作均被禁用"
            : "Input, visibility, and copy actions are disabled."}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-no-copy`}>
          {chinese ? "不提供复制按钮" : "Without a copy button"}
        </FieldLabel>
        <SensitiveInput
          id={`${id}-no-copy`}
          defaultValue="manual-entry-example"
          copyable={false}
          labels={labels}
        />
        <FieldDescription>
          {chinese
            ? "copyable=false 隐藏内置复制按钮，保留编辑与显隐"
            : "copyable=false hides the built-in copy action while retaining editing and visibility."}
        </FieldDescription>
      </Field>
    </div>
  );
}
