import type { ExampleProps } from "../types";
export default function ShimmerNone({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
      <p className="shimmer md:shimmer-none">
        {chinese ? "正在生成回复…" : "Generating response…"}
      </p>
      <p className="font-mono text-[0.9em]">shimmer md:shimmer-none</p>
    </div>
  );
}
