"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { TagInput } from "@workspace/ui/components/tag-input";
import { useId } from "react";
import type { ExampleProps } from "../types";

export default function TagInputDemo({ locale }: ExampleProps) {
  const id = useId();
  const chinese = locale === "zh-CN";

  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor={id}>
        {chinese ? "项目标签" : "Project tags"}
      </FieldLabel>
      <TagInput
        id={id}
        defaultValue={["design", "engineering"]}
        placeholder={chinese ? "添加标签…" : "Add a tag…"}
        labels={
          chinese
            ? {
                input: "项目标签",
                createValue: (value) => `添加“${value}”`,
                removeValue: (value) => `移除 ${value}`,
                empty: "没有建议选项",
              }
            : undefined
        }
      />
      <FieldDescription>
        {chinese
          ? "输入后按 Enter、逗号或 Tab 添加。支持中文输入法"
          : "Add with Enter, comma, or Tab. IME composition stays in the input."}
      </FieldDescription>
    </Field>
  );
}
