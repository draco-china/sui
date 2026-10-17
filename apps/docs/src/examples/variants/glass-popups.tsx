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
          ? "清透工具栏；每个弹出层自己选择材质，磨砂更易读"
          : "A Clear toolbar; each popup picks its own material, and frosted reads best"}
      </p>
      <GlassSurface className="flex flex-wrap items-center gap-1 rounded-full p-1.5">
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" />}>
            {zh ? "弹出框" : "Popover"}
          </PopoverTrigger>
          <PopoverContent frosted className="w-64 text-sm">
            {zh
              ? "磨砂玻璃让浮层在任何背景上都清晰可读。"
              : "Frosted glass keeps a floating layer legible over any backdrop."}
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" />}>
            {zh ? "菜单" : "Menu"}
          </DropdownMenuTrigger>
          <DropdownMenuContent frosted className="w-44">
            <DropdownMenuItem>{zh ? "重命名" : "Rename"}</DropdownMenuItem>
            <DropdownMenuItem>{zh ? "复制" : "Duplicate"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{zh ? "归档" : "Archive"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" />}>
            {zh ? "清透" : "Clear"}
          </PopoverTrigger>
          <PopoverContent glass={{ edge: "vertical" }} className="w-64 text-sm">
            {zh
              ? "写 glass 的浮层是清透玻璃，这里用上下边缘光。"
              : "A popup with glass is Clear, here lit from the top and bottom."}
          </PopoverContent>
        </Popover>
      </GlassSurface>
    </div>
  );
}
