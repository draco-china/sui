"use client";
import { QRCode } from "@workspace/ui/components/qr-code";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="grid w-full gap-4 sm:grid-cols-3">
      <div className="grid content-start justify-items-center gap-3">
        <span className="text-sm">
          {chinese ? "基础二维码" : "Basic QR code"}
        </span>
        <QRCode
          value="SUI"
          size={144}
          label={chinese ? "包含 SUI 文字的二维码" : "QR code containing SUI"}
        />
      </div>
      <div className="grid content-start justify-items-center gap-3">
        <span className="text-sm">{chinese ? "加载中" : "Loading"}</span>
        <QRCode value="SUI" loading size={144} />
      </div>
      <div className="grid content-start justify-items-center gap-3">
        <span className="text-sm">{chinese ? "尚无内容" : "No content"}</span>
        <QRCode
          size={144}
          label={chinese ? "尚无二维码内容" : "No QR code content yet"}
        />
      </div>
    </div>
  );
}
