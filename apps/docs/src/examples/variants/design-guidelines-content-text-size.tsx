import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return <p className="text-sm">{zh ? "内容文字" : "Content text"}</p>;
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return <p className="text-base">{zh ? "内容文字" : "Content text"}</p>;
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
