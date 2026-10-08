import { Button } from "@workspace/ui/components/button";
import { NavigationProgress } from "@workspace/ui/components/navigation-progress";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function NavigationProgressDemo({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        navigating: "页面切换中…",
        ready: "页面已就绪",
      }
    : {
        navigating: "Navigating…",
        ready: "Page ready",
      };
  const [active, setActive] = useState(false);
  return (
    <div className="relative flex w-full max-w-md flex-col gap-4 overflow-hidden rounded-2xl border p-6">
      <NavigationProgress
        active={active}
        position="absolute"
        label={zh ? "正在加载页面" : "Loading page"}
      />
      <p className="text-muted-foreground text-sm" role="status">
        {active ? stateLabels.navigating : stateLabels.ready}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => setActive(true)} disabled={active}>
          {zh ? "开始导航" : "Start navigation"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setActive(false)}
          disabled={!active}
        >
          {zh ? "完成" : "Complete"}
        </Button>
      </div>
    </div>
  );
}
