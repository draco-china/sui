import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "@workspace/ui/components/toolbar";
import { RotateCcwIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

export default function ToolbarDisabled({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const [disabled, setDisabled] = useState(true);
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex flex-col items-start gap-4">
      <Field orientation="horizontal">
        <Switch id={id} checked={disabled} onCheckedChange={setDisabled} />
        <FieldLabel htmlFor={id}>
          {chinese ? "禁用工具栏" : "Disable toolbar"}
        </FieldLabel>
      </Field>
      <div className="flex items-center gap-4">
        <Toolbar
          orientation="vertical"
          disabled={disabled}
          aria-label={chinese ? "缩放工具栏" : "Zoom toolbar"}
        >
          <ToolbarGroup aria-label={chinese ? "调整缩放" : "Adjust zoom"}>
            <ToolbarButton
              size="icon"
              aria-label={chinese ? "放大" : "Zoom in"}
              onClick={() => setZoom((value) => Math.min(200, value + 10))}
              disabled={zoom >= 200}
            >
              <ZoomInIcon />
            </ToolbarButton>
            <ToolbarButton
              size="icon"
              aria-label={chinese ? "缩小" : "Zoom out"}
              onClick={() => setZoom((value) => Math.max(50, value - 10))}
              disabled={zoom <= 50}
            >
              <ZoomOutIcon />
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarButton
            size="icon"
            aria-label={chinese ? "重置缩放" : "Reset zoom"}
            onClick={() => setZoom(100)}
          >
            <RotateCcwIcon />
          </ToolbarButton>
        </Toolbar>
        <output className="text-muted-foreground text-sm" aria-live="polite">
          {chinese ? "缩放" : "Zoom"}: {zoom}%
        </output>
      </div>
    </div>
  );
}
