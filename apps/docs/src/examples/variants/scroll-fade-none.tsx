// biome-ignore-all lint/a11y/noNoninteractiveTabindex: These named scroll viewports need keyboard access.
import type { ExampleProps } from "../types";
export default function ScrollFadeNone({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="mx-auto flex min-w-0 max-w-xs flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] ring-1 ring-border">
          <section
            tabIndex={0}
            aria-label={chinese ? "可滚动条目" : "Scrollable items"}
            className="scroll-fade no-scrollbar h-48 overflow-y-auto"
          >
            <ScrollFadeNoneItems locale={locale} />
          </section>
        </div>
        <p className="text-center font-mono text-[0.9em] text-muted-foreground">
          scroll-fade
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] ring-1 ring-border">
          <section
            tabIndex={0}
            aria-label={chinese ? "可滚动条目" : "Scrollable items"}
            className="scroll-fade no-scrollbar scroll-fade-none h-48 overflow-y-auto"
          >
            <ScrollFadeNoneItems locale={locale} />
          </section>
        </div>
        <p className="text-center font-mono text-[0.9em] text-muted-foreground">
          scroll-fade scroll-fade-none
        </p>
      </div>
    </div>
  );
}

function ScrollFadeNoneItems({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex flex-col gap-1.5 p-1.5">
      {Array.from({ length: 8 }, (_, index) => index + 1).map((itemNumber) => (
        <div
          key={itemNumber}
          className="rounded-lg bg-muted px-3 py-2.5 text-sm"
        >
          {chinese ? "条目" : "Item"} {itemNumber}
        </div>
      ))}
    </div>
  );
}
