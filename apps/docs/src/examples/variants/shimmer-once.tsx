import { Button } from "@workspace/ui/components/button";
import * as React from "react";
import type { ExampleProps } from "../types";

export default function ShimmerOnce({ locale }: ExampleProps = {}) {
  const chinese = locale === "zh-CN";
  const [key, setKey] = React.useState(0);

  return (
    <div className="flex flex-col items-center gap-4">
      <p
        key={key}
        className="shimmer shimmer-duration-1100 shimmer-once text-muted-foreground text-sm"
      >
        {chinese ? "正在生成回复…" : "Generating response…"}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setKey((value) => value + 1)}
      >
        {chinese ? "重播" : "Replay"}
      </Button>
    </div>
  );
}
