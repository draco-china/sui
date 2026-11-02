import { CopyText } from "@workspace/ui/components/copy-text";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <p className="text-sm">
      {zh ? "在终端运行 " : "Run "}
      <CopyText
        labels={{
          copy: zh ? "复制命令" : "Copy command",
          copied: zh ? "已复制" : "Copied",
          copyFailed: zh
            ? "无法复制，请手动复制"
            : "Copy failed. Copy manually.",
        }}
      >
        bun run dev
      </CopyText>
      {zh
        ? " 启动开发服务"
        : " in your terminal to start the development server."}
    </p>
  );
}
