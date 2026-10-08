import { ProfileForm } from "@workspace/ui/blocks/tanstack-form";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import type { ExampleProps } from "../types";
import { chineseProfileFormLabels } from "./block-form-labels";

export default function ProfileFormDemo({ locale }: ExampleProps) {
  const [fail, setFail] = useState(false);
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        disableError: "关闭失败模拟",
        simulateError: "模拟提交失败",
      }
    : {
        disableError: "Disable error simulation",
        simulateError: "Simulate submission failure",
      };
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <ProfileForm
        labels={locale === "zh-CN" ? chineseProfileFormLabels : undefined}
        initialValues={{
          name: "Alex Chen",
          email: "alex@example.com",
          role: "developer",
        }}
        onSubmit={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          if (fail)
            throw new Error(
              zh ? "保存失败，请重试。" : "Could not save. Please try again.",
            );
        }}
      />
      <Button
        variant="outline"
        aria-pressed={fail}
        onClick={() => setFail((value) => !value)}
      >
        {fail ? stateLabels.disableError : stateLabels.simulateError}
      </Button>
    </div>
  );
}
