import { Toggle } from "@workspace/ui/components/toggle";
import { ToggleGroup } from "@workspace/ui/components/toggle-group";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarLink,
  ToolbarSeparator,
} from "@workspace/ui/components/toolbar";
import { cn } from "cn";
import {
  BoldIcon,
  ItalicIcon,
  RotateCcwIcon,
  UnderlineIcon,
} from "lucide-react";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function ToolbarDemo({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [formats, setFormats] = useState<string[]>([]);

  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <Toolbar
        aria-label={chinese ? "文字格式工具栏" : "Text formatting toolbar"}
      >
        <ToolbarGroup aria-label={chinese ? "文字格式" : "Text formatting"}>
          <ToggleGroup
            multiple
            value={formats}
            onValueChange={setFormats}
            spacing={1}
          >
            <ToolbarButton
              render={<Toggle />}
              value="bold"
              size="icon"
              aria-label={chinese ? "加粗" : "Bold"}
            >
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton
              render={<Toggle />}
              value="italic"
              size="icon"
              aria-label={chinese ? "斜体" : "Italic"}
            >
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton
              render={<Toggle />}
              value="underline"
              size="icon"
              aria-label={chinese ? "下划线" : "Underline"}
            >
              <UnderlineIcon />
            </ToolbarButton>
          </ToggleGroup>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarButton
          size="icon"
          aria-label={chinese ? "清除格式" : "Reset formatting"}
          onClick={() => setFormats([])}
        >
          <RotateCcwIcon />
        </ToolbarButton>
        <ToolbarLink href={chinese ? "/zh-CN/docs" : "/docs"}>
          {chinese ? "帮助" : "Help"}
        </ToolbarLink>
      </Toolbar>
      <p
        className={cn(
          "text-sm",
          formats.includes("bold") && "font-medium",
          formats.includes("italic") && "italic",
          formats.includes("underline") && "underline",
        )}
      >
        {chinese
          ? "选中文字格式，预览会即时更新"
          : "Choose a text format to update this preview."}
      </p>
    </div>
  );
}
