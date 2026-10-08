import type { ReactNode } from "react";
import type { ExampleProps } from "./types";

export function DesignComparison({
  locale,
  recommended,
  avoid,
}: ExampleProps & {
  recommended: ReactNode;
  avoid: ReactNode;
}) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full min-w-0 gap-4 md:grid-cols-2">
      <section className="grid min-w-0 content-start gap-4 rounded-xl border border-border bg-background p-4 text-foreground text-sm">
        <h3 className="font-medium text-muted-foreground text-sm">
          {zh ? "推荐" : "Recommended"}
        </h3>
        {recommended}
      </section>
      <section className="grid min-w-0 content-start gap-4 rounded-xl border border-border bg-background p-4 text-foreground text-sm">
        <h3 className="font-medium text-muted-foreground text-sm">
          {zh ? "避免" : "Avoid"}
        </h3>
        {avoid}
      </section>
    </div>
  );
}
