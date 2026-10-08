import type { ExampleProps } from "../types";
export default function ShimmerDemo({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <p className="shimmer text-muted-foreground text-sm">
      {chinese ? "正在生成回复…" : "Generating response…"}
    </p>
  );
}
