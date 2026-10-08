import { DeleteResource } from "@workspace/ui/blocks/delete-resource";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function DeleteResourceInsensitive({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        {zh ? "删除域名" : "Delete domain"}
      </Button>
      <DeleteResource
        open={open}
        onOpenChange={setOpen}
        resourceType="domain"
        resourceName="Example.com"
        caseSensitive={false}
        onDelete={() => {}}
        labels={
          zh
            ? {
                title: "删除域名？",
                description: "将永久删除 Example.com，此操作无法撤销。",
                confirmation: "域名",
                copy: "复制资源名称",
                copying: "正在复制…",
                copied: "已复制",
                copyFailed: "复制失败，请选择名称手动复制。",
                hint: "输入 Example.com 确认，不区分大小写。",
                delete: "删除域名",
                cancel: "取消",
              }
            : { hint: "Type Example.com to confirm (case insensitive)." }
        }
      />
    </>
  );
}
