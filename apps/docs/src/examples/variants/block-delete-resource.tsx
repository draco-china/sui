import { DeleteResource } from "@workspace/ui/blocks/delete-resource";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function DeleteResourceDemo({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        variant="destructive"
        onClick={() => {
          setDeleted(false);
          setOpen(true);
        }}
      >
        {zh ? "删除项目" : "Delete project"}
      </Button>
      <DeleteResource
        open={open}
        onOpenChange={setOpen}
        resourceType="project"
        resourceName="sui-preview"
        onDelete={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          setDeleted(true);
        }}
        labels={
          zh
            ? {
                title: "删除项目？",
                description: "将永久删除 sui-preview，此操作无法撤销。",
                confirmation: "项目名称",
                copy: "复制资源名称",
                copying: "正在复制…",
                copied: "已复制",
                copyFailed: "复制失败，请选择名称手动复制。",
                hint: "输入 sui-preview 确认删除。",
                delete: "删除项目",
                cancel: "取消",
                deleting: "正在删除…",
              }
            : undefined
        }
      />
      {deleted && (
        <p role="status" className="text-muted-foreground text-sm">
          {zh ? "项目已删除" : "Project deleted"}
        </p>
      )}
    </div>
  );
}
