import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="rounded-xl bg-muted p-1 ring-1 ring-border">
      <div className="rounded-lg bg-background p-4 ring-1 ring-border">
        {zh ? "内容文字" : "Content text"}
      </div>
    </div>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="rounded-xl bg-muted p-1 ring-1 ring-border">
      <div className="rounded-xl bg-background p-4 ring-1 ring-border">
        {zh ? "内容文字" : "Content text"}
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
