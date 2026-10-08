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
  const zh = locale === "zh-CN";
  const [radius, setRadius] = useState(10);
  return (
    <div
      className="w-full space-y-4"
      style={{ "--radius": `${radius}px` } as CSSProperties}
    >
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-2 text-sm">
          {zh ? "基准圆角" : "Base radius"}
        </legend>
        {[0, 4, 10, 16].map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={radius === value ? "default" : "outline"}
            aria-pressed={radius === value}
            onClick={() => setRadius(value)}
          >
            {value}px
          </Button>
        ))}
      </fieldset>
      <DesignComparison
        locale={locale}
        recommended={<RecommendedSample locale={locale} />}
        avoid={<AvoidSample locale={locale} />}
      />
    </div>
  );
}

import { Button } from "@workspace/ui/components/button";
import { type CSSProperties, useState } from "react";
