"use client";
import { TooltipButton } from "@workspace/ui/components/tooltip-button";
import { Bold, Italic, Underline } from "lucide-react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex gap-1">
      <TooltipButton
        variant="ghost"
        size="icon-sm"
        tooltip={chinese ? "加粗" : "Bold"}
      >
        <Bold />
      </TooltipButton>
      <TooltipButton
        variant="ghost"
        size="icon-sm"
        tooltip={chinese ? "斜体" : "Italic"}
      >
        <Italic />
      </TooltipButton>
      <TooltipButton
        variant="ghost"
        size="icon-sm"
        tooltip={chinese ? "下划线" : "Underline"}
      >
        <Underline />
      </TooltipButton>
    </div>
  );
}
