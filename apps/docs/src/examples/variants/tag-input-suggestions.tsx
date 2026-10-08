"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { TagInput } from "@workspace/ui/components/tag-input";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

const suggestions = [
  "React",
  "TypeScript",
  "Fumadocs",
  "TanStack Start",
  "Base UI",
];

export default function TagInputSuggestions({ locale }: ExampleProps) {
  const id = useId();
  const [values, setValues] = useState(["React"]);
  const chinese = locale === "zh-CN";

  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor={id}>{chinese ? "技术栈" : "Tech stack"}</FieldLabel>
      <TagInput
        id={id}
        value={values}
        onValueChange={setValues}
        suggestions={suggestions}
        placeholder={chinese ? "选择或添加…" : "Choose or add…"}
        labels={
          chinese
            ? {
                input: "技术栈",
                createValue: (value) => `添加“${value}”`,
                removeValue: (value) => `移除 ${value}`,
                empty: "没有匹配的技术",
              }
            : undefined
        }
      />
      <FieldDescription>
        {chinese
          ? "用方向键选择建议，也可以创建自己的标签"
          : "Choose a suggestion with the arrow keys or create your own tag."}
      </FieldDescription>
    </Field>
  );
}
