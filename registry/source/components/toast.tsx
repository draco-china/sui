"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { Button } from "@/components/ui/button";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";
import { type GlassProps, withGlass } from "@/lib/glass/with-glass";

const toast = ToastPrimitive.createToastManager();

function ToastProvider(props: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal(props: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** The viewport edge toasts stack from. */
function toastSide(position: ToastPosition) {
  return position.startsWith("top") ? "top" : "bottom";
}

const toastViewportVariants = cva(
  "pointer-events-none fixed inset-x-4 z-50 mx-auto w-auto max-w-sm outline-none",
  {
    variants: {
      position: {
        "top-left": "top-4 sm:inset-e-auto sm:inset-s-4 sm:mx-0 sm:w-full",
        "top-center": "top-4",
        "top-right": "top-4 sm:inset-e-4 sm:inset-s-auto sm:mx-0 sm:w-full",
        "bottom-left":
          "bottom-4 sm:inset-e-auto sm:inset-s-4 sm:mx-0 sm:w-full",
        "bottom-center": "bottom-4",
        "bottom-right":
          "bottom-4 sm:inset-e-4 sm:inset-s-auto sm:mx-0 sm:w-full",
      },
    },
    defaultVariants: { position: "top-center" },
  },
);

function ToastViewport({
  className,
  position = "top-center",
  colorful = true,
  ...props
}: ToastPrimitive.Viewport.Props & {
  position?: ToastPosition;
  /** Tints toasts with their status color. */
  colorful?: boolean;
}) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      data-toast-side={toastSide(position)}
      data-colorful={colorful}
      className={cn(toastViewportVariants({ position }), className)}
      {...props}
    />
  );
}

function ToastImplementation({
  className,
  ...props
}: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        cn(
          "group/toast pointer-events-auto absolute inset-e-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom select-none rounded-2xl border bg-popover text-popover-foreground shadow-lg outline-none will-change-transform focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          // Stacks grow away from the viewport edge: up from the bottom, down from the top.
          "in-data-[toast-side=top]:top-0 in-data-[toast-side=top]:bottom-auto in-data-[toast-side=top]:origin-top [--toast-dir:-1] in-data-[toast-side=top]:[--toast-dir:1]",
          "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-dir)*(var(--toast-offset-y)+var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
          "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+var(--toast-dir)*(var(--toast-index)*var(--peek)+var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
          "after:absolute after:inset-s-0 after:top-full in-data-[toast-side=top]:after:top-auto in-data-[toast-side=top]:after:bottom-full after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
          "data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))] data-expanded:h-(--toast-height)",
          "data-starting-style:transform-[translateY(calc(var(--toast-dir)*-150%))] data-limited:opacity-0",
          "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(calc(var(--toast-dir)*-150%))]",
          "data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]",
          "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
          "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
          "data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]",
          "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
          "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
          "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
          "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        ),
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("font-medium text-sm", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-sm" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close toast"
      render={render}
      className={cn(
        "relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null;

  if (type === "success") {
    icon = <CircleCheckIcon aria-hidden="true" />;
  }

  if (type === "info") {
    icon = <InfoIcon aria-hidden="true" />;
  }

  if (type === "warning") {
    icon = <TriangleAlertIcon aria-hidden="true" />;
  }

  if (type === "error") {
    icon = <OctagonXIcon aria-hidden="true" />;
  }

  if (type === "loading") {
    icon = <Loader2Icon className="animate-spin" aria-hidden="true" />;
  }

  if (!icon) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none"
    >
      {icon}
    </span>
  );
}

function ToastList({
  side = "top",
  glass,
  frosted,
}: { side?: "top" | "bottom" } & GlassProps) {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => (
    <Toast
      key={toastItem.id}
      toast={toastItem}
      glass={glass}
      frosted={frosted}
      data-type={toastItem.type}
      // Dismiss toward the nearest edge or sideways.
      swipeDirection={side === "top" ? ["up", "right"] : ["down", "right"]}
    >
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

function Toaster({
  children,
  toastManager = toast,
  position = "top-center",
  colorful = true,
  glass,
  frosted,
  ...props
}: ToastPrimitive.Provider.Props &
  GlassProps & {
    /** Where toasts appear; top center by default. */
    position?: ToastPosition;
    /** Tints success, info, warning and error toasts with their status color. */
    colorful?: boolean;
  }) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport position={position} colorful={colorful}>
          <ToastList
            side={toastSide(position)}
            glass={glass}
            frosted={frosted}
          />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

// Toasts float above content like other popups.
const Toast = withGlass(ToastImplementation);

export type { ToastPosition };
export {
  createToastManager,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  Toaster,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toast,
  toastViewportVariants,
  useToastManager,
};
