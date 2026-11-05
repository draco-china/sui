"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "cn";
import type { ReactElement, ReactNode } from "react";
import { DataFormFill, usePluginState } from "@/components/ui/data-form/context";
import type { DataFormInstance, DataFormPlugin } from "@/components/ui/data-form/types";

export interface OverlayFormOptions {
  readonly title: ReactNode;
  /** Every overlay has one; it tells screen readers what the form is for. */
  readonly description?: ReactNode;
  /** A button that opens the overlay, such as `<Button>New project</Button>`. */
  readonly trigger?: ReactElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Resets the form after it closes; defaults to true. */
  readonly resetOnClose?: boolean;
  readonly className?: string;
}

export interface SheetFormOptions extends OverlayFormOptions {
  readonly side?: "top" | "right" | "bottom" | "left";
}

const OPEN = "overlay.open";
const CONFIRMING = "overlay.confirming";

function setOverlayOpen(
  form: DataFormInstance,
  options: OverlayFormOptions,
  open: boolean,
) {
  form.pluginStore.set(OPEN, open);
  options.onOpenChange?.(open);
  if (!open && options.resetOnClose !== false) form.reset();
}

/**
 * Closing from the backdrop, Escape, a swipe or Cancel asks first when there
 * are unsaved changes; it never discards them silently.
 */
function requestClose(form: DataFormInstance, options: OverlayFormOptions) {
  if (form.api.state.isDirty) form.pluginStore.set(CONFIRMING, true);
  else setOverlayOpen(form, options, false);
}

// The form fills the overlay; under `DataFormFill` its fields scroll and its
// footer stays in view.
const formLayout = "flex min-h-0 flex-1 flex-col";

function useOverlayState(form: DataFormInstance, options: OverlayFormOptions) {
  const [stored] = usePluginState(form, OPEN, options.defaultOpen ?? false);
  const [confirming, setConfirming] = usePluginState(form, CONFIRMING, false);
  return {
    open: options.open ?? stored,
    requestOpen: (next: boolean) =>
      next ? setOverlayOpen(form, options, true) : requestClose(form, options),
    setOpen: (next: boolean) => setOverlayOpen(form, options, next),
    confirming,
    setConfirming,
  };
}

function DiscardConfirm({
  form,
  open,
  onOpenChange,
  onDiscard,
}: {
  form: DataFormInstance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  const { labels } = form;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.discardTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {labels.discardDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{labels.keepEditing}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            {labels.discard}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OverlayFrame({
  kind,
  form,
  options,
  children,
}: {
  kind: "dialog" | "sheet";
  form: DataFormInstance;
  options: SheetFormOptions;
  children: ReactNode;
}) {
  const mobile = useIsMobile();
  const state = useOverlayState(form, options);
  const confirm = (
    <DiscardConfirm
      form={form}
      open={state.confirming}
      onOpenChange={state.setConfirming}
      onDiscard={() => {
        state.setConfirming(false);
        state.setOpen(false);
      }}
    />
  );
  const description = options.description ?? options.title;
  const body = <DataFormFill>{children}</DataFormFill>;

  // On phones a short form opens from the bottom, within thumb reach.
  if (kind === "dialog" && mobile)
    return (
      <>
        <Drawer open={state.open} onOpenChange={state.requestOpen}>
          {options.trigger ? <DrawerTrigger render={options.trigger} /> : null}
          <DrawerContent className={cn(formLayout, options.className)}>
            <DrawerHeader className="px-6 pb-4">
              <DrawerTitle>{options.title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            {body}
          </DrawerContent>
        </Drawer>
        {confirm}
      </>
    );

  if (kind === "sheet")
    return (
      <>
        <Sheet open={state.open} onOpenChange={state.requestOpen}>
          {options.trigger ? <SheetTrigger render={options.trigger} /> : null}
          <SheetContent
            side={options.side}
            closeLabel={form.labels.cancel}
            className={cn(formLayout, options.className)}
          >
            <SheetHeader className="pb-4">
              <SheetTitle>{options.title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
        {confirm}
      </>
    );

  return (
    <>
      <Dialog open={state.open} onOpenChange={state.requestOpen}>
        {options.trigger ? <DialogTrigger render={options.trigger} /> : null}
        <DialogContent
          closeLabel={form.labels.cancel}
          className={cn(
            "flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col gap-0 p-0",
            formLayout,
            options.className,
          )}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{options.title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
      {confirm}
    </>
  );
}

function overlay(
  kind: "dialog" | "sheet",
  options: SheetFormOptions,
): DataFormPlugin {
  return {
    name: kind,
    wrapForm: (children, form) => (
      <OverlayFrame kind={kind} form={form} options={options}>
        {children}
      </OverlayFrame>
    ),
    // Cancel asks first, as the backdrop and Escape do.
    onCancel: (form) => requestClose(form, options),
    onFinished: (form) => setOverlayOpen(form, options, false),
  };
}

/** Puts the form in a Dialog, or a bottom Drawer on phones. */
export function dialog(options: OverlayFormOptions): DataFormPlugin {
  return overlay("dialog", options);
}

/** Puts the form in a Sheet, to edit a record beside the list. */
export function sheet(options: SheetFormOptions): DataFormPlugin {
  return overlay("sheet", options);
}
