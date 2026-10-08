"use client";

import { Button } from "@workspace/ui/components/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  type InputOTPStatus,
} from "@workspace/ui/components/input-otp";
import { Label } from "@workspace/ui/components/label";
import { useEffect, useId, useRef, useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({
  locale,
  mask = false,
}: ExampleProps & { mask?: boolean }) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<InputOTPStatus>("idle");
  const [result, setResult] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      request.current++;
      clearTimeout(timer.current);
    },
    [],
  );
  function verify(code: string) {
    const run = ++request.current;
    clearTimeout(timer.current);
    setStatus("loading");
    setResult(chinese ? "正在验证" : "Verifying code");
    const verification = new Promise<boolean>((resolve) => {
      timer.current = setTimeout(() => resolve(code === "123456"), 1100);
    });
    void verification.then((valid) => {
      if (request.current !== run) return;
      setStatus(valid ? "success" : "error");
      const messages = chinese
        ? {
            success: "验证成功",
            error: "验证失败，输入已保留，可修改或重新输入",
          }
        : {
            success: "Verified",
            error:
              "Verification failed. Your code is preserved for editing or retry.",
          };
      setResult(messages[valid ? "success" : "error"]);
    });
  }
  return (
    <div className="grid w-full max-w-sm justify-items-center gap-4">
      <p className="text-center text-muted-foreground text-sm">
        {chinese
          ? "输入 123456 查看成功效果，其他六位数字显示失败"
          : "Enter 123456 to succeed; any other six digits show the error feedback."}
      </p>
      <Label htmlFor={id} className="sr-only">
        {chinese ? "验证码" : "Verification code"}
      </Label>
      <InputOTP
        id={id}
        length={6}
        mask={mask}
        value={value}
        onValueChange={(value) => {
          setValue(value);
          setResult("");
        }}
        onValueComplete={verify}
        status={status}
        onStatusChange={setStatus}
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <InputOTPSlot
              key={index}
              ref={index === 0 ? inputRef : undefined}
              className="size-10 text-lg"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <p
        role="status"
        className="min-h-5 text-center text-muted-foreground text-sm"
      >
        {result}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={status === "loading" || status === "error"}
          onClick={() => {
            request.current++;
            clearTimeout(timer.current);
            setValue("");
            setStatus("idle");
            setResult("");
            inputRef.current?.focus();
          }}
        >
          {chinese ? "重新输入" : "Enter again"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={status !== "idle" || value.length !== 6}
          onClick={() => {
            inputRef.current?.focus();
            verify(value);
          }}
        >
          {chinese ? "重试验证" : "Retry verification"}
        </Button>
      </div>
    </div>
  );
}
