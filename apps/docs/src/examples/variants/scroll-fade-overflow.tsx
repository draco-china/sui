// biome-ignore-all lint/a11y/noNoninteractiveTabindex: These named scroll viewports need keyboard access.
import type { ExampleProps } from "../types";
export default function ScrollFadeOverflow({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="mx-auto w-full max-w-xs overflow-hidden rounded-[14px] ring-1 ring-border">
      <section
        tabIndex={0}
        aria-label={chinese ? "可滚动条目" : "Scrollable items"}
        className="scroll-fade no-scrollbar overflow-y-auto"
      >
        <div className="flex flex-col gap-1.5 p-1.5">
          {Array.from({ length: 3 }, (_, index) => index + 1).map(
            (itemNumber) => (
              <div
                key={itemNumber}
                className="rounded-lg bg-muted px-3 py-2.5 text-sm"
              >
                {chinese ? "条目" : "Item"} {itemNumber}
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
