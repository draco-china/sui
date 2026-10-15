"use client";

import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const copy = chinese
    ? {
        trigger: "重命名",
        title: "重命名",
        hint: "键盘弹出时整张面板抬到键盘上方，保存期间不能关闭。",
        label: "文件名",
        cancel: "取消",
        save: "保存",
        saving: "保存中…",
        initial: "季度报告",
      }
    : {
        trigger: "Rename",
        title: "Rename",
        hint: "The whole sheet rises above the keyboard and stays open while saving.",
        label: "File name",
        cancel: "Cancel",
        save: "Save",
        saving: "Saving…",
        initial: "Quarterly report",
      };
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(copy.initial);
  const [saving, setSaving] = useState(false);
  return (
    <BottomSheet
      open={open}
      // Closing waits until the name is saved.
      onOpenChange={(next) => {
        if (!saving) setOpen(next);
      }}
      detents={false}
      keyboard="lift"
    >
      <BottomSheetTrigger render={<Button variant="outline" />}>
        {copy.trigger}
      </BottomSheetTrigger>
      <BottomSheetContent initialFocus={false}>
        <BottomSheetHeader className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <BottomSheetClose
            disabled={saving}
            render={
              <Button
                variant="ghost"
                size="sm"
                className="justify-self-start"
              />
            }
          >
            {copy.cancel}
          </BottomSheetClose>
          <BottomSheetTitle>{copy.title}</BottomSheetTitle>
          <Button
            size="sm"
            className="justify-self-end"
            disabled={!name.trim() || saving}
            onClick={() => {
              setSaving(true);
              window.setTimeout(() => {
                setSaving(false);
                setOpen(false);
              }, 1200);
            }}
          >
            {saving ? copy.saving : copy.save}
          </Button>
        </BottomSheetHeader>
        <BottomSheetBody className="pb-6">
          <Input
            aria-label={copy.label}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="text-muted-foreground">{copy.hint}</p>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
