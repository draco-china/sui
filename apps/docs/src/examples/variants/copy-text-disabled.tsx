import { CopyText } from "@workspace/ui/components/copy-text";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full max-w-xs gap-4">
      <CopyText size="sm" labels={{ copy: zh ? "复制路径" : "Copy path" }}>
        packages/ui/src/components/copy-text.tsx
      </CopyText>
      <CopyText disabled>{zh ? "暂不可复制" : "Copying unavailable"}</CopyText>
    </div>
  );
}
