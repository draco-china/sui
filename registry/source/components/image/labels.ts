/** English defaults. Pass overrides or `imageLabelsZhCN` through `labels`. */
export const imageLabels = {
  defaultAlt: "Image",
  viewer: "Image viewer",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  rotateCounterclockwise: "Rotate counterclockwise",
  rotateClockwise: "Rotate clockwise",
  reset: "Reset image",
  close: "Close image viewer",
  previous: "Previous image",
  next: "Next image",
  loading: "Loading image…",
  error: "Unable to load image",
  retry: "Retry",
  preview: (alt: string) => `Preview ${alt}`,
  imageAlt: (alt: string, index: number) => `${alt} ${index}`,
  open: (alt: string, index: number) => `Open ${alt} ${index}`,
  thumbnail: (alt: string, index: number) => `${alt} thumbnail ${index}`,
  position: (index: number, total: number) => `Image ${index} of ${total}`,
};

export type ImageLabels = typeof imageLabels;
export type ImageLabelOverrides = Partial<ImageLabels>;

export const imageLabelsZhCN: ImageLabelOverrides = {
  defaultAlt: "图片",
  viewer: "图片查看器",
  zoomOut: "缩小",
  zoomIn: "放大",
  rotateCounterclockwise: "逆时针旋转",
  rotateClockwise: "顺时针旋转",
  reset: "重置图片",
  close: "关闭图片查看器",
  previous: "上一张",
  next: "下一张",
  loading: "正在加载图片…",
  error: "图片加载失败",
  retry: "重试",
  preview: (alt) => `预览${alt}`,
  imageAlt: (alt, index) => `${alt} ${index}`,
  open: (alt, index) => `打开${alt} ${index}`,
  thumbnail: (alt, index) => `${alt}缩略图 ${index}`,
  position: (index, total) => `第 ${index} 张，共 ${total} 张`,
};
