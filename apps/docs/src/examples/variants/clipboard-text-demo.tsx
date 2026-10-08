import { ClipboardText } from "@workspace/ui/components/clipboard-text";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="w-full max-w-md">
      <ClipboardText
        text="bun add @workspace/ui"
        labels={{
          copy: zh ? "复制安装命令" : "Copy install command",
          copied: zh ? "已复制" : "Copied",
          failed: zh ? "复制失败，请手动复制" : "Copy failed. Copy manually.",
        }}
      />
    </div>
  );
}
