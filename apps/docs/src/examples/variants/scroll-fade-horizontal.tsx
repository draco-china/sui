// biome-ignore-all lint/a11y/noNoninteractiveTabindex: These named scroll viewports need keyboard access.
import type { ExampleProps } from "../types";

const tags = [
  ["Design", "设计"],
  ["Engineering", "工程"],
  ["Marketing", "市场"],
  ["Product", "产品"],
  ["Research", "研究"],
  ["Sales", "销售"],
  ["Support", "支持"],
  ["Operations", "运营"],
  ["Finance", "财务"],
  ["Legal", "法务"],
  ["People", "人力"],
  ["Security", "安全"],
];

export default function ScrollFadeHorizontal({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="mx-auto w-full max-w-xs overflow-hidden rounded-[14px] ring-1 ring-border">
      <section
        tabIndex={0}
        aria-label={chinese ? "可滚动条目" : "Scrollable items"}
        className="scroll-fade-x no-scrollbar overflow-x-auto"
      >
        <div className="flex w-max gap-1.5 p-1.5">
          {tags.map(([tag, chineseTag]) => (
            <div
              key={chinese ? chineseTag : tag}
              className="shrink-0 rounded-lg bg-muted px-3 py-2.5 text-sm"
            >
              {chinese ? chineseTag : tag}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
