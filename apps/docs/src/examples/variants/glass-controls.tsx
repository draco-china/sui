"use client";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { type ReactNode, useId } from "react";
import type { ExampleProps } from "../types";

function Column({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <p className="font-medium text-white text-xs drop-shadow">{label}</p>
      {children}
    </div>
  );
}

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const id = useId();
  return (
    <div className="grid w-full gap-6 overflow-hidden rounded-2xl bg-[url(/playground/backgrounds/coast-poster.jpg)] bg-center bg-cover p-6 sm:grid-cols-2">
      <Column label={zh ? "各自独立的玻璃按钮" : "Separate glass buttons"}>
        <div className="flex gap-2">
          <Button glass variant="outline">
            {zh ? "归档" : "Archive"}
          </Button>
          <Button glass variant="outline">
            {zh ? "举报" : "Report"}
          </Button>
        </div>
      </Column>
      <Column label={zh ? "ButtonGroup：一个胶囊" : "ButtonGroup: one capsule"}>
        <ButtonGroup glass>
          <Button variant="outline">{zh ? "归档" : "Archive"}</Button>
          <Button variant="outline">{zh ? "举报" : "Report"}</Button>
        </ButtonGroup>
      </Column>
      <Column
        label={
          zh ? "独立的字段：玻璃胶囊" : "A field on its own: a glass capsule"
        }
      >
        <Input glass placeholder={zh ? "搜索" : "Search"} />
      </Column>
      <Column
        label={
          zh
            ? "玻璃面板内的字段：普通字段"
            : "A field inside a glass panel: ordinary"
        }
      >
        <GlassSurface className="grid gap-2 rounded-3xl p-4">
          <Label htmlFor={id}>{zh ? "名称" : "Name"}</Label>
          <Input id={id} defaultValue={zh ? "海岸计划" : "Coastline"} />
        </GlassSurface>
      </Column>
      <Column label={zh ? "Card：普通内容" : "Card: ordinary content"}>
        <Card size="sm">
          <CardHeader>
            <CardTitle>24°</CardTitle>
            <CardDescription>
              {zh ? "上海，多云" : "Shanghai, cloudy"}
            </CardDescription>
          </CardHeader>
        </Card>
      </Column>
      <Column label={zh ? "Card glass：显式开启" : "Card glass: opted in"}>
        <Card size="sm" glass>
          <CardHeader>
            <CardTitle>24°</CardTitle>
            <CardDescription>
              {zh ? "上海，多云" : "Shanghai, cloudy"}
            </CardDescription>
          </CardHeader>
        </Card>
      </Column>
    </div>
  );
}
