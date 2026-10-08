import { Button } from "@workspace/ui/components/button";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <Button variant="ghost" className="hover:bg-muted">
      {zh ? "悬停查看" : "Hover me"}
    </Button>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <Button
      variant="ghost"
      className="transition-colors duration-300 hover:bg-muted"
    >
      {zh ? "悬停查看" : "Hover me"}
    </Button>
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
