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

const defaultPassword = "a-private-example";

export default function SensitiveInputDemo({ locale }: ExampleProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyResult, setCopyResult] = useState<
    "matched" | "mismatched" | "failed" | null
  >(null);
  const [matchesDefault, setMatchesDefault] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [submissions, setSubmissions] = useState(0);
  const chinese = locale === "zh-CN";
  const stateLabels = chinese
    ? {
        idle: "尚未复制",
        failed: "复制失败，请重试",
        matched: "复制值与当前输入匹配",
        mismatched: "复制值与当前输入不匹配",
        defaultMatched: "复制值与初始默认值匹配",
        defaultMismatched: "复制值与初始默认值不匹配",
        submittedMatched: "；提交值与当前输入匹配",
        submittedMismatched: "；提交值与当前输入不匹配",
      }
    : {
        idle: "Not copied yet",
        failed: "Copy failed. Try again.",
        matched: "Copied value matches the current input.",
        mismatched: "Copied value does not match the current input.",
        defaultMatched: "Copied value matches the original default.",
        defaultMismatched: "Copied value does not match the original default.",
        submittedMatched: "; submitted value matches the current input.",
        submittedMismatched:
          "; submitted value does not match the current input.",
      };

  return (
    <form
      className="grid w-full max-w-sm gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(
          new FormData(event.currentTarget).get("password") ===
            inputRef.current?.value,
        );
        setSubmissions((count) => count + 1);
      }}
      onReset={() => {
        setCopyResult(null);
        setMatchesDefault(null);
        setSubmitted(null);
        setSubmissions(0);
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>{chinese ? "密码" : "Password"}</FieldLabel>
        <SensitiveInput
          ref={inputRef}
          id={id}
          name="password"
          required
          defaultValue={defaultPassword}
          onChange={() => {
            setCopyResult(null);
            setMatchesDefault(null);
          }}
          autoComplete="current-password"
          aria-describedby={`${id}-description`}
          onCopySuccess={(value) => {
            setCopyResult(
              value === inputRef.current?.value ? "matched" : "mismatched",
            );
            setMatchesDefault(value === defaultPassword);
          }}
          onCopyError={() => {
            setCopyResult("failed");
            setMatchesDefault(null);
          }}
          labels={
            chinese
              ? {
                  reveal: "点击显示",
                  instruction: "点击或按 Enter 显示内容",
                  hidden: "内容已隐藏",
                  show: "显示密码",
                  hide: "隐藏密码",
                  copy: "复制密码",
                  pending: "正在复制密码…",
                  copied: "已复制密码",
                  failed: "复制失败，请重试",
                }
              : undefined
          }
        />
        <FieldDescription id={`${id}-description`}>
          {chinese
            ? "点击遮罩或按 Enter 显示后编辑。修改并复制，再重置并复制，核对是否恢复初始默认值"
            : "Click the mask or press Enter to reveal and edit. Copy an edit, then reset and copy again to verify the original default is restored."}
        </FieldDescription>
      </Field>
      <div className="flex gap-2">
        <Button type="submit">{chinese ? "提交" : "Submit"}</Button>
        <Button type="reset" variant="outline">
          {chinese ? "重置" : "Reset"}
        </Button>
      </div>
      <output
        className="grid gap-1 text-muted-foreground text-sm"
        aria-live="polite"
      >
        <span>{stateLabels[copyResult ?? "idle"]}</span>
        {matchesDefault !== null && (
          <span>
            {matchesDefault
              ? stateLabels.defaultMatched
              : stateLabels.defaultMismatched}
          </span>
        )}
        <span>
          {chinese ? `提交次数：${submissions}` : `Submissions: ${submissions}`}
          {submitted !== null &&
            (submitted
              ? stateLabels.submittedMatched
              : stateLabels.submittedMismatched)}
        </span>
      </output>
    </form>
  );
}
