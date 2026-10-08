"use client";

import { QRCode } from "@workspace/ui/components/qr-code";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="grid w-full gap-6 sm:grid-cols-3">
      {[0, 16, 24].map((margin) => (
        <div key={margin} className="grid justify-items-center gap-3">
          <QRCode
            value="https://example.com/"
            size={160}
            margin={margin}
            label={chinese ? "示例链接二维码" : "Example link QR code"}
          />
          <span className="text-muted-foreground text-sm">margin={margin}</span>
        </div>
      ))}
    </div>
  );
}
