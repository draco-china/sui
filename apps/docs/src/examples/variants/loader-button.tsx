import { Button } from "@workspace/ui/components/button";
import { Loader } from "@workspace/ui/components/loader";
import { useEffect, useRef, useState } from "react";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        saving: "正在保存…",
        save: "保存设置",
        saved: "预览设置已保存",
      }
    : {
        saving: "Saving…",
        save: "Save settings",
        saved: "Preview settings saved.",
      };
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="grid justify-items-center gap-3">
      <Button
        disabled={loading}
        onClick={() => {
          setLoading(true);
          setSaved(false);
          timer.current = setTimeout(() => {
            setLoading(false);
            setSaved(true);
          }, 1200);
        }}
      >
        {loading ? (
          <Loader
            size="sm"
            variant="spinner"
            label={zh ? "正在保存" : "Saving"}
          />
        ) : null}
        {loading ? stateLabels.saving : stateLabels.save}
      </Button>
      <span role="status" className="min-h-5 text-muted-foreground text-sm">
        {saved ? stateLabels.saved : ""}
      </span>
    </div>
  );
}
