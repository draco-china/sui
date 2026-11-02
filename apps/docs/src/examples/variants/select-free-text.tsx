"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  Select,
  SelectContent,
  SelectEmpty,
  SelectInput,
  SelectItem,
  SelectList,
} from "@workspace/ui/components/select";
import { useId, useState } from "react";

// Select resets its input on close and syncs it to the selected label; keep
// only what the user typed, pasted or cleared so free text survives.
function isUserEdit(details: { reason: string; event?: Event }) {
  if (details.reason === "input-clear") return details.event?.type === "input";
  return details.reason !== "none";
}

import type { ExampleProps } from "../types";

export default function SelectFreeText({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const [query, setQuery] = useState("");
  const cities = chinese
    ? ["北京", "上海", "杭州", "成都", "深圳"]
    : ["Beijing", "Shanghai", "Hangzhou", "Chengdu", "Shenzhen"];

  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor={id}>{chinese ? "目的地" : "Destination"}</FieldLabel>
      <Select
        items={cities}
        inputValue={query}
        onInputValueChange={(value, details) => {
          if (isUserEdit(details)) setQuery(value);
        }}
        onValueChange={(city: string | null) => setQuery(city ?? "")}
      >
        <SelectInput
          id={id}
          placeholder={chinese ? "选择或输入城市" : "Choose or type a city"}
          showClear
        />
        <SelectContent>
          <SelectEmpty>
            {chinese
              ? "没有匹配的城市，仍可使用你输入的名称"
              : "No matching cities. You can still use your own text."}
          </SelectEmpty>
          <SelectList>
            {(city: string) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            )}
          </SelectList>
        </SelectContent>
      </Select>
      <FieldDescription>
        {chinese
          ? "控制 inputValue 后，输入框的文字就是值，建议不会限制输入"
          : "Control inputValue and the typed text becomes the value; suggestions never restrict it."}
      </FieldDescription>
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {chinese ? "当前输入" : "Current input"}: {query || "—"}
      </output>
    </Field>
  );
}
