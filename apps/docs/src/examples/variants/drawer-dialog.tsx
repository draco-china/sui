"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "cn";
import * as React from "react";
import { useId as usePreviewId } from "react";
import { useMediaQuery } from "./support";

export function DrawerDialogDemo() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" />}>
          Edit Profile
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button variant="outline" />}>
        Edit Profile
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit profile</DrawerTitle>
          <DrawerDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </DrawerDescription>
        </DrawerHeader>
        <ProfileForm className="p-4" />
      </DrawerContent>
    </Drawer>
  );
}

function ProfileForm({ className }: React.ComponentProps<"form">) {
  const previewId = usePreviewId();

  return (
    <form className={cn("grid items-start gap-6", className)}>
      <div className="grid gap-3">
        <Label htmlFor={`${previewId}-email`}>Email</Label>
        <Input
          type="email"
          id={`${previewId}-email`}
          defaultValue="shadcn@example.com"
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor={`${previewId}-username`}>Username</Label>
        <Input id={`${previewId}-username`} defaultValue="@shadcn" />
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}

export default DrawerDialogDemo;
