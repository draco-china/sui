import {
  Autocomplete,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
} from "@workspace/ui/components/autocomplete";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { useId } from "react";
import type { ExampleProps } from "../types";

interface Destination {
  id: string;
  label: string;
}
interface DestinationGroup {
  value: string;
  items: Destination[];
}

export default function AutocompleteGrouped({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const groups: DestinationGroup[] = [
    {
      value: chinese ? "亚洲" : "Asia",
      items: [
        { id: "tokyo", label: chinese ? "东京" : "Tokyo" },
        { id: "singapore", label: chinese ? "新加坡" : "Singapore" },
      ],
    },
    {
      value: chinese ? "欧洲" : "Europe",
      items: [
        { id: "paris", label: chinese ? "巴黎" : "Paris" },
        { id: "london", label: chinese ? "伦敦" : "London" },
      ],
    },
  ];

  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor={id}>
        {chinese ? "按地区浏览目的地" : "Browse destinations by region"}
      </FieldLabel>
      <Autocomplete
        items={groups}
        itemToStringValue={(item) => item.label}
        openOnInputClick
        autoHighlight
      >
        <AutocompleteInputGroup>
          <AutocompleteInput
            id={id}
            placeholder={chinese ? "搜索城市" : "Search cities"}
          />
        </AutocompleteInputGroup>
        <AutocompleteContent>
          <AutocompleteEmpty>
            {chinese ? "没有找到城市" : "No cities found."}
          </AutocompleteEmpty>
          <AutocompleteList>
            {(group: DestinationGroup) => (
              <AutocompleteGroup key={group.value} items={group.items}>
                <AutocompleteGroupLabel>{group.value}</AutocompleteGroupLabel>
                <AutocompleteCollection>
                  {(destination: Destination) => (
                    <AutocompleteItem key={destination.id} value={destination}>
                      {destination.label}
                    </AutocompleteItem>
                  )}
                </AutocompleteCollection>
              </AutocompleteGroup>
            )}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
    </Field>
  );
}
