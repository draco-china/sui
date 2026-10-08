import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

export default function SheetNoCloseButton() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open Sheet
      </SheetTrigger>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>No Close Button</SheetTitle>
          <SheetDescription>
            This sheet doesn&apos;t have a close button in the top-right corner.
            Click outside to close.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
