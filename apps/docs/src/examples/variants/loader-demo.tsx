import { Loader, loaderVariantNames } from "@workspace/ui/components/loader";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {loaderVariantNames.map((variant) => (
        <div
          key={variant}
          className="flex min-h-24 flex-col items-center justify-center gap-4 rounded-xl border bg-background p-3"
        >
          <Loader
            variant={variant}
            size={32}
            label={zh ? "正在加载" : "Loading"}
          />
          <span className="text-center font-mono text-muted-foreground text-sm">
            {variant}
          </span>
        </div>
      ))}
    </div>
  );
}
