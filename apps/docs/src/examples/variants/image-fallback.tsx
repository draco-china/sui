"use client";
import { Image, imageLabelsZhCN } from "@workspace/ui/components/image";
import type { ExampleProps } from "../types";

const photo =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#648493"/><circle cx="160" cy="140" r="90" fill="#ffffff" opacity=".4"/></svg>',
  );

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const labels = chinese ? imageLabelsZhCN : undefined;
  return (
    <div className="flex flex-wrap gap-4">
      <Image
        src={photo}
        alt={chinese ? "可预览" : "Previewable"}
        width={180}
        height={120}
        preview
        labels={labels}
        className="rounded-xl"
      />
      <Image
        src="/missing-photo.png"
        alt={chinese ? "加载失败" : "Failed to load"}
        width={180}
        height={120}
        labels={labels}
        className="rounded-xl"
      />
      <Image
        src="/missing-photo.png"
        alt={chinese ? "自定义占位" : "Custom fallback"}
        width={180}
        height={120}
        fallback={
          <span className="flex size-full items-center justify-center bg-muted font-medium text-muted-foreground text-sm">
            {chinese ? "暂无图片" : "No photo yet"}
          </span>
        }
        className="rounded-xl"
      />
    </div>
  );
}
