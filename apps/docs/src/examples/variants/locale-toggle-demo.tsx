"use client";
import { LocaleToggle } from "@workspace/ui/components/locale-toggle";
import { useState } from "react";
import type { ExampleProps } from "../types";

const options = [
  { value: "en-US", label: "English" },
  { value: "zh-CN", label: "简体中文" },
];
export default function Example({ locale }: ExampleProps) {
  const [value, setValue] = useState<string>(locale ?? "en-US");
  const chinese = locale === "zh-CN";
  return (
    <div className="grid w-full justify-items-start gap-4">
      <LocaleToggle
        value={value}
        onValueChange={setValue}
        options={options}
        label={chinese ? "示例语言" : "Example language"}
      />
      <output className="rounded-xl bg-muted p-4 text-sm" aria-live="polite">
        {value === "zh-CN" ? "你好，欢迎使用 SUI" : "Hello, welcome to SUI."}
      </output>
      <p className="text-muted-foreground text-sm">
        {chinese
          ? "此示例只修改本地状态，不改变文档语言或保存偏好"
          : "This example changes only local state, without changing the documentation language or saving preferences."}
      </p>
    </div>
  );
}
