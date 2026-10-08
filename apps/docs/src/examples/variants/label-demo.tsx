import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { useId as usePreviewId } from "react";

export default function LabelDemo() {
  const previewId = usePreviewId();

  return (
    <div className="flex gap-2">
      <Checkbox id={`${previewId}-terms`} />
      <Label htmlFor={`${previewId}-terms`}>Accept terms and conditions</Label>
    </div>
  );
}
