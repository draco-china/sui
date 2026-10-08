import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="h-40 overflow-y-auto rounded-xl bg-muted">
      <div className="sticky top-0 border-border border-b bg-background px-3 py-2">
        {zh ? "最近请求" : "Recent requests"}
      </div>
      <div className="grid gap-4 p-3">
        {Array.from({ length: 8 }, (_, index) => ({
          id: `request-${index + 1}`,
          number: index + 1,
        })).map((request) => (
          <p key={request.id}>
            {zh ? "请求" : "Request"} {request.number}
          </p>
        ))}
      </div>
    </div>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="h-40 overflow-y-auto rounded-xl bg-muted">
      <div className="sticky top-0 bg-background px-3 py-2">
        {zh ? "最近请求" : "Recent requests"}
      </div>
      <div className="grid gap-4 p-3">
        {Array.from({ length: 8 }, (_, index) => ({
          id: `request-${index + 1}`,
          number: index + 1,
        })).map((request) => (
          <p key={request.id}>
            {zh ? "请求" : "Request"} {request.number}
          </p>
        ))}
      </div>
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
