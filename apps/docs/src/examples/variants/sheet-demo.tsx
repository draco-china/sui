import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { useId as usePreviewId } from "react";

export default function SheetDemo() {
  const previewId = usePreviewId();

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Label htmlFor={`${previewId}-sheet-demo-name`}>Name</Label>
            <Input
              id={`${previewId}-sheet-demo-name`}
              defaultValue="Pedro Duarte"
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor={`${previewId}-sheet-demo-username`}>Username</Label>
            <Input
              id={`${previewId}-sheet-demo-username`}
              defaultValue="@peduarte"
            />
          </div>
        </div>
        <SheetFooter>
          <Button type="submit">Save changes</Button>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
