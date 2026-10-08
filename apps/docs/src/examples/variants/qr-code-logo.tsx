"use client";
import { QRCode } from "@workspace/ui/components/qr-code";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <QRCode
      value="https://example.com/"
      size={220}
      label={chinese ? "示例链接二维码" : "Example link QR code"}
      logo={
        <span
          className="grid size-7 place-items-center rounded-md bg-black text-white text-xs"
          aria-hidden="true"
        >
          S
        </span>
      }
    />
  );
}
