import { DeleteResource } from "@workspace/ui/blocks/delete-resource";
import { Button } from "@workspace/ui/components/button";
import { useRef, useState } from "react";
import type { ExampleProps } from "../types";

export default function DeleteResourceError({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(false);
  const attempts = useRef(0);
  return (
    <>
      <Button
        variant="destructive"
        onClick={() => {
          attempts.current = 0;
          setOpen(true);
        }}
      >
        {zh ? "删除并重试" : "Delete with retry"}
      </Button>
      <DeleteResource
        open={open}
        onOpenChange={setOpen}
        resourceType="worker"
        resourceName="api-gateway"
        onDelete={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          attempts.current += 1;
          if (attempts.current === 1)
            throw new Error(
              zh
                ? "暂时无法删除。请重试。"
                : "Unable to delete right now. Please try again.",
            );
        }}
        labels={
          zh
            ? {
                title: "删除 Worker？",
                description: "将永久删除 api-gateway，此操作无法撤销。",
                confirmation: "Worker 名称",
                copy: "复制资源名称",
                copying: "正在复制…",
                copied: "已复制",
                copyFailed: "复制失败，请选择名称手动复制。",
                hint: "输入 api-gateway 确认删除。",
                delete: "删除 Worker",
                cancel: "取消",
                deleting: "正在删除…",
              }
            : undefined
        }
      />
    </>
  );
}
