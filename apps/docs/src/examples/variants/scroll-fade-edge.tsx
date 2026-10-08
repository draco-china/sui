// biome-ignore-all lint/a11y/noNoninteractiveTabindex: These named scroll viewports need keyboard access.
import type { ExampleProps } from "../types";

const items = [
  ["Inbox triage", "收件箱整理"],
  ["Design review", "设计评审"],
  ["API contract", "API 约定"],
  ["QA pass", "质量检查"],
  ["Launch notes", "发布说明"],
  ["Metrics follow-up", "指标回顾"],
];

const tags = [
  ["Design", "设计"],
  ["Engineering", "工程"],
  ["Marketing", "市场"],
  ["Product", "产品"],
  ["Research", "研究"],
  ["Sales", "销售"],
  ["Support", "支持"],
  ["Operations", "运营"],
];

export default function ScrollFadeEdge({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  return (
    <div className="mx-auto flex min-w-0 max-w-xs flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] ring-1 ring-border">
          <section
            tabIndex={0}
            aria-label={chinese ? "可滚动条目" : "Scrollable items"}
            className="scroll-fade-t no-scrollbar h-36 overflow-y-auto"
          >
            <ScrollFadeEdgeItems locale={locale} />
          </section>
        </div>
        <p className="text-center font-mono text-[0.9em] text-muted-foreground">
          scroll-fade-t
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] ring-1 ring-border">
          <section
            tabIndex={0}
            aria-label={chinese ? "可滚动条目" : "Scrollable items"}
            className="scroll-fade-b no-scrollbar h-36 overflow-y-auto"
          >
            <ScrollFadeEdgeItems locale={locale} />
          </section>
        </div>
        <p className="text-center font-mono text-[0.9em] text-muted-foreground">
          scroll-fade-b
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] ring-1 ring-border">
          <section
            tabIndex={0}
            aria-label={chinese ? "可滚动条目" : "Scrollable items"}
            className="scroll-fade-s no-scrollbar overflow-x-auto"
          >
            <ScrollFadeEdgeTags locale={locale} />
          </section>
        </div>
        <p className="text-center font-mono text-[0.9em] text-muted-foreground">
          scroll-fade-s
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] ring-1 ring-border">
          <section
            tabIndex={0}
            aria-label={chinese ? "可滚动条目" : "Scrollable items"}
            className="scroll-fade-e no-scrollbar overflow-x-auto"
          >
            <ScrollFadeEdgeTags locale={locale} />
          </section>
        </div>
        <p className="text-center font-mono text-[0.9em] text-muted-foreground">
          scroll-fade-e
        </p>
      </div>
    </div>
  );
}

function ScrollFadeEdgeItems({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex flex-col gap-1.5 p-1.5">
      {items.map(([item, chineseItem]) => (
        <div
          key={chinese ? chineseItem : item}
          className="rounded-lg bg-muted px-3 py-2.5 text-sm"
        >
          {chinese ? chineseItem : item}
        </div>
      ))}
    </div>
  );
}

function ScrollFadeEdgeTags({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
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
  );
}
