"use client";

import { GlassProvider } from "@workspace/ui/components/glass";
import { QRCode } from "@workspace/ui/components/qr-code";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const defaultLabel = chinese ? "默认" : "Default";
  return (
    <GlassProvider mode="css" intensity="sm">
      <div className="grid w-full gap-6 rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--background)_45%,var(--primary))] p-8 sm:grid-cols-2">
        {[false, true].map((glass) => (
          <div key={String(glass)} className="grid justify-items-center gap-3">
            <QRCode
              value="https://example.com/"
              size={200}
              glass={glass}
              label={chinese ? "示例链接二维码" : "Example link QR code"}
            />
            <span className="text-sm">{glass ? "glass" : defaultLabel}</span>
          </div>
        ))}
      </div>
    </GlassProvider>
  );
}
