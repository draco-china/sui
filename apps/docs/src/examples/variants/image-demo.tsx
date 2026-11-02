"use client";
import {
  Image,
  ImageGroup,
  imageLabelsZhCN,
} from "@workspace/ui/components/image";
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
  const labels = chinese ? imageLabelsZhCN : undefined;
  return (
    <ImageGroup labels={labels}>
      <div className="grid w-full grid-cols-3 gap-3">
        {images.map((image, index) => (
          <Image
            key={image}
            src={image}
            alt={
              chinese ? `示例图案 ${index + 1}` : `Example pattern ${index + 1}`
            }
            labels={labels}
            className="aspect-3/2 w-full rounded-xl"
          />
        ))}
      </div>
    </ImageGroup>
  );
}
