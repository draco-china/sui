import { Card } from "@workspace/ui/components/card";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return <Card className="px-5 py-4">{zh ? "内容文字" : "Content text"}</Card>;
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return <Card className="p-5">{zh ? "内容文字" : "Content text"}</Card>;
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
