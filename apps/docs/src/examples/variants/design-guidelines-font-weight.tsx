import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <>
      <h3 className="font-semibold text-lg">
        {zh ? "账户设置" : "Account settings"}
      </h3>
      <strong className="font-medium text-sm">
        {zh ? "必填" : "required"}
      </strong>
    </>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <>
      <h3 className="font-bold text-lg">
        {zh ? "账户设置" : "Account settings"}
      </h3>
      <strong className="font-bold text-sm">{zh ? "必填" : "required"}</strong>
    </>
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
