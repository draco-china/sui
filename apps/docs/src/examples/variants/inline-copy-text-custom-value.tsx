import { InlineCopyText } from "@workspace/ui/components/inline-copy-text";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full max-w-xl gap-3 text-sm">
      <div className="group flex min-w-0 items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground">
        <span className="min-w-0 truncate">
          {zh ? "工作区路径" : "Workspace path"}
        </span>
        <InlineCopyText
          value="/workspace/projects/sui/packages/ui/src/components"
          variant="muted"
          className="max-w-[60%]"
          labels={{
            copy: zh ? "复制完整路径" : "Copy full path",
            copied: zh ? "完整路径已复制" : "Full path copied",
            failed: zh ? "无法复制，请手动复制" : "Copy failed. Copy manually.",
          }}
        >
          <span>packages/ui/…</span>
        </InlineCopyText>
      </div>
      <p className="text-muted-foreground text-sm">
        {zh
          ? "悬停整行或用键盘聚焦即可显示图标；value 指定完整复制值"
          : "Hover the row or focus the control to reveal its icon. The value prop supplies the full path."}
      </p>
    </div>
  );
}
