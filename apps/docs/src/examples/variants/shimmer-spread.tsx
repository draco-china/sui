import type { ExampleProps } from "../types";
export default function ShimmerSpread({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="mx-auto grid w-full max-w-lg gap-6 text-center text-muted-foreground text-sm sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className="shimmer shimmer-spread-4">
          {chinese ? "正在生成回复…" : "Generating response…"}
        </p>
        <p className="font-mono text-[0.9em]">shimmer-spread-4</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="shimmer shimmer-spread-24">
          {chinese ? "正在生成回复…" : "Generating response…"}
        </p>
        <p className="font-mono text-[0.9em]">shimmer-spread-24</p>
      </div>
    </div>
  );
}
