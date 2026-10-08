import type { ExampleProps } from "../types";
export default function ShimmerColor({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
      <p className="shimmer shimmer-color-blue-500/60">
        {chinese ? "正在生成回复…" : "Generating response…"}
      </p>
      <p className="shimmer shimmer-color-[#378ADD]">
        {chinese ? "正在生成回复…" : "Generating response…"}
      </p>
    </div>
  );
}
