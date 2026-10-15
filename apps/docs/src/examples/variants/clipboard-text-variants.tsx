import {
  ClipboardText,
  type ClipboardTextProps,
} from "@workspace/ui/components/clipboard-text";
import type { ExampleProps } from "../types";

const variants: {
  variant: NonNullable<ClipboardTextProps["variant"]>;
  text: string;
}[] = [
  { variant: "default", text: "bun add @workspace/ui" },
  { variant: "outline", text: "https://sui.dev/s/coastline" },
  { variant: "secondary", text: "bun run dev" },
  { variant: "ghost", text: "sk-live-coastline-2026" },
];

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full max-w-md gap-3">
      {variants.map(({ variant, text }) => (
        <div key={variant} className="grid gap-1.5">
          <span className="text-muted-foreground text-xs">{variant}</span>
          <ClipboardText
            variant={variant}
            text={text}
            labels={{
              copy: zh ? "复制" : "Copy",
              copied: zh ? "已复制" : "Copied",
              failed: zh
                ? "复制失败，请手动复制"
                : "Copy failed. Copy manually.",
            }}
          />
        </div>
      ))}
    </div>
  );
}
