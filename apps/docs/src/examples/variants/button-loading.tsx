"use client";

import { Button } from "@workspace/ui/components/button";
import { Loader } from "@workspace/ui/components/loader";
import { useEffect, useRef, useState } from "react";
import type { ExampleProps } from "../types";

export default function ButtonLoading({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        generating: "正在生成",
        generate: "生成",
        downloading: "正在下载",
        download: "下载",
        done: "演示完成，可以再次点击",
        idle: "点击按钮模拟加载状态",
      }
    : {
        generating: "Generating",
        generate: "Generate",
        downloading: "Downloading",
        download: "Download",
        done: "Demo complete. Try it again.",
        idle: "Click a button to simulate loading.",
      };
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = status === "pending";

  useEffect(() => () => clearTimeout(timer.current), []);

  function startDemo() {
    clearTimeout(timer.current);
    setStatus("pending");
    // Replace this delay with your application's async operation.
    timer.current = setTimeout(() => setStatus("done"), 1200);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={startDemo}>
          {pending && <Loader size="sm" data-icon="inline-start" />}
          {pending ? stateLabels.generating : stateLabels.generate}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={startDemo}>
          {pending ? stateLabels.downloading : stateLabels.download}
          {pending && <Loader size="sm" data-icon="inline-end" />}
        </Button>
      </div>
      <p role="status" className="text-muted-foreground text-sm">
        {status === "done" ? stateLabels.done : stateLabels.idle}
      </p>
    </div>
  );
}
