import { expect, test } from "bun:test";
import { WheelPicker } from "@workspace/ui/components/wheel-picker";
import { renderToStaticMarkup } from "react-dom/server";
import { describeFixture } from "./support/fixture";

describeFixture("Wheel Picker selection contracts", "wheel-picker-runtime.tsx");

test("wheel SSR exposes one labelled listbox and unique options with stable values", () => {
  const html = renderToStaticMarkup(
    <WheelPicker
      aria-label="Size"
      options={[
        { label: "Small", value: "s" },
        { label: "Large", value: "l" },
      ]}
      defaultValue="l"
      name="size"
    />,
  );
  expect(html.match(/role="listbox"/g)).toHaveLength(1);
  expect(html.match(/role="option"/g)).toHaveLength(2);
  expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  expect(html).toContain('value="l"');
  expect(html).toContain('aria-label="Large"');
});
