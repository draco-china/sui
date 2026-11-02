import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
  { label: "Kiwi", value: "kiwi" },
  { label: "Mango", value: "mango" },
  { label: "Orange", value: "orange" },
  { label: "Pear", value: "pear" },
  { label: "Strawberry", value: "strawberry" },
  { label: "Watermelon", value: "watermelon" },
];

export function SelectDemo() {
  return (
    <Select items={items}>
      <SelectTrigger className="max-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <SelectList>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectList>
      </SelectContent>
    </Select>
  );
}

export default SelectDemo;
