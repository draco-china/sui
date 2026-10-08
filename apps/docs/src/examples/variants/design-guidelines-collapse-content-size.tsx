"use client";

import { Button } from "@workspace/ui/components/button";
import { useReducedMotion } from "@workspace/ui/hooks/use-reduced-motion";
import { motion } from "motion/react";
import { useState } from "react";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(true);
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-4">
      <Button variant="outline" onClick={() => setOpen(!open)}>
        {zh ? "切换面板" : "Toggle panel"}
      </Button>
      <motion.div
        initial={false}
        animate={{ width: open ? 256 : 0 }}
        transition={{ duration: reduce ? 0 : 0.4 }}
        className="max-w-full overflow-hidden"
      >
        <div className="w-64 rounded-xl bg-muted p-3 text-sm">
          {zh
            ? "面板关闭时，这段文字应保持相同的换行，不要在动画过程中重新排版"
            : "Text should keep the same line breaks while this panel closes."}
        </div>
      </motion.div>
    </div>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(true);
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-4">
      <Button variant="outline" onClick={() => setOpen(!open)}>
        {zh ? "切换面板" : "Toggle panel"}
      </Button>
      <motion.div
        initial={false}
        animate={{ width: open ? 256 : 0 }}
        transition={{ duration: reduce ? 0 : 0.4 }}
        className="max-w-full overflow-hidden"
      >
        <div className="w-full min-w-0 rounded-xl bg-muted p-3 text-sm">
          {zh
            ? "面板关闭时，这段文字应保持相同的换行，不要在动画过程中重新排版"
            : "Text should keep the same line breaks while this panel closes."}
        </div>
      </motion.div>
    </div>
  );
}

export default function Example({ locale }: ExampleProps) {
  return (
    <DesignComparison
      locale={locale}
      recommended={<RecommendedSample locale={locale} />}
      avoid={<AvoidSample locale={locale} />}
    />
  );
}
