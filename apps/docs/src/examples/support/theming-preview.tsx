import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

export function ThemePreview({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        saved: "设置已保存",
        idle: "本示例仅在当前预览中操作",
      }
    : {
        saved: "Changes saved.",
        idle: "Changes stay within this preview.",
      };
  const id = useId();
  const [saved, setSaved] = useState(false);
  return (
    <Card className="w-full shadow-none ring-1 ring-border">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-semibold text-sm">
            {zh ? "工作区设置" : "Workspace settings"}
          </CardTitle>
          <Badge variant="secondary">{zh ? "团队" : "Team"}</Badge>
        </div>
        <CardDescription>
          {zh
            ? "颜色表达操作和信息的含义"
            : "Color communicates actions and information."}
        </CardDescription>
        <a
          href="#semantic-usage"
          className="w-fit text-accent-foreground text-xs underline underline-offset-4"
        >
          {zh ? "了解语义颜色" : "Explore semantic colors"}
        </a>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>{zh ? "名称" : "Name"}</Label>
          <Input id={`${id}-name`} defaultValue="Studio" />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted p-3">
          <Label htmlFor={`${id}-updates`}>
            {zh ? "每周摘要" : "Weekly summary"}
          </Label>
          <Switch id={`${id}-updates`} defaultChecked />
        </div>
        <div
          role="img"
          aria-label={zh ? "图表配色" : "Chart palette"}
          className="flex gap-1.5"
        >
          {[1, 2, 3, 4, 5].map((index) => (
            <span
              key={index}
              className="h-3 flex-1 rounded-full"
              style={{ background: `var(--chart-${index})` }}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-2 border-border border-t">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setSaved(false)}
        >
          {zh ? "重置" : "Reset"}
        </Button>
        <Button type="button" size="sm" onClick={() => setSaved(true)}>
          {zh ? "保存设置" : "Save changes"}
        </Button>
        <span role="status" className="w-full text-muted-foreground text-sm">
          {saved ? stateLabels.saved : stateLabels.idle}
        </span>
      </CardFooter>
    </Card>
  );
}
