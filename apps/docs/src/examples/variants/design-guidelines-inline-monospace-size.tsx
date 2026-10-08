import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <p className="text-sm">
      {zh ? "编辑 " : "Edit "}
      <code className="font-mono text-[0.9em]">config.ts</code>
      {zh ? " 后继续" : " to continue."}
    </p>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <p className="text-sm">
      {zh ? "编辑 " : "Edit "}
      <code className="font-mono">config.ts</code>
      {zh ? " 后继续" : " to continue."}
    </p>
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
