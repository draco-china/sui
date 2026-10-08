"use client";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { QRCode } from "@workspace/ui/components/qr-code";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const [value, setValue] = useState("https://example.com/");
  return (
    <div className="grid w-full gap-4 sm:grid-cols-[1fr_auto]">
      <div className="grid content-start gap-2">
        <Label htmlFor={id}>{chinese ? "编码内容" : "Content to encode"}</Label>
        <Input
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="text-muted-foreground text-sm">
          {chinese
            ? "编辑内容后二维码会更新。空值显示占位内容"
            : "Edit the content to regenerate the code. An empty value shows a placeholder."}
        </p>
      </div>
      <QRCode
        value={value}
        size={180}
        label={
          chinese ? "当前输入内容的二维码" : "QR code for the current input"
        }
      />
    </div>
  );
}
