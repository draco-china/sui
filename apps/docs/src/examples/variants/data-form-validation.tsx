"use client";

import {
  DataForm,
  dataFormLabelsZhCN,
} from "@workspace/ui/components/data-form";
import { useMemo } from "react";
import { z } from "zod";
import type { ExampleProps } from "../types";
import { text, useSubmitted, wait } from "./data-form-support";

export default function DataFormValidation({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const t = text(zh);
  const [submitted, setSubmitted] = useSubmitted(zh);
  const schema = useMemo(() => {
    const copy = text(zh);
    return z.object({
      username: z
        .string(copy("Choose a username.", "请填写用户名。"))
        .min(3, copy("Use at least 3 characters.", "至少 3 个字符。")),
      password: z
        .string(copy("Choose a password.", "请设置密码。"))
        .min(8, copy("Use at least 8 characters.", "至少 8 个字符。")),
    });
  }, [zh]);
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <DataForm
        validator={schema}
        labels={zh ? dataFormLabelsZhCN : undefined}
        fields={[
          {
            name: "username",
            label: t("Username", "用户名"),
            description: t("“taken” is already in use.", "“taken” 已被占用。"),
            required: true,
          },
          {
            name: "password",
            label: t("Password", "密码"),
            valueType: "password",
            required: true,
          },
        ]}
        onFinish={async (values) => {
          await wait();
          // The server's answer lands under the field it names.
          if (values.username === "taken")
            return {
              fields: {
                username: t(
                  "This username is taken. Try another.",
                  "这个用户名已被占用，请换一个。",
                ),
              },
            };
          setSubmitted({ ...values, password: "••••••••" });
        }}
      />
      {submitted}
    </div>
  );
}
