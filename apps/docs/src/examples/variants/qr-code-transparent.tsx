"use client";
import { QRCode } from "@workspace/ui/components/qr-code";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="rounded-3xl bg-primary p-4 text-primary-foreground">
        <QRCode
          background={false}
          value="https://example.com/"
          size={180}
          className="text-primary-foreground"
          label={chinese ? "强调色上的二维码" : "QR code on the accent color"}
        />
      </div>
      <div className="rounded-3xl bg-muted p-4">
        <QRCode
          background={false}
          value="https://example.com/"
          size={180}
          label={
            chinese ? "带标志的透明二维码" : "Transparent QR code with a logo"
          }
          logo={
            <span
              className="grid size-7 place-items-center rounded-md bg-foreground text-background text-xs"
              aria-hidden="true"
            >
              S
            </span>
          }
        />
      </div>
    </div>
  );
}
