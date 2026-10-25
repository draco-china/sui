"use client";

import { FieldLabel } from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { WheelPicker } from "@workspace/ui/components/wheel-picker";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [value, setValue] = useState("30");
  const [sound, setSound] = useState(false);
  const soundId = useId();
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm" aria-live="polite">
        {zh ? `时长：${value} 分钟` : `Duration: ${value} minutes`}
      </p>
      <WheelPicker
        aria-label={zh ? "时长（分钟）" : "Duration in minutes"}
        options={["5", "10", "15", "20", "30", "45", "60", "90"]}
        value={value}
        onValueChange={setValue}
        sound={sound}
      />
      <div className="flex items-center gap-2">
        <Switch id={soundId} checked={sound} onCheckedChange={setSound} />
        <FieldLabel htmlFor={soundId}>
          {zh ? "刻度音" : "Tick sound"}
        </FieldLabel>
      </div>
    </div>
  );
}
