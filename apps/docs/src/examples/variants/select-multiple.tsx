"use client";

import {
  Select,
  SelectChip,
  SelectChips,
  SelectChipsInput,
  SelectContent,
  SelectEmpty,
  SelectItem,
  SelectList,
  SelectValue,
  useSelectAnchor,
} from "@workspace/ui/components/select";
import * as React from "react";

const frameworks = [
  "Next.js",
  "SvelteKit",
  "Nuxt.js",
  "Remix",
  "Astro",
] as const;

export function SelectMultiple() {
  const anchor = useSelectAnchor();

  return (
    <Select
      multiple
      autoHighlight
      items={frameworks}
      defaultValue={[frameworks[0]]}
    >
      <SelectChips ref={anchor} className="w-full max-w-xs">
        <SelectValue>
          {(values) => (
            <React.Fragment>
              {values.map((value: string) => (
                <SelectChip key={value}>{value}</SelectChip>
              ))}
              <SelectChipsInput />
            </React.Fragment>
          )}
        </SelectValue>
      </SelectChips>
      <SelectContent anchor={anchor}>
        <SelectEmpty>No items found.</SelectEmpty>
        <SelectList>
          {(item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          )}
        </SelectList>
      </SelectContent>
    </Select>
  );
}

export default SelectMultiple;
