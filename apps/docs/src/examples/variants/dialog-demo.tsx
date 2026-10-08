import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Field, FieldGroup } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useId as usePreviewId } from "react";

export function DialogDemo() {
  const previewId = usePreviewId();

  return (
    <Dialog>
      <form>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor={`${previewId}-name-1`}>Name</Label>
              <Input
                id={`${previewId}-name-1`}
                name="name"
                defaultValue="Pedro Duarte"
              />
            </Field>
            <Field>
              <Label htmlFor={`${previewId}-username-1`}>Username</Label>
              <Input
                id={`${previewId}-username-1`}
                name="username"
                defaultValue="@peduarte"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

export default DialogDemo;
