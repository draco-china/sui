import { Card } from "@workspace/ui/components/card";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold text-lg">
        {zh ? "最近请求" : "Recent requests"}
      </h3>
      <Card size="sm" className="px-4">
        {zh ? "请求数据" : "Request data"}
      </Card>
    </div>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <Card size="sm" className="px-4">
      <h3 className="font-semibold text-lg">
        {zh ? "最近请求" : "Recent requests"}
      </h3>
      <Card size="sm" className="px-4">
        {zh ? "请求数据" : "Request data"}
      </Card>
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
