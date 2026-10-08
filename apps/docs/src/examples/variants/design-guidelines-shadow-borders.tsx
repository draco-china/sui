import { Card } from "@workspace/ui/components/card";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <Card className="px-4 shadow-md ring-1 ring-border">
      {zh ? "内容文字" : "Content text"}
    </Card>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <Card className="border border-border px-4 shadow-md ring-0">
      {zh ? "内容文字" : "Content text"}
    </Card>
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
