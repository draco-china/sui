import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";

export function SwitchDemo() {
  const previewId = usePreviewId();

  return (
    <div className="flex items-center space-x-2">
      <Switch id={`${previewId}-airplane-mode`} />
      <Label htmlFor={`${previewId}-airplane-mode`}>Airplane Mode</Label>
    </div>
  );
}

export default SwitchDemo;
