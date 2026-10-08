import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useId as usePreviewId } from "react";

export function RadioGroupDemo() {
  const previewId = usePreviewId();

  return (
    <RadioGroup defaultValue="comfortable" className="w-fit">
      <div className="flex items-center gap-3">
        <RadioGroupItem value="default" id={`${previewId}-r1`} />
        <Label htmlFor={`${previewId}-r1`}>Default</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="comfortable" id={`${previewId}-r2`} />
        <Label htmlFor={`${previewId}-r2`}>Comfortable</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="compact" id={`${previewId}-r3`} />
        <Label htmlFor={`${previewId}-r3`}>Compact</Label>
      </div>
    </RadioGroup>
  );
}

export default RadioGroupDemo;
