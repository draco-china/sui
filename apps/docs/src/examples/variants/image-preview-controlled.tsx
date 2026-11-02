"use client";
import { Button } from "@workspace/ui/components/button";
import { ImagePreview, imageLabelsZhCN } from "@workspace/ui/components/image";
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
      <div className="flex flex-wrap gap-2">
        {images.map((image, imageIndex) => (
          <Button
            key={image}
            variant="outline"
            onClick={() => {
              setIndex(imageIndex);
              setOpen(true);
            }}
          >
            {chinese
              ? `打开第 ${imageIndex + 1} 张`
              : `Open image ${imageIndex + 1}`}
          </Button>
        ))}
      </div>
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {chinese
          ? `选中索引：${index}（从 0 开始）`
          : `Selected index: ${index} (zero-based)`}
      </output>
      <ImagePreview
        images={images}
        open={open}
        onOpenChange={setOpen}
        index={index}
        onIndexChange={setIndex}
        alt={chinese ? "几何图案" : "Geometric pattern"}
        labels={chinese ? imageLabelsZhCN : undefined}
      />
    </div>
  );
}
