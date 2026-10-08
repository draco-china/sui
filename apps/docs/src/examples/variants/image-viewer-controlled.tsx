"use client";
import { Button } from "@workspace/ui/components/button";
import { ImageViewer } from "@workspace/ui/components/image-viewer";
import { useState } from "react";
import type { ExampleProps } from "../types";

const colors = ["#70866A", "#648493", "#BC6C73"];
const images = colors.map(
  (color, index) =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="${color}"/><circle cx="${240 + index * 100}" cy="240" r="180" fill="#ffffff" opacity=".4"/><path d="M0 560L960 180" stroke="#ffffff" stroke-width="40" opacity=".6"/><text x="60" y="600" font-family="sans-serif" font-size="56" fill="white">SUI ${index + 1}</text></svg>`,
    ),
);
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  return (
    <div className="grid w-full gap-4">
      <div className="grid grid-cols-3 gap-3">
        {images.map((image, imageIndex) => (
          <Button
            key={image}
            variant="ghost"
            type="button"
            className="h-auto w-full overflow-hidden rounded-xl p-0"
            aria-label={
              chinese
                ? `查看几何图案 ${imageIndex + 1}`
                : `View geometric pattern ${imageIndex + 1}`
            }
            onClick={() => {
              setIndex(imageIndex);
              setOpen(true);
            }}
          >
            <img
              src={image}
              alt={
                chinese
                  ? `几何图案 ${imageIndex + 1}`
                  : `Geometric pattern ${imageIndex + 1}`
              }
              className="aspect-[3/2] w-full object-cover"
            />
          </Button>
        ))}
      </div>
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {chinese
          ? `选中索引：${index}（从 0 开始）`
          : `Selected index: ${index} (zero-based)`}
      </output>
      <ImageViewer
        images={images}
        open={open}
        onClose={() => setOpen(false)}
        index={index}
        onIndexChange={setIndex}
        alt={chinese ? "几何图案" : "Geometric pattern"}
        labels={
          chinese
            ? {
                defaultAlt: "图片",
                loading: "正在加载图片",
                error: "无法加载图片",
                retry: "重试",
                viewer: "图片查看器",
                zoomOut: "缩小",
                zoomIn: "放大",
                rotateCounterclockwise: "逆时针旋转",
                rotateClockwise: "顺时针旋转",
                reset: "重置图片",
                close: "关闭图片查看器",
                previous: "上一张",
                next: "下一张",
                imageAlt: (alt, index) => `${alt} ${index}`,
                open: (alt, index) => `打开${alt} ${index}`,
                thumbnail: (alt, index) => `${alt}缩略图 ${index}`,
                position: (index, total) => `第 ${index} 张，共 ${total} 张`,
              }
            : undefined
        }
      />
    </div>
  );
}
