"use client";
import { CopyButton } from "@workspace/ui/components/copy-button";
import { clipboardLabelsZhCN } from "@workspace/ui/hooks/use-clipboard";
import type { ExampleProps } from "../types";

const command = "bunx --bun shadcn@latest add @sui/copy-button";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex w-full max-w-md items-center gap-2 rounded-xl bg-muted px-3 py-2 font-mono text-sm">
      <span className="min-w-0 flex-1 truncate">{command}</span>
      <CopyButton
        value={command}
        labels={chinese ? clipboardLabelsZhCN : undefined}
      />
    </div>
  );
}
