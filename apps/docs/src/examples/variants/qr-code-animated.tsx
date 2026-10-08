"use client";
import { QRCode } from "@workspace/ui/components/qr-code";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <QRCode
      value="https://example.com/"
      animated
      size={220}
      label={chinese ? "动画二维码" : "Animated QR code"}
    />
  );
}
