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

export default function SelectInputDemo() {
  return (
    <Select items={frameworks}>
      <SelectInput className="max-w-64" placeholder="Select a framework" />
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
