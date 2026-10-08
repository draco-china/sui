import { Loader } from "@workspace/ui/components/loader";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid gap-6 text-primary">
      {(["spinner", "dash-ring"] as const).map((variant) => (
        <div key={variant} className="grid gap-3">
          <span className="font-mono text-muted-foreground text-sm">
            {variant}
          </span>
          <div className="flex items-center gap-6">
            {(["sm", "default", "lg", 40] as const).map((size) => (
              <div key={size} className="grid justify-items-center gap-3">
                <Loader
                  variant={variant}
                  size={size}
                  label={zh ? "正在加载" : "Loading"}
                />
                <span className="font-mono text-muted-foreground text-sm">
                  {typeof size === "number" ? `${size}px` : size}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center gap-10">
        {[0.6, 2].map((speed) => (
          <div key={speed} className="grid justify-items-center gap-3">
            <Loader
              variant="dots"
              size={28}
              speed={speed}
              label={zh ? "正在加载" : "Loading"}
            />
            <span className="text-muted-foreground text-sm">{speed}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
