"use client";

import {
  Select,
  SelectCollection,
  SelectContent,
  SelectEmpty,
  SelectGroup,
  SelectInput,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectSeparator,
} from "@workspace/ui/components/select";

const timezones = [
  {
    value: "Americas",
    items: [
      "(GMT-5) New York",
      "(GMT-8) Los Angeles",
      "(GMT-6) Chicago",
      "(GMT-5) Toronto",
      "(GMT-8) Vancouver",
      "(GMT-3) São Paulo",
    ],
  },
  {
    value: "Europe",
    items: [
      "(GMT+0) London",
      "(GMT+1) Paris",
      "(GMT+1) Berlin",
      "(GMT+1) Rome",
      "(GMT+1) Madrid",
      "(GMT+1) Amsterdam",
    ],
  },
  {
    value: "Asia/Pacific",
    items: [
      "(GMT+9) Tokyo",
      "(GMT+8) Shanghai",
      "(GMT+8) Singapore",
      "(GMT+4) Dubai",
      "(GMT+11) Sydney",
      "(GMT+9) Seoul",
    ],
  },
] as const;

export function SelectInputGroups() {
  return (
    <Select items={timezones}>
      <SelectInput className="max-w-64" placeholder="Select a timezone" />
      <SelectContent>
        <SelectEmpty>No timezones found.</SelectEmpty>
        <SelectList>
          {(group, index) => (
            <SelectGroup key={group.value} items={group.items}>
              <SelectLabel>{group.value}</SelectLabel>
              <SelectCollection>
                {(item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                )}
              </SelectCollection>
              {index < timezones.length - 1 && <SelectSeparator />}
            </SelectGroup>
          )}
        </SelectList>
      </SelectContent>
    </Select>
  );
}

export default SelectInputGroups;
