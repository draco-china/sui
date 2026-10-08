import { ClipboardText } from "@workspace/ui/components/clipboard-text";
import { Switch } from "@workspace/ui/components/switch";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [enabled, setEnabled] = useState(true);
  const [notice, setNotice] = useState("");
  const id = useId();
  return (
    <div className="grid w-full max-w-md gap-4">
      <div className="flex items-center gap-2">
        <Switch id={id} checked={enabled} onCheckedChange={setEnabled} />
        <label htmlFor={id}>{zh ? "允许复制" : "Enable copying"}</label>
      </div>
      <ClipboardText
        text="workspace_72c31"
        disabled={!enabled}
        onCopy={() =>
          setNotice(zh ? "工作区 ID 已复制" : "Workspace ID copied.")
        }
        onCopyError={() =>
          setNotice(
            zh
              ? "浏览器无法访问剪贴板，请选择文本后手动复制"
              : "Clipboard access failed. Select the text and copy it manually.",
          )
        }
        labels={{
          copy: zh ? "复制工作区 ID" : "Copy workspace ID",
          copied: zh ? "已复制" : "Copied",
          failed: zh
            ? "无法复制，请手动复制"
            : "Copy unavailable. Copy manually.",
        }}
      />
      <p className="min-h-5 text-muted-foreground text-sm" role="status">
        {notice}
      </p>
    </div>
  );
}
