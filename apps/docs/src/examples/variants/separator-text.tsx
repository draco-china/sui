import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import type { ExampleProps } from "../types";

export function SeparatorText({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <div className="grid w-full max-w-sm gap-4">
      <Button variant="outline" className="w-full">
        {chinese ? "使用 GitHub 继续" : "Continue with GitHub"}
      </Button>
      <Separator>{chinese ? "或使用邮箱" : "Or continue with email"}</Separator>
      <div className="flex h-24 items-center justify-center gap-4 text-sm">
        <span>{chinese ? "今天" : "Today"}</span>
        <Separator orientation="vertical">{chinese ? "或者" : "or"}</Separator>
        <span>{chinese ? "明天" : "Tomorrow"}</span>
      </div>
    </div>
  );
}

export default SeparatorText;
