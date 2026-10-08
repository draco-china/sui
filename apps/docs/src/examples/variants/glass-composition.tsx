"use client";
import { Button } from "@workspace/ui/components/button";
import { CodeViewer } from "@workspace/ui/components/code-viewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Editor } from "@workspace/ui/components/editor";
import { GlassProvider } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useId, useRef, useState } from "react";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const scene = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState('const theme = "bamboo";');
  return (
    <GlassProvider mode="css" captureTarget={scene}>
      <div
        ref={scene}
        className="relative isolate grid w-full gap-4 overflow-hidden rounded-2xl bg-muted p-5"
      >
        <div
          className="absolute inset-0 -z-10 grid grid-cols-3 gap-3 p-3"
          aria-hidden="true"
        >
          <div className="rounded-2xl bg-emerald-400/70" />
          <div className="rounded-2xl bg-blue-400/70" />
          <div className="rounded-2xl bg-rose-400/70" />
        </div>
        <div className="grid gap-4 rounded-2xl border bg-background p-5">
          <div className="grid gap-2">
            <Label htmlFor={id}>
              {chinese
                ? "原生输入仍可交互"
                : "The native input stays interactive"}
            </Label>
            <Input
              id={id}
              glass
              placeholder={chinese ? "输入一些文字" : "Type something"}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger render={<Button variant="outline" glass />}>
                {chinese ? "玻璃浮层" : "Glass popover"}
              </PopoverTrigger>
              <PopoverContent glass>
                <p className="text-sm">
                  {chinese
                    ? "浮层保留 SVG 高光与 CSS 磨砂，内容维持清晰"
                    : "The popover keeps SVG highlights and CSS frosting while its content stays clear."}
                </p>
              </PopoverContent>
            </Popover>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" glass />}>
                {chinese ? "打开对话框" : "Open dialog"}
              </DialogTrigger>
              <DialogContent glass>
                <DialogHeader>
                  <DialogTitle>
                    {chinese ? "玻璃对话框" : "Glass dialog"}
                  </DialogTitle>
                  <DialogDescription>
                    {chinese
                      ? "保留焦点管理、键盘和关闭行为"
                      : "Focus management, keyboard access, and dismissal are preserved."}
                  </DialogDescription>
                </DialogHeader>
                <Input
                  aria-label={chinese ? "对话框输入" : "Dialog input"}
                  placeholder={chinese ? "仍可输入" : "Still editable"}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Editor
          value={code}
          onChange={setCode}
          language="typescript"
          height={180}
          glass
          labels={
            chinese
              ? {
                  copied: "已复制",
                  copyFailed: "复制失败",
                  loading: "正在加载编辑器",
                  loadingPreview: "正在加载预览",
                  error: "无法加载编辑器",
                  preview: "预览",
                  hidePreview: "隐藏预览",
                  split: "并排",
                  copy: "复制",
                  fullscreen: "全屏",
                  exitFullscreen: "退出全屏",
                }
              : undefined
          }
          toolbarCopy={false}
          toolbarMode={false}
          fullscreen={false}
        />
        <CodeViewer
          code={code}
          lang="typescript"
          glass
          title={chinese ? "当前代码" : "Current code"}
          maxHeight={160}
          labels={
            chinese
              ? {
                  copy: "复制代码",
                  copied: "已复制",
                  copyFailed: "复制失败",
                  loading: "正在高亮",
                  error: "无法高亮代码",
                  empty: "没有代码",
                  expand: "展开",
                  collapse: "折叠",
                  writing: "正在编写",
                  ready: "就绪",
                }
              : undefined
          }
        />
      </div>
    </GlassProvider>
  );
}
