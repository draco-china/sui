"use client";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { GlassSurface } from "@workspace/ui/components/glass";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full justify-items-center gap-3 overflow-hidden rounded-2xl bg-[url(/playground/backgrounds/coast-poster.jpg)] bg-center bg-cover px-6 py-10">
      <p className="font-medium text-sm text-white drop-shadow">
        {zh
          ? "工具栏使用清透材质，弹出层默认常规材质与上下边缘光"
          : "A Clear toolbar; its popups default to Regular with vertical light"}
      </p>
      <GlassSurface
        glassConfig={{ material: "clear" }}
        className="flex flex-wrap items-center gap-1 rounded-full p-1.5"
      >
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" />}>
            {zh ? "弹出框" : "Popover"}
          </PopoverTrigger>
          <PopoverContent className="w-64 text-sm">
            {zh
              ? "常规材质让浮层在任何背景上都清晰可读。"
              : "Regular keeps a floating layer legible over any backdrop."}
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" />}>
            {zh ? "菜单" : "Menu"}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44">
            <DropdownMenuItem>{zh ? "重命名" : "Rename"}</DropdownMenuItem>
            <DropdownMenuItem>{zh ? "复制" : "Duplicate"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{zh ? "归档" : "Archive"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" />}>
            {zh ? "自定义" : "Custom"}
          </PopoverTrigger>
          <PopoverContent
            glassConfig={{ material: "clear", edge: "diagonal" }}
            className="w-64 text-sm"
          >
            {zh
              ? "自身的 glassConfig 可改回清透材质与对角光。"
              : "Its own glassConfig switches back to Clear with diagonal light."}
          </PopoverContent>
        </Popover>
      </GlassSurface>
    </div>
  );
}
