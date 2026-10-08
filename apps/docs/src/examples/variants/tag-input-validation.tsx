"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { TagInput } from "@workspace/ui/components/tag-input";
import { useId } from "react";
import type { ExampleProps } from "../types";

export default function TagInputValidation({ locale }: ExampleProps) {
  const id = useId();
  const chinese = locale === "zh-CN";
  const labels = chinese
    ? {
        createValue: (value: string) => `添加“${value}”`,
        removeValue: (value: string) => `移除 ${value}`,
        invalidValue: (value: string) => `“${value}”只能包含字母或数字`,
        maxValuesReached: (limit: number) => `最多添加 ${limit} 个标签`,
        empty: "没有建议选项",
      }
    : undefined;

  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field>
        <FieldLabel htmlFor={`${id}-validated`}>
          {chinese ? "最多 3 个标签" : "Up to 3 tags"}
        </FieldLabel>
        <TagInput
          id={`${id}-validated`}
          defaultValue={["design"]}
          maxValues={3}
          validateValue={(value) => /^[a-z0-9]+$/i.test(value)}
          labels={labels}
          placeholder={chinese ? "添加字母或数字…" : "Letters or numbers…"}
        />
        <FieldDescription>
          {chinese
            ? "错误会保留草稿，移除标签后可继续添加"
            : "Invalid input stays in the draft. Remove a tag to make room."}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-disabled`}>
          {chinese ? "禁用标签" : "Disabled tags"}
        </FieldLabel>
        <TagInput
          id={`${id}-disabled`}
          defaultValue={["React", "Base UI"]}
          disabled
          labels={labels}
        />
      </Field>
    </div>
  );
}
