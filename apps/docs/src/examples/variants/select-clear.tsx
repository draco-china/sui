"use client";

import {
  Select,
  SelectContent,
  SelectEmpty,
  SelectInput,
  SelectItem,
  SelectList,
} from "@workspace/ui/components/select";

const frameworks = [
  "Next.js",
  "SvelteKit",
  "Nuxt.js",
  "Remix",
  "Astro",
] as const;

export function SelectClearDemo() {
  return (
    <Select items={frameworks} defaultValue={frameworks[0]}>
      <SelectInput
        className="max-w-64"
        placeholder="Select a framework"
        showClear
      />
      <SelectContent>
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

export default SelectClearDemo;
