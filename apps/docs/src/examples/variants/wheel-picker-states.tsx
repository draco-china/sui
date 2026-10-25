import { WheelPicker } from "@workspace/ui/components/wheel-picker";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="flex max-w-full flex-wrap justify-center gap-6">
      <WheelPicker
        disabled
        aria-label={zh ? "已停用的时长" : "Disabled duration"}
        options={["15", "30", "45"]}
        defaultValue="30"
        className="w-28"
      />
      <WheelPicker
        aria-label={zh ? "空选项" : "Empty options"}
        options={[]}
        className="w-28"
      />
    </div>
  );
}
