"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { useState } from "react";
import { DesignComparison } from "../design-guidelines-comparison";
import type { ExampleProps } from "../types";

function RecommendedSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        {zh ? "打开弹窗" : "Open dialog"}
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-semibold">
            {zh ? "编辑项目" : "Edit project"}
          </DialogTitle>
          <DialogDescription>
            {zh ? "更新此项目的设置" : "Update this project’s settings."}
          </DialogDescription>
        </DialogHeader>
        <DialogClose render={<Button variant="outline" />}>
          {zh ? "关闭" : "Close"}
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

function AvoidSample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {zh ? "打开弹窗" : "Open dialog"}
      </Button>
      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="font-semibold">
                {zh ? "编辑项目" : "Edit project"}
              </DialogTitle>
              <DialogDescription>
                {zh ? "更新此项目的设置" : "Update this project’s settings."}
              </DialogDescription>
            </DialogHeader>
            <DialogClose render={<Button variant="outline" />}>
              {zh ? "关闭" : "Close"}
            </DialogClose>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default function Example({ locale }: ExampleProps) {
  return (
    <DesignComparison
      locale={locale}
      recommended={<RecommendedSample locale={locale} />}
      avoid={<AvoidSample locale={locale} />}
    />
  );
}
