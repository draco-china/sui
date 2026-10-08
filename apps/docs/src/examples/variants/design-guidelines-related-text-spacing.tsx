import { Button } from "@workspace/ui/components/button";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h3 className="font-semibold text-lg">
          {zh ? "网站分析" : "Web analytics"}
        </h3>
        <p className="text-sm">
          {zh
            ? "无需修改代码即可衡量网站访问量"
            : "Measure site traffic without changing your code."}
        </p>
      </div>
      <Button>{zh ? "配置" : "Configure"}</Button>
    </div>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid gap-4">
      <h3 className="font-semibold text-lg">
        {zh ? "网站分析" : "Web analytics"}
      </h3>
      <p className="text-sm">
        {zh
          ? "无需修改代码即可衡量网站访问量"
          : "Measure site traffic without changing your code."}
      </p>
      <Button>{zh ? "配置" : "Configure"}</Button>
    </div>
  );
}

export default function Example({ locale }: ExampleProps) {
  return (
    <DesignComparison
      locale={locale}
      recommended={<RecommendedSample locale={locale} />}
      avoid={<AvoidSample locale={locale} />}
    />
  );
}
