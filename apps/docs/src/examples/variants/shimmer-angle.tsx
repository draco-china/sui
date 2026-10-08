import type { ExampleProps } from "../types";
export default function ShimmerAngle({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="mx-auto grid w-full max-w-lg gap-6 text-center text-muted-foreground text-sm sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className="shimmer">
          {chinese ? "正在生成回复…" : "Generating response…"}
        </p>
        <p className="font-mono text-[0.9em]">shimmer</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="shimmer shimmer-angle-45">
          {chinese ? "正在生成回复…" : "Generating response…"}
        </p>
        <p className="font-mono text-[0.9em]">shimmer-angle-45</p>
      </div>
    </div>
  );
}
