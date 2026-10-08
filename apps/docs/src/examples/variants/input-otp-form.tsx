"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { RefreshCwIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { ExampleProps } from "../types";

export function InputOTPForm({ locale }: ExampleProps) {
  const id = useId();
  const chinese = locale === "zh-CN";
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const firstInput = useRef<HTMLInputElement>(null);

  return (
    <form
      className="mx-auto w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        const code = new FormData(event.currentTarget).get("verification-code");
        setSubmitted(String(code ?? ""));
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{chinese ? "验证登录" : "Verify your login"}</CardTitle>
          <CardDescription>
            {chinese
              ? "输入发送至以下邮箱的验证码："
              : "Enter the verification code sent to your email address: "}
            <span className="font-medium">m@example.com</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={id}>
                {chinese ? "验证码" : "Verification code"}
              </FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  setValue("");
                  setSubmitted(null);
                  firstInput.current?.focus();
                }}
              >
                <RefreshCwIcon />
                {chinese ? "重新输入" : "Enter again"}
              </Button>
            </div>
            <InputOTP
              id={id}
              length={6}
              name="verification-code"
              required
              validationType="numeric"
              value={value}
              onValueChange={(next) => {
                setValue(next);
                setSubmitted(null);
              }}
            >
              <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot ref={firstInput} />
                <InputOTPSlot />
                <InputOTPSlot />
              </InputOTPGroup>
              <InputOTPSeparator className="mx-2" />
              <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot />
                <InputOTPSlot />
                <InputOTPSlot />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription>
              {chinese
                ? "填写全部六位数字后提交。验证码通过原生表单字段提交"
                : "Complete all six digits before submitting. The code is submitted as a native form field."}
            </FieldDescription>
          </Field>
        </CardContent>
        <CardFooter>
          <Field>
            <Button type="submit" className="w-full">
              {chinese ? "提交验证码" : "Submit code"}
            </Button>
            <output
              aria-live="polite"
              className="min-h-5 text-center text-muted-foreground text-sm"
            >
              {submitted !== null &&
                `${chinese ? "已提交验证码：" : "Submitted code: "}${submitted}`}
            </output>
          </Field>
        </CardFooter>
      </Card>
    </form>
  );
}

export default InputOTPForm;
