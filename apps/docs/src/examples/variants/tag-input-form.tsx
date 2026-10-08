"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { TagInput } from "@workspace/ui/components/tag-input";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

const defaultTags = ["design"];

export default function TagInputForm({ locale }: ExampleProps) {
  const id = useId();
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  const [keepTags, setKeepTags] = useState(false);
  const chinese = locale === "zh-CN";
  const notSubmittedLabel = chinese ? "尚未提交" : "Not submitted";

  return (
    <form
      className="grid w-full max-w-sm gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSubmitted(data.getAll("tags").map(String));
      }}
      onReset={(event) => {
        if (keepTags) event.preventDefault();
        else setSubmitted(null);
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>
          {chinese ? "项目标签" : "Project tags"}
        </FieldLabel>
        <TagInput
          id={id}
          name="tags"
          required
          defaultValue={defaultTags}
          placeholder={chinese ? "添加标签…" : "Add a tag…"}
          labels={
            chinese
              ? {
                  createValue: (value) => `添加“${value}”`,
                  removeValue: (value) => `移除 ${value}`,
                  empty: "没有建议选项",
                }
              : undefined
          }
        />
        <FieldDescription>
          {chinese
            ? "至少选择一个标签。重置会恢复 design；草稿不会进入提交数据"
            : "Choose at least one tag. Reset restores design; draft text is not submitted."}
        </FieldDescription>
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id={`${id}-keep`}
          checked={keepTags}
          onCheckedChange={setKeepTags}
        />
        <FieldLabel htmlFor={`${id}-keep`}>
          {chinese ? "阻止表单重置" : "Prevent form reset"}
        </FieldLabel>
      </Field>
      <div className="flex gap-2">
        <Button type="submit">{chinese ? "提交" : "Submit"}</Button>
        <Button type="reset" variant="outline">
          {chinese ? "重置" : "Reset"}
        </Button>
      </div>
      <output
        className="rounded-2xl bg-muted px-3 py-2 font-mono text-sm"
        aria-live="polite"
      >
        {submitted === null ? notSubmittedLabel : JSON.stringify(submitted)}
      </output>
    </form>
  );
}
