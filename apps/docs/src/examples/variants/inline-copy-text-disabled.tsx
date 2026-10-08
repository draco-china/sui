import { InlineCopyText } from "@workspace/ui/components/inline-copy-text";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full max-w-xs gap-4">
      <InlineCopyText
        size="sm"
        labels={{ copy: zh ? "复制路径" : "Copy path" }}
      >
        packages/ui/src/components/inline-copy-text.tsx
      </InlineCopyText>
      <InlineCopyText disabled>
        {zh ? "暂不可复制" : "Copying unavailable"}
      </InlineCopyText>
    </div>
  );
}
