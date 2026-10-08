import type { ExampleProps } from "../types";
export default function ShimmerRtl({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="mx-auto grid w-full max-w-lg gap-6 text-center text-muted-foreground text-sm sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p dir="ltr" className="shimmer">
          {chinese ? "正在生成回复…" : "Generating response…"}
        </p>
        <p className="font-mono text-[0.9em]">dir=&quot;ltr&quot;</p>
      </div>
      <div className="flex flex-col gap-3">
        <p dir="rtl" className="shimmer">
          جارٍ إنشاء الرد&hellip;
        </p>
        <p className="font-mono text-[0.9em]">dir=&quot;rtl&quot;</p>
      </div>
    </div>
  );
}
