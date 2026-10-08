import { InfoIcon } from "lucide-react";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="flex items-start gap-2 text-sm leading-6">
      <span className="flex h-lh items-center">
        <InfoIcon className="size-4" aria-hidden="true" />
      </span>
      <p>
        {zh
          ? "这段文字可能会换行，但图标仍应与第一行保持对齐"
          : "Text that may wrap onto multiple lines and still align with the icon."}
      </p>
    </div>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-2 text-sm leading-6">
        <span className="flex items-center">
          <InfoIcon className="size-4" aria-hidden="true" />
        </span>
        <p>
          {zh
            ? "这段文字可能会换行，但图标仍应与第一行保持对齐"
            : "Text that may wrap onto multiple lines and still align with the icon."}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm leading-6">
        <InfoIcon className="size-4" aria-hidden="true" />
        <p>
          {zh
            ? "这段文字可能会换行，但图标仍应与第一行保持对齐"
            : "Text that may wrap onto multiple lines and still align with the icon."}
        </p>
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
