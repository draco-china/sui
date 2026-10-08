"use client";

import { Label } from "@workspace/ui/components/label";
import { Slider } from "@workspace/ui/components/slider";
import * as React from "react";
import { useId as usePreviewId } from "react";

export function SliderControlled() {
  const previewId = usePreviewId();

  const [value, setValue] = React.useState([0.3, 0.7]);

  return (
    <div className="mx-auto grid w-full max-w-xs gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${previewId}-slider-demo-temperature`}>
          Temperature
        </Label>
        <span className="text-muted-foreground text-sm">
          {value.join(", ")}
        </span>
      </div>
      <Slider
        id={`${previewId}-slider-demo-temperature`}
        value={value}
        onValueChange={(value) => setValue(value as number[])}
        min={0}
        max={1}
        step={0.1}
      />
    </div>
  );
}

export default SliderControlled;
