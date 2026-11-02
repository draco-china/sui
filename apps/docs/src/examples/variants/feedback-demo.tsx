import { FeedbackProvider } from "@workspace/ui/components/feedback";
import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { useId as usePreviewId } from "react";

export function FeedbackDemo() {
  const previewId = usePreviewId();

  return (
    <FeedbackProvider haptics sound>
      <div className="flex w-full max-w-xs flex-col gap-6">
        <div className="flex items-center space-x-2">
          <Switch id={`${previewId}-wifi`} defaultChecked />
          <Label htmlFor={`${previewId}-wifi`}>Wi-Fi</Label>
        </div>
        <ToggleGroup variant="outline" spacing={0} defaultValue={["day"]}>
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
          <ToggleGroupItem value="month">Month</ToggleGroupItem>
        </ToggleGroup>
        <Slider defaultValue={[5]} max={10} aria-label="Volume" />
      </div>
    </FeedbackProvider>
  );
}

export default FeedbackDemo;
