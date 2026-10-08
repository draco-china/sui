import {
  Autocomplete,
  AutocompleteClear,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteTrigger,
} from "@workspace/ui/components/autocomplete";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { InputGroupAddon } from "@workspace/ui/components/input-group";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

export default function AutocompleteDemo({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const [query, setQuery] = useState("");
  const cities = chinese
    ? ["北京", "上海", "杭州", "成都", "深圳"]
    : ["Beijing", "Shanghai", "Hangzhou", "Chengdu", "Shenzhen"];

  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor={id}>{chinese ? "目的地" : "Destination"}</FieldLabel>
      <Autocomplete
        items={cities}
        value={query}
        onValueChange={setQuery}
        openOnInputClick
      >
        <AutocompleteInputGroup>
          <AutocompleteInput
            id={id}
            placeholder={chinese ? "选择或输入城市" : "Choose or type a city"}
          />
          <InputGroupAddon align="inline-end">
            <AutocompleteClear
              aria-label={chinese ? "清空目的地" : "Clear destination"}
            />
            <AutocompleteTrigger
              aria-label={chinese ? "显示城市建议" : "Show city suggestions"}
            />
          </InputGroupAddon>
        </AutocompleteInputGroup>
        <AutocompleteContent>
          <AutocompleteEmpty>
            {chinese
              ? "没有匹配的城市，仍可使用你输入的名称"
              : "No matching cities. You can still use your own text."}
          </AutocompleteEmpty>
          <AutocompleteList>
            {(city: string) => (
              <AutocompleteItem key={city} value={city}>
                {city}
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
      <FieldDescription>
        {chinese
          ? "城市建议不会限制自由输入。使用方向键浏览，Enter 采用建议，Escape 关闭"
          : "Suggestions do not restrict your input. Use arrow keys to browse, Enter to accept, and Escape to close."}
      </FieldDescription>
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {chinese ? "当前输入" : "Current input"}: {query || "—"}
      </output>
    </Field>
  );
}
