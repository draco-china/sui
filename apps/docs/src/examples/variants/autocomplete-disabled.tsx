import {
  Autocomplete,
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
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { InputGroupAddon } from "@workspace/ui/components/input-group";
import { Switch } from "@workspace/ui/components/switch";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

export default function AutocompleteDisabled({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const unavailableLabel = chinese ? "（暂不可用）" : " (unavailable)";
  const id = useId();
  const switchId = useId();
  const [disabled, setDisabled] = useState(true);
  const languages = ["TypeScript", "JavaScript", "Rust", "Go"];

  return (
    <FieldGroup className="w-full max-w-sm">
      <Field orientation="horizontal">
        <Switch
          id={switchId}
          checked={disabled}
          onCheckedChange={setDisabled}
        />
        <FieldLabel htmlFor={switchId}>
          {chinese ? "禁用建议输入框" : "Disable autocomplete"}
        </FieldLabel>
      </Field>
      <Field data-disabled={disabled}>
        <FieldLabel htmlFor={id}>
          {chinese ? "项目语言" : "Project language"}
        </FieldLabel>
        <Autocomplete
          items={languages}
          disabled={disabled}
          defaultValue="TypeScript"
          openOnInputClick
        >
          <AutocompleteInputGroup>
            <AutocompleteInput id={id} />
            <InputGroupAddon align="inline-end">
              <AutocompleteTrigger
                aria-label={
                  chinese ? "显示语言建议" : "Show language suggestions"
                }
              />
            </InputGroupAddon>
          </AutocompleteInputGroup>
          <AutocompleteContent>
            <AutocompleteEmpty>
              {chinese ? "没有匹配的语言" : "No matching languages."}
            </AutocompleteEmpty>
            <AutocompleteList>
              {(language: string) => (
                <AutocompleteItem
                  key={language}
                  value={language}
                  disabled={language === "Go"}
                >
                  {language}
                  {language === "Go" ? unavailableLabel : ""}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompleteContent>
        </Autocomplete>
        <FieldDescription>
          {chinese
            ? "开启控件后可以输入和浏览建议。Go 选项保持禁用"
            : "Enable the control to type and browse suggestions. The Go option stays disabled."}
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}
