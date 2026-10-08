// biome-ignore-all lint/a11y/noNoninteractiveTabindex: These named scroll viewports need keyboard access.
import type { ExampleProps } from "../types";

const tags = [
  "تصميم",
  "هندسة",
  "تسويق",
  "منتج",
  "أبحاث",
  "مبيعات",
  "دعم",
  "عمليات",
  "مالية",
  "قانوني",
];
export default function ScrollFadeRtl({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div
      className="mx-auto w-full max-w-xs overflow-hidden rounded-[14px] ring-1 ring-border"
      dir="rtl"
    >
      <section
        tabIndex={0}
        aria-label={chinese ? "从右到左滚动" : "Right-to-left scrolling"}
        className="scroll-fade-x no-scrollbar overflow-x-auto"
      >
        <div className="flex w-max gap-1.5 p-1.5">
          {tags.map((tag) => (
            <div
              key={tag}
              className="shrink-0 rounded-lg bg-muted px-3 py-2.5 text-sm"
            >
              {tag}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
