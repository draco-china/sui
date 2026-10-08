import { ClipboardText } from "@workspace/ui/components/clipboard-text";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full max-w-md gap-3">
      <ClipboardText
        text="/api/components"
        textToCopy="https://api.example.com/v1/components"
        size="sm"
        labels={{ copy: zh ? "复制完整 API 地址" : "Copy full API URL" }}
      />
      <ClipboardText
        text="https://api.example.com/v1/components?workspace=design-system&include=properties"
        size="lg"
        labels={{ copy: zh ? "复制地址" : "Copy URL" }}
      />
      <p className="text-muted-foreground text-sm">
        {zh
          ? "显示简短路径，复制完整地址；长文本可选择或悬停查看"
          : "Show a short path while copying the full URL. Long text can be selected or inspected on hover."}
      </p>
    </div>
  );
}
